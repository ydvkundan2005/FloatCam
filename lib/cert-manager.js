const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const forge = require('node-forge');
const { getLocalIPs } = require('./local-ip');

const pki = forge.pki;

function getMachineHostnames() {
  const hostnames = ['localhost'];
  if (process.platform === 'darwin') {
    try {
      const { execSync } = require('child_process');
      const scutilHost = execSync('scutil --get LocalHostName 2>/dev/null', {
        encoding: 'utf8',
        timeout: 1000
      }).trim();
      if (scutilHost) {
        hostnames.push(`${scutilHost}.local`);
      }
    } catch (e) {
      /* fallback to os.hostname */
    }
  }
  const osHost = os.hostname();
  if (osHost && !hostnames.includes(osHost)) {
    hostnames.push(osHost);
    if (!osHost.endsWith('.local')) hostnames.push(`${osHost}.local`);
  }
  return hostnames;
}

function parseCertificateSANs(certPem) {
  if (!certPem) return [];
  try {
    const x509 = new crypto.X509Certificate(certPem);
    if (!x509.subjectAltName) return [];
    return x509.subjectAltName.split(',').map((s) => s.trim());
  } catch (err) {
    return [];
  }
}

function isCertValidForIP(certPem, ip) {
  if (!certPem || !ip) return false;
  const sans = parseCertificateSANs(certPem);
  return sans.some((san) => san === `IP Address:${ip}` || san === `IP:${ip}` || san === ip);
}

/**
 * Ensures valid CA and Server certificates exist with the required SANs.
 * Uses pure JavaScript node-forge for 100% cross-platform compatibility
 * (runs seamlessly on Windows, macOS, and Linux without external OpenSSL binaries).
 */
function ensureCerts(certsDir, targetIp = null) {
  if (!fs.existsSync(certsDir)) {
    fs.mkdirSync(certsDir, { recursive: true });
  }

  const caKeyPath = path.join(certsDir, 'ca.key');
  const caCertPath = path.join(certsDir, 'ca.pem');
  const serverKeyPath = path.join(certsDir, 'key.pem');
  const serverCertPath = path.join(certsDir, 'cert.pem');

  let caPrivateKey = null;
  let caCert = null;

  // 1. Check or create Root CA
  if (fs.existsSync(caCertPath) && fs.existsSync(caKeyPath)) {
    try {
      const caKeyPem = fs.readFileSync(caKeyPath, 'utf8');
      const caCertPem = fs.readFileSync(caCertPath, 'utf8');
      caPrivateKey = pki.privateKeyFromPem(caKeyPem);
      caCert = pki.certificateFromPem(caCertPem);
    } catch (err) {
      console.warn('[cert-manager] Failed to parse existing CA, regenerating...', err.message);
      caPrivateKey = null;
      caCert = null;
    }
  }

  let needNewServerCert = false;

  if (!caPrivateKey || !caCert) {
    console.log('[cert-manager] Generating local Root Certificate Authority (CA)...');
    const caKeys = pki.rsa.generateKeyPair({ bits: 2048, workers: -1 });
    caPrivateKey = caKeys.privateKey;
    caCert = pki.createCertificate();
    caCert.publicKey = caKeys.publicKey;
    caCert.serialNumber = '01';
    caCert.validity.notBefore = new Date();
    caCert.validity.notAfter = new Date();
    caCert.validity.notAfter.setFullYear(caCert.validity.notBefore.getFullYear() + 5);

    const caAttrs = [
      { name: 'commonName', value: 'Floating Phone Camera Local CA' },
      { name: 'organizationName', value: 'Floating Phone Camera' },
      { name: 'countryName', value: 'US' }
    ];
    caCert.setSubject(caAttrs);
    caCert.setIssuer(caAttrs);
    caCert.setExtensions([
      { name: 'basicConstraints', cA: true, critical: true },
      { name: 'keyUsage', keyCertSign: true, cRLSign: true, critical: true }
    ]);
    caCert.sign(caPrivateKey, forge.md.sha256.create());

    fs.writeFileSync(caKeyPath, pki.privateKeyToPem(caPrivateKey));
    fs.writeFileSync(caCertPath, pki.certificateToPem(caCert));
    needNewServerCert = true;
  }

  // 2. Check if server cert exists and covers target IP
  if (!needNewServerCert && fs.existsSync(serverCertPath) && fs.existsSync(serverKeyPath)) {
    const certPem = fs.readFileSync(serverCertPath, 'utf8');
    if (targetIp && !isCertValidForIP(certPem, targetIp)) {
      console.log(`[cert-manager] Current IP ${targetIp} not covered in existing certificate. Regenerating...`);
      needNewServerCert = true;
    }
  } else {
    needNewServerCert = true;
  }

  // 3. Issue new Server Certificate if needed
  if (needNewServerCert) {
    console.log('[cert-manager] Issuing new server certificate with Subject Alternative Names...');
    const serverKeys = pki.rsa.generateKeyPair({ bits: 2048, workers: -1 });
    const cert = pki.createCertificate();
    cert.publicKey = serverKeys.publicKey;
    cert.serialNumber = Date.now().toString(16);
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 2);

    const serverAttrs = [
      { name: 'commonName', value: targetIp || 'localhost' },
      { name: 'organizationName', value: 'Floating Phone Camera' }
    ];
    cert.setSubject(serverAttrs);
    cert.setIssuer(caCert.subject.attributes);

    // Collect all local IPs and hostnames
    const localIPs = getLocalIPs().map((i) => i.address);
    if (targetIp && !localIPs.includes(targetIp)) localIPs.unshift(targetIp);
    if (!localIPs.includes('127.0.0.1')) localIPs.push('127.0.0.1');

    const hostnames = getMachineHostnames();

    const altNames = [];
    for (const h of hostnames) {
      altNames.push({ type: 2, value: h }); // DNS
    }
    altNames.push({ type: 2, value: '*.local' });

    for (const ip of localIPs) {
      altNames.push({ type: 7, ip: ip }); // IP
    }

    cert.setExtensions([
      { name: 'basicConstraints', cA: false },
      { name: 'keyUsage', digitalSignature: true, keyEncipherment: true },
      { name: 'extKeyUsage', serverAuth: true },
      { name: 'subjectAltName', altNames }
    ]);

    cert.sign(caPrivateKey, forge.md.sha256.create());

    fs.writeFileSync(serverKeyPath, pki.privateKeyToPem(serverKeys.privateKey));
    fs.writeFileSync(serverCertPath, pki.certificateToPem(cert));
    console.log('[cert-manager] Successfully generated server certificate!');
  }

  // Read certificate text and return info
  const certPem = fs.readFileSync(serverCertPath, 'utf8');
  const caPem = fs.readFileSync(caCertPath, 'utf8');
  const fingerprint = crypto.createHash('sha256').update(certPem).digest('hex');

  return {
    certPath: serverCertPath,
    keyPath: serverKeyPath,
    caCertPath: caCertPath,
    certPem,
    caPem,
    fingerprint,
    sans: parseCertificateSANs(certPem)
  };
}

module.exports = {
  ensureCerts,
  parseCertificateSANs,
  isCertValidForIP
};
