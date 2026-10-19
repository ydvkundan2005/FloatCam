const path = require("path");
const { ensureCerts } = require("../lib/cert-manager");
const { getPreferredLocalIP } = require("../lib/local-ip");

const CERTS_DIR = path.resolve(__dirname, "..", "certs");
const ip = getPreferredLocalIP();
console.log(`Generating certificates for IP: ${ip} in ${CERTS_DIR}...`);
const res = ensureCerts(CERTS_DIR, ip);
console.log("Certificate generated successfully!");
console.log("SHA256 Fingerprint:", res.fingerprint);
console.log("SANs covered:", res.sans.join(", "));
