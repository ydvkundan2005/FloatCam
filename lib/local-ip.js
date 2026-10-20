const os = require('os');

/**
 * Returns every non-internal IPv4 address on the machine, tagged with interface name
 * and friendly label.
 */
function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const candidates = [];
  for (const name of Object.keys(interfaces)) {
    const lower = name.toLowerCase();
    // Skip virtual or loopback interfaces on macOS and Windows
    if (
      lower.startsWith('utun') ||
      lower.startsWith('awdl') ||
      lower.startsWith('llw') ||
      lower.startsWith('bridge') ||
      lower.startsWith('vethernet') ||
      lower.includes('virtualbox') ||
      lower.includes('vmware') ||
      lower.includes('wsl') ||
      lower.includes('loopback') ||
      lower.includes('tap')
    ) {
      continue;
    }
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        let label = name;
        if (name === 'en0') label = 'Wi-Fi (en0)';
        else if (name === 'en1') label = 'Ethernet / Wi-Fi (en1)';
        else if (/wi-?fi/i.test(name)) label = `Wi-Fi (${name})`;
        else if (/ethernet/i.test(name)) label = `Ethernet (${name})`;
        else if (/wireless/i.test(name)) label = `Wi-Fi (${name})`;
        else if (/local area connection/i.test(name)) label = `LAN (${name})`;
        else if (name.startsWith('{') && name.endsWith('}')) label = `Network Adapter (${iface.address})`;
        else if (name.startsWith('en')) label = `Network Interface (${name})`;
        else if (name.startsWith('eth')) label = `Ethernet (${name})`;
        else if (name.startsWith('wlan')) label = `Wi-Fi (${name})`;

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
 * Best-effort guess at "the" LAN IP to show the user.
 * Prefers Wi-Fi / Ethernet across macOS and Windows.
 */
function getPreferredLocalIP(preferredName = null) {
  const candidates = getLocalIPs();
  if (preferredName) {
    const matched = candidates.find((c) => c.name === preferredName || c.address === preferredName);
    if (matched) return matched.address;
  }
  const preferredMatch = candidates.find(
    (c) =>
      c.name === 'en0' ||
      c.name === 'en1' ||
      /wi-?fi/i.test(c.name) ||
      /wireless/i.test(c.name) ||
      /ethernet/i.test(c.name)
  );
  if (preferredMatch) return preferredMatch.address;

  return candidates.length ? candidates[0].address : '127.0.0.1';
}

module.exports = { getLocalIPs, getPreferredLocalIP };
