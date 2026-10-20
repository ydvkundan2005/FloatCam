/**
 * signaling-server.js — FloatCam V3
 *
 * Handles:
 *  - HTTPS static file serving for the phone web UI (/phone directory)
 *  - /ca.crt endpoint to let phone install the local Root CA
 *  - WebSocket signaling between the phone and the desktop receiver
 *  - V3 session token validation — rejects connections with wrong/missing token
 *  - WebSocket heartbeat (keep-alive ping every 15 s)
 */

'use strict';

const https        = require('https');
const fs           = require('fs');
const path         = require('path');
const crypto       = require('crypto');
const EventEmitter = require('events');
const { WebSocketServer, WebSocket } = require('ws');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.pem':  'application/x-x509-ca-cert',
  '.crt':  'application/x-x509-ca-cert'
};

const HEARTBEAT_INTERVAL_MS = 15000;

class SignalingServer extends EventEmitter {
  /**
   * @param {object} opts
   * @param {string}  opts.certPath    - Path to TLS server certificate PEM
   * @param {string}  opts.keyPath     - Path to TLS private key PEM
   * @param {string}  opts.caPath      - Path to local Root CA PEM (served as /ca.crt)
   * @param {string}  opts.staticRoot  - Directory containing phone web UI files
   * @param {number}  opts.port        - Port to listen on (dynamic, chosen by port-manager)
   * @param {string}  [opts.sessionToken] - 8-hex session token; connections without it are rejected
   */
  constructor({ certPath, keyPath, caPath, staticRoot, port, sessionToken }) {
    super();
    this.certPath     = certPath;
    this.keyPath      = keyPath;
    this.caPath       = caPath;
    this.staticRoot   = staticRoot;
    this.port         = port;
    this.sessionToken = sessionToken || null;   // V3 session isolation

    this.httpsServer      = null;
    this.wss              = null;
    this.heartbeatTimer   = null;

    this.phoneSocket    = null;
    this.macSocket      = null;
    this.connectedDevices = [];

    this.certPem = null;

    // Track open TCP sockets so stop() can forcibly destroy them
    this._openSockets = new Set();
  }

  // ---- Lifecycle ----

  start() {
    return new Promise((resolve, reject) => {
      let key, cert;
      try {
        key  = fs.readFileSync(this.keyPath);
        cert = fs.readFileSync(this.certPath);
        this.certPem = cert.toString('utf8');
      } catch (err) {
        return reject(Object.assign(new Error('MISSING_CERTS'), { code: 'MISSING_CERTS' }));
      }

      this.httpsServer = https.createServer({ key, cert }, (req, res) =>
        this._handleStatic(req, res)
      );

      // Track every TCP connection so stop() can forcibly destroy them
      this.httpsServer.on('connection', (socket) => {
        this._openSockets.add(socket);
        socket.once('close', () => this._openSockets.delete(socket));
      });

      this.httpsServer.on('error', (err) => {
        this.emit('server-error', err);
        reject(err);
      });

      this.wss = new WebSocketServer({ server: this.httpsServer, path: '/signal' });
      this.wss.on('connection', (ws, req) => this._handleConnection(ws, req));

      this._startHeartbeat();

      this.httpsServer.listen(this.port, '0.0.0.0', () => {
        const fingerprint = crypto.createHash('sha256').update(cert).digest('hex');
        resolve({ port: this.port, fingerprint });
      });
    });
  }

