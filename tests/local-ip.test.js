const test = require("node:test");
const assert = require("node:assert");
const { getLocalIPs, getPreferredLocalIP } = require("../lib/local-ip");

test("getLocalIPs returns an array of network candidates", () => {
  const ips = getLocalIPs();
  assert.ok(Array.isArray(ips));
  for (const item of ips) {
    assert.ok(item.name, "Candidate must have interface name");
    assert.ok(item.address, "Candidate must have IP address");
    assert.ok(item.label, "Candidate must have friendly label");
  }
});

test("getPreferredLocalIP returns a valid IPv4 address string", () => {
  const preferred = getPreferredLocalIP();
  assert.strictEqual(typeof preferred, "string");
  assert.match(preferred, /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);
});
