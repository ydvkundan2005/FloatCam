const { test } = require('node:test');
const assert = require('node:assert/strict');
const net = require('net');
const { findFreePort, PORT_RANGE_START, PORT_RANGE_END } = require('../lib/port-manager');

test('findFreePort returns an integer within expected range', async () => {
  const port = await findFreePort();
  assert.equal(typeof port, 'number');
  assert.ok(port >= PORT_RANGE_START, `Port ${port} should be >= ${PORT_RANGE_START}`);
  assert.ok(port <= PORT_RANGE_END, `Port ${port} should be <= ${PORT_RANGE_END}`);
});

test('findFreePort avoids an occupied port and returns the next free one', async () => {
  // Occupy PORT_RANGE_START (9211)
  const server = net.createServer();
  await new Promise((resolve) => server.listen(PORT_RANGE_START, '0.0.0.0', resolve));

  try {
    const nextPort = await findFreePort();
    assert.ok(nextPort > PORT_RANGE_START, `Expected port > ${PORT_RANGE_START}, got ${nextPort}`);
    assert.ok(nextPort <= PORT_RANGE_END);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
