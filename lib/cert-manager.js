const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const crypto = require('crypto');
const { getLocalIPs } = require('./local-ip');

const OPENSSL_BIN = fs.existsSync('/usr/bin/openssl') ? '/usr/bin/openssl' : 'openssl';

function getMachineHostnames() {
  const hostnames = ['localhost'];
  try {
    const scutilHost = execSync('scutil --get LocalHostName 2>/dev/null', { encoding: 'utf8' }).trim();
    if (scutilHost) {
      hostnames.push(`${scutilHost}.local`);
    }
  } catch (e) {
    /* fallback to os.hostname */
  }
  const osHost = os.hostname();
  if (osHost && !hostnames.includes(osHost)) {
    hostnames.push(osHost);
    if (!osHost.endsWith('.local')) hostnames.push(`${osHost}.local`);
  }
  return hostnames;
}

function parseCertificateSANs(certPem) {
  try {
    const output = execSync(`${OPENSSL_BIN} x509 -noout -text`, {
      input: certPem,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    });
    const match = output.match(/X509v3 Subject Alternative Name:[ \t]*\r?\n[ \t]*([^\r\n]+)/);
    if (!match) return [];
    return match[1].split(',').map((s) => s.trim());
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
 * Uses macOS built-in LibreSSL / OpenSSL without requiring external tools.
 */
function ensureCerts(certsDir, targetIp = null) {
  if (!fs.existsSync(certsDir)) {
    fs.mkdirSync(certsDir, { recursive: true });
  }

  const caKeyPath = path.join(certsDir, 'ca.key');
  const caCertPath = path.join(certsDir, 'ca.pem');
  const serverKeyPath = path.join(certsDir, 'key.pem');
  const serverCertPath = path.join(certsDir, 'cert.pem');

  let needNewServerCert = false;

  // Check if server cert exists and covers target IP
  if (fs.existsSync(serverCertPath) && fs.existsSync(serverKeyPath)) {
    const certPem = fs.readFileSync(serverCertPath, 'utf8');
    if (targetIp && !isCertValidForIP(certPem, targetIp)) {
      console.log(`[cert-manager] Current IP ${targetIp} not covered in existing certificate. Regenerating...`);
      needNewServerCert = true;
    }
  } else {
    needNewServerCert = true;
  }

  // 1. Ensure CA exists
  if (!fs.existsSync(caCertPath) || !fs.existsSync(caKeyPath)) {
    console.log('[cert-manager] Generating local Root Certificate Authority (CA)...');
    try {
      execSync(
        `${OPENSSL_BIN} req -x509 -newkey rsa:2048 -nodes ` +
          `-keyout "${caKeyPath}" -out "${caCertPath}" -days 1825 ` +
          `-subj "/CN=Floating Phone Camera Local CA/O=Floating Phone Camera/C=US"`,
        { stdio: 'pipe' }
      );
    } catch (err) {
      if (fs.existsSync(caCertPath) && fs.existsSync(serverCertPath)) {
        console.warn('[cert-manager] OpenSSL not found; using existing pre-generated certs.');
        needNewServerCert = false;
      } else {
        console.error('[cert-manager] Failed to generate CA:', err.message);
        throw err;
      }
    }
    needNewServerCert = true; // New CA means server cert must be re-issued
  }

  // 2. Generate Server Certificate if needed
  if (needNewServerCert) {
    console.log('[cert-manager] Issuing new server certificate with Subject Alternative Names...');
    const csrPath = path.join(certsDir, 'server.csr');
    const extPath = path.join(certsDir, 'server.ext');

    // Collect all local IPs and hostnames
    const localIPs = getLocalIPs().map((i) => i.address);
    if (targetIp && !localIPs.includes(targetIp)) localIPs.unshift(targetIp);
    if (!localIPs.includes('127.0.0.1')) localIPs.push('127.0.0.1');

    const hostnames = getMachineHostnames();

    // Build OpenSSL extension config with SANs
    let extContent = [
      'basicConstraints=CA:FALSE',
      'keyUsage=digitalSignature,keyEncipherment',
      'extendedKeyUsage=serverAuth',
      'subjectAltName=@alt_names',
      '',
      '[alt_names]'
    ];

    let dnsIndex = 1;
    for (const h of hostnames) {
      extContent.push(`DNS.${dnsIndex++} = ${h}`);
    }
    extContent.push(`DNS.${dnsIndex++} = *.local`);

    let ipIndex = 1;
    for (const ip of localIPs) {
      extContent.push(`IP.${ipIndex++} = ${ip}`);
    }

    fs.writeFileSync(extPath, extContent.join('\n'));

    try {
      // Generate server key and CSR
      execSync(
        `${OPENSSL_BIN} req -newkey rsa:2048 -nodes ` +
          `-keyout "${serverKeyPath}" -out "${csrPath}" ` +
          `-subj "/CN=${targetIp || 'localhost'}/O=Floating Phone Camera"`,
        { stdio: 'pipe' }
      );

      // Sign with local CA
      execSync(
        `${OPENSSL_BIN} x509 -req -in "${csrPath}" ` +
          `-CA "${caCertPath}" -CAkey "${caKeyPath}" -CAcreateserial ` +
          `-out "${serverCertPath}" -days 825 -extfile "${extPath}"`,
        { stdio: 'pipe' }
      );

      // Cleanup CSR and ext files
      if (fs.existsSync(csrPath)) fs.unlinkSync(csrPath);
      if (fs.existsSync(extPath)) fs.unlinkSync(extPath);
      console.log('[cert-manager] Successfully generated server certificate!');
    } catch (err) {
      console.error('[cert-manager] Failed to generate server cert:', err.message);
      throw err;
    }
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
