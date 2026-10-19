const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { ensureCerts, parseCertificateSANs, isCertValidForIP } = require("../lib/cert-manager");

test("parseCertificateSANs gracefully handles empty input", () => {
  const sans = parseCertificateSANs("");
  assert.deepStrictEqual(sans, []);
});

test("ensureCerts generates CA and valid server certificate", () => {
  const testCertsDir = path.join(os.tmpdir(), "floatcam-cert-test-" + Date.now());
  try {
    const certData = ensureCerts(testCertsDir, "127.0.0.1");
    assert.ok(certData);
    assert.ok(fs.existsSync(certData.certPath));
    assert.ok(fs.existsSync(certData.keyPath));
    assert.ok(fs.existsSync(certData.caCertPath));
    assert.ok(certData.fingerprint);
    assert.strictEqual(certData.fingerprint.length, 64); // sha256 hex length
    assert.ok(isCertValidForIP(certData.certPem, "127.0.0.1"));
  } finally {
    if (fs.existsSync(testCertsDir)) fs.rmSync(testCertsDir, { recursive: true, force: true });
  }
});