  stop() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.wss) {
      for (const client of this.wss.clients) {
        try { client.terminate(); } catch { /* ignore */ }
      }
      this.wss.close();
      this.wss = null;
    }
    // Forcibly destroy tracked keep-alive connections so the port is freed immediately
    for (const socket of this._openSockets) {
      try { socket.destroy(); } catch { /* ignore */ }
    }
    this._openSockets.clear();
    if (this.httpsServer) {
      this.httpsServer.close();
      this.httpsServer = null;
    }
    this.phoneSocket      = null;
    this.macSocket        = null;
    this.connectedDevices = [];
    this.emit('phone-status',    false);
    this.emit('devices-changed', []);
  }

  disconnectDevice(sessionId) {
    if (this.phoneSocket && (!sessionId || this.phoneSocket.sessionId === sessionId)) {
      this._sendTo(this.phoneSocket, { type: 'force-disconnect', reason: 'Disconnected from dashboard' });
      try { this.phoneSocket.close(); } catch { /* ignore */ }
      this.phoneSocket      = null;
      this.connectedDevices = [];
      this.emit('phone-status',    false);
      this.emit('devices-changed', []);
      if (this.macSocket) {
        this._sendTo(this.macSocket, { type: 'phone-status', connected: false });
      }
    }
  }

  switchPhoneCamera() {
    if (this.phoneSocket && this.phoneSocket.readyState === WebSocket.OPEN) {
      this._sendTo(this.phoneSocket, { type: 'camera-switch' });
      return true;
    }
    return false;
  }

  // ---- Static file serving ----

  _handleStatic(req, res) {
    try {
      let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);

      // Serve local Root CA so phone can install it and avoid browser warnings
      if (urlPath === '/ca.pem' || urlPath === '/ca.crt' || urlPath === '/download-ca') {
        if (this.caPath && fs.existsSync(this.caPath)) {
          const caData = fs.readFileSync(this.caPath);
          res.writeHead(200, {
            'Content-Type':        'application/x-x509-ca-cert',
            'Content-Disposition': 'attachment; filename="FloatCam-Local-CA.crt"',
            'Cache-Control':       'no-store'
          });
          return res.end(caData);
        }
      }

      if (urlPath === '/') urlPath = '/phone.html';

      // Prevent directory traversal
      const safeSuffix = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
      const filePath   = path.join(this.staticRoot, safeSuffix);
      if (!filePath.startsWith(this.staticRoot)) {
        res.writeHead(403); res.end('Forbidden'); return;
      }

      fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not found'); return; }
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, {
          'Content-Type':  MIME_TYPES[ext] || 'application/octet-stream',
          'Cache-Control': 'no-store'
        });
        res.end(data);
      });
    } catch (err) {
      res.writeHead(500); res.end('Server error');
    }
  }

  // ---- WebSocket heartbeat ----

  _startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      if (!this.wss) return;
      for (const ws of this.wss.clients) {
        if (ws.isAlive === false) { ws.terminate(); continue; }
        ws.isAlive = false;
        try { ws.ping(); } catch { /* ignore */ }
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  // ---- WebSocket connection handling ----

  _handleConnection(ws, req) {
    ws.isAlive      = true;
    ws.role         = null;
    ws.sessionId    = crypto.randomBytes(4).toString('hex');
    ws.userAgent    = req && req.headers ? (req.headers['user-agent'] || 'Unknown') : 'Unknown';
    ws.remoteAddress= req && req.socket  ? req.socket.remoteAddress : '';

    ws.on('pong',    ()    => { ws.isAlive = true; });
    ws.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(raw.toString()); } catch { return; }
      this._handleMessage(ws, msg);
    });
    ws.on('close', () => this._handleClose(ws));
    ws.on('error', () => {});
  }

  _handleMessage(ws, msg) {
    if (!msg || typeof msg.type !== 'string') return;

    switch (msg.type) {
      case 'hello':
        this._handleHello(ws, msg);
        break;
      case 'offer':
        if (ws === this.phoneSocket) this._sendTo(this.macSocket, msg);
        break;
      case 'answer':
        if (ws === this.macSocket) this._sendTo(this.phoneSocket, msg);
        break;
      case 'candidate':
        if      (ws === this.phoneSocket) this._sendTo(this.macSocket, msg);
        else if (ws === this.macSocket)   this._sendTo(this.phoneSocket, msg);
        break;
      case 'camera-switch':
        if (ws === this.macSocket && this.phoneSocket) this._sendTo(this.phoneSocket, msg);
        break;
      default:
        break;
    }
  }

  _handleHello(ws, msg) {
    const role = msg.role;

    // ---- V3: Session Token Validation ----
    // Phone connections MUST carry the correct token.
    // Mac (renderer) connections are exempt because they originate from localhost
    // and are not user-generated QR scans.
    if (role === 'phone' && this.sessionToken) {
      const provided = (msg.token || '').trim();
      if (provided !== this.sessionToken) {
        console.warn(`[signaling] Phone connection rejected: wrong session token (got "${provided}")`);
        this._sendTo(ws, { type: 'rejected', reason: 'invalid-session' });
        ws.terminate();
        return;
      }
    }

    if (role === 'phone') {
      // Replace existing phone connection (phone closed app, re-opened)
      if (this.phoneSocket && this.phoneSocket !== ws && this.phoneSocket.readyState === WebSocket.OPEN) {
        this._sendTo(this.phoneSocket, { type: 'replaced' });
        this.phoneSocket.terminate();
      }
      ws.role       = 'phone';
      this.phoneSocket = ws;

      const deviceLabel = msg.device
        || (ws.userAgent.includes('iPhone')  ? 'iPhone'
          : ws.userAgent.includes('Android') ? 'Android Phone'
          : 'Mobile Phone');

      this.connectedDevices = [{
        id:          ws.sessionId,
        name:        deviceLabel,
        ip:          ws.remoteAddress,
        connectedAt: Date.now()
      }];

      this.emit('phone-status',    true);
      this.emit('devices-changed', this.connectedDevices);

      if (this.macSocket && this.macSocket.readyState === WebSocket.OPEN) {
        this._sendTo(this.macSocket,   { type: 'phone-status', connected: true, device: deviceLabel });
        this._sendTo(this.phoneSocket, { type: 'peer-ready' });
      }

    } else if (role === 'mac') {
      if (this.macSocket && this.macSocket !== ws && this.macSocket.readyState === WebSocket.OPEN) {
        this.macSocket.terminate();
      }
      ws.role      = 'mac';
      this.macSocket = ws;
      this.emit('mac-status', true);

      if (this.phoneSocket && this.phoneSocket.readyState === WebSocket.OPEN) {
        this._sendTo(this.macSocket,   { type: 'phone-status', connected: true });
        this._sendTo(this.phoneSocket, { type: 'peer-ready' });
      } else {
        this._sendTo(this.macSocket, { type: 'phone-status', connected: false });
      }
    }
  }

  _handleClose(ws) {
    if (!ws) return;
    if (ws === this.phoneSocket) {
      this.phoneSocket      = null;
      this.connectedDevices = [];
      this.emit('phone-status',    false);
      this.emit('devices-changed', []);
      if (this.macSocket && this.macSocket.readyState === WebSocket.OPEN) {
        this._sendTo(this.macSocket, { type: 'phone-status', connected: false });
      }
    } else if (ws === this.macSocket) {
      this.macSocket = null;
      this.emit('mac-status', false);
      if (this.phoneSocket && this.phoneSocket.readyState === WebSocket.OPEN) {
        this._sendTo(this.phoneSocket, { type: 'peer-left' });
      }
    }
  }

  _sendTo(ws, msg) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      try { ws.send(JSON.stringify(msg)); } catch { /* ignore */ }
    }
  }
}

module.exports = { SignalingServer };
