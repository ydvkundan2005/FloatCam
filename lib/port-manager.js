/**
 * port-manager.js — FloatCam V3
 *
 * Finds a free TCP port in a deterministic range so multiple FloatCam
 * instances on the same machine don't collide.
 *
 * Strategy:
 *   - Preferred port: 9211 (FloatCam default)
 *   - Fallback range: 9211–9299 (89 fallback slots)
 *   - Each instance writes its port to a per-user lock file
 *     so the QR code / phone URL always reflects the actual port.
 */

const net = require('net');

const PORT_RANGE_START = 9211;
const PORT_RANGE_END   = 9299;

/**
 * Returns true when nothing is already bound to `port` on any interface.
 * @param {number} port
 * @returns {Promise<boolean>}
 */
function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref(); // Don't keep Node alive just for this probe
    server.on('error', () => resolve(false));
    server.listen(port, '0.0.0.0', () => {
      server.close(() => resolve(true));
    });
  });
}

/**
 * Scans PORT_RANGE_START..PORT_RANGE_END and returns the first free port.
 * Throws if none are available (extremely unlikely in normal use).
 * @returns {Promise<number>}
 */
async function findFreePort() {
  for (let p = PORT_RANGE_START; p <= PORT_RANGE_END; p++) {
    if (await isPortFree(p)) return p;
  }
  throw new Error(
    `FloatCam: No free port found in range ${PORT_RANGE_START}–${PORT_RANGE_END}. ` +
    'Please close other FloatCam instances or conflicting services.'
  );
}

module.exports = { findFreePort, PORT_RANGE_START, PORT_RANGE_END };
