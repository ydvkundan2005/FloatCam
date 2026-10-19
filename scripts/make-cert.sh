#!/bin/bash
# Generates a locally-trusted HTTPS certificate (via mkcert) covering
# localhost, 127.0.0.1, ::1, and this Mac's current LAN IP, so the phone's
# browser can connect over https:// without a certificate warning.
set -e

if ! command -v mkcert >/dev/null 2>&1; then
  echo "mkcert is not installed."
  echo ""
  echo "Install it with Homebrew, then run this again:"
  echo "    brew install mkcert nss"
  echo "    npm run cert"
  exit 1
fi

mkdir -p certs

LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "127.0.0.1")

echo "Installing mkcert's local certificate authority (this may prompt for your password)…"
mkcert -install

echo "Generating certificate for localhost, 127.0.0.1, ::1, and ${LOCAL_IP}…"
mkcert -key-file certs/key.pem -cert-file certs/cert.pem "localhost" "127.0.0.1" "::1" "$LOCAL_IP"

echo ""
echo "Done — certificates written to ./certs/cert.pem and ./certs/key.pem"
echo "If your Mac's Wi-Fi IP address changes later (new network, DHCP renewal), re-run: npm run cert"
