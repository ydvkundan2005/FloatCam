const os = require('os');

/**
 * Returns every non-internal IPv4 address on the machine, tagged with interface name
 * and friendly label.
 */
function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const candidates = [];
  for (const name of Object.keys(interfaces)) {
    // Skip virtual or loopback interfaces
    if (name.startsWith('utun') || name.startsWith('awdl') || name.startsWith('llw') || name.startsWith('bridge')) {
      continue;
    }
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        let label = name;
        if (name === 'en0') label = 'Wi-Fi (en0)';
        else if (name === 'en1') label = 'Ethernet / Wi-Fi (en1)';
        else if (name.startsWith('en')) label = `Network Interface (${name})`;

        candidates.push({
          name,
          label: `${label} - ${iface.address}`,
          address: iface.address
        });
      }
    }
  }

  // If no standard interfaces found, include all non-internal IPv4
  if (candidates.length === 0) {
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        if (iface.family === 'IPv4' && !iface.internal) {
          candidates.push({ name, label: `${name} - ${iface.address}`, address: iface.address });
        }
      }
    }
  }

  return candidates;
}

/**
 * Best-effort guess at "the" LAN IP to show the user. Prefers macOS's usual
 * Wi-Fi interface names (en0/en1) since that's the common case for this app,
 * falls back to whatever non-internal IPv4 address is available.
 */
function getPreferredLocalIP(preferredName = null) {
  const candidates = getLocalIPs();
  if (preferredName) {
    const matched = candidates.find((c) => c.name === preferredName || c.address === preferredName);
    if (matched) return matched.address;
  }
  const preferredOrder = ['en0', 'en1', 'en2'];
  for (const name of preferredOrder) {
    const match = candidates.find((c) => c.name === name);
    if (match) return match.address;
  }
  return candidates.length ? candidates[0].address : '127.0.0.1';
}

module.exports = { getLocalIPs, getPreferredLocalIP };
