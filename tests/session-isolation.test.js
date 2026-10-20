const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const { WebSocket } = require('ws');
const { SignalingServer } = require('../lib/signaling-server');
const { ensureCerts } = require('../lib/cert-manager');
const { findFreePort } = require('../lib/port-manager');

// Ignore self-signed cert in tests
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

test('SignalingServer validates session token and isolates sessions', async () => {
  const tmpDir = path.join(os.tmpdir(), `floatcam-test-${Date.now()}`);
  const certs = ensureCerts(tmpDir, '127.0.0.1');
  const port = await findFreePort();
  const validToken = 'abcd1234';

  const server = new SignalingServer({
    certPath: certs.certPath,
    keyPath: certs.keyPath,
    caPath: certs.caCertPath,
    staticRoot: path.join(__dirname, '../phone'),
    port: port,
    sessionToken: validToken
  });

  await server.start();

  try {
    // 1. Connection with WRONG token should receive 'rejected' and close
    const rejectedWs = new WebSocket(`wss://127.0.0.1:${port}/signal`);
    const rejectedPromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timeout waiting for rejected message')), 3000);
      rejectedWs.on('open', () => {
        rejectedWs.send(JSON.stringify({
          type: 'hello',
          role: 'phone',
          device: 'Attacker Phone',
          token: 'wrong-token'
        }));
      });
      rejectedWs.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'rejected') {
          clearTimeout(timer);
          resolve(msg);
        }
      });
      rejectedWs.on('close', () => {
        clearTimeout(timer);
        resolve({ closed: true });
      });
    });

    const rejectResult = await rejectedPromise;
    assert.ok(rejectResult, 'Connection with wrong token must be rejected');

    // 2. Connection with CORRECT token should succeed and trigger 'phone-status' true
    const acceptedWs = new WebSocket(`wss://127.0.0.1:${port}/signal`);
    let phoneStatusReceived = false;
    server.once('phone-status', (status) => {
      phoneStatusReceived = status;
    });

    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timeout waiting for accepted connection')), 3000);
      acceptedWs.on('open', () => {
        acceptedWs.send(JSON.stringify({
          type: 'hello',
          role: 'phone',
          device: 'User Phone',
          token: validToken
        }));
        setTimeout(() => {
          clearTimeout(timer);
          resolve();
        }, 300);
      });
    });

    assert.equal(phoneStatusReceived, true, 'Valid session token must be accepted');

    // 3. Test switchPhoneCamera relay
    let cameraSwitchReceived = false;
    acceptedWs.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'camera-switch') cameraSwitchReceived = true;
      } catch (_) {}
    });

    const switched = server.switchPhoneCamera();
    assert.equal(switched, true, 'switchPhoneCamera should return true when phone is connected');
    await new Promise((r) => setTimeout(r, 200));
    assert.equal(cameraSwitchReceived, true, 'Phone socket must receive camera-switch message');

    // 4. Test disconnectDevice
    server.disconnectDevice();
    assert.equal(server.connectedDevices.length, 0);

    try { acceptedWs.close(); } catch (_) {}
  } finally {
    server.stop();
  }
});
