# FloatCam V3 — Error Register
**Audit Date:** 2026-10-20
**Total Issues:** 23

---

| ID | File | Severity | Description | Status |
|---|---|---|---|---|
| NEW-01 | main.js | High | getSignalDetails() returns null port in QR URL on server failure | Resolved |
| NEW-02 | main.js | Medium | REGENERATE_CERTS preserves old sessionToken - old phones can reconnect | Resolved |
| NEW-03 | main.js | Low | connectionStatus.currentIp stale after network interface change | Resolved |
| NEW-04 | lib/signaling-server.js | High | httpsServer.close() doesn't destroy keep-alive connections - EADDRINUSE race | Resolved |
| NEW-05 | lib/signaling-server.js | Low | _handleClose missing guard against already-nulled socket refs | Resolved |
| NEW-06 | lib/cert-manager.js | Low | execSync('scutil') has no timeout on macOS - main thread block risk | Resolved |
| NEW-07 | lib/cert-manager.js | Low | CA cert missing keyUsage extensions - strict clients may reject | Resolved |
| NEW-08 | lib/settings-store.js | Medium | Nested objects (size) not validated - corrupt JSON passes through | Resolved |
| NEW-09 | lib/local-ip.js | Low | Windows interface labels not friendly for non-standard adapters | Resolved |
| NEW-10 | renderer/control.js | High | Hardcoded 'Port 9211' in port-in-use error message (should be dynamic) | Resolved |
| NEW-11 | renderer/control.js | Medium | remoteSwitchBtn re-enable timeout too short - double-click risk | Resolved |
| NEW-12 | renderer/control.js | Medium | QR code not refreshed when server restarts via onConnectionStatus | Resolved |
| NEW-13 | renderer/receiver.js | Low | PeerConnection handlers not removed on teardown - stale callbacks | Resolved |
| NEW-14 | renderer/receiver.js | Medium | phoneStream nulled on ws.onclose during local camera use - cannot restore | Resolved |
| NEW-15 | phone/phone.js | Medium | negotiating flag race condition on concurrent peer-ready + ICE failure | Resolved |
| NEW-16 | renderer/receiver.html | Low | Missing lang attribute on html element | Resolved |
| NEW-17 | renderer/control.html | Low | Title not dynamically versioned from package.json | Resolved |
| NEW-18 | scripts/build-windows.js | Critical | POSIX zip command used - fails on Windows host | Resolved |
| NEW-19 | scripts/build-windows.js | Medium | Hardcoded --electron-version=32.3.3 in packager command | Resolved |
| NEW-20 | scripts/build-windows.js | Low | USE_SYSTEM_MAKENSIS not recognized by electron-builder | Resolved |
| NEW-21 | package.json | Low | allowToChangeInstallationDirectory=false undocumented | Resolved |
| NEW-22 | package.json | High | electron 32.x has 36+ CVEs - upgrade recommended | Accepted Risk |
| NEW-23 | package.json | Medium | node-forge CVE on signature verification - accepted risk for gen-only use | Accepted Risk |
