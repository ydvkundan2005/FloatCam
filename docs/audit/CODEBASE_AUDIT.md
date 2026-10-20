# FloatCam V3 — Codebase Audit
**Audit Date:** 2026-10-20
**Auditor:** Antigravity Senior Architecture Audit
**Status:** Fresh Full Audit

---

## 1. Architecture Overview

```
main.js (Electron main process)
├── lib/signaling-server.js    HTTPS + WebSocket server
├── lib/cert-manager.js        TLS CA + server cert generation (node-forge)
├── lib/settings-store.js      Atomic JSON settings persistence
├── lib/port-manager.js        Dynamic port discovery (9211-9299)
├── lib/local-ip.js            Network interface enumeration
├── shared/ipc-channels.js     Central IPC channel name registry
├── shared/shapes.js           Shape definitions (dual CJS + browser)
├── preload-control.js         contextBridge for control dashboard
├── preload-receiver.js        contextBridge for floating preview
├── renderer/                  App dashboard UI + floating preview
├── phone/                     Mobile web app (served over HTTPS)
├── scripts/                   Build scripts (DMG, Windows, icons)
└── tests/                     Node test runner unit tests (15 tests)
```

---

## 2. Component Inspection Results

### 2.1 main.js (710 lines)
- IPC Handlers: All 26 channels registered and matched. OK
- Window Management: Preview + Control windows correct. OK
- Tray: Left-click + right-click + double-click all handled. OK
- Windows Acrylic: Guarded by OS build number check. OK
- Certificate Error Handler: Covers all local IP ranges. OK
- DEFECT NEW-01: getSignalDetails() uses activePort which can be null after a port failure. Produces https://IP:null/?s=... in QR code.
- DEFECT NEW-02: REGENERATE_CERTS does not reset sessionToken. Old token remains valid after cert change.
- DEFECT NEW-03: connectionStatus.currentIp only updated on server start, not on SET_NETWORK_INTERFACE.

### 2.2 lib/signaling-server.js (330 lines)
- Static serving: Path traversal protection correct. OK
- WebSocket heartbeat: isAlive pong pattern implemented. OK
- Session token: Phone-only validation implemented. OK
- DEFECT NEW-04: httpsServer.close() does not destroy existing keep-alive connections causing EADDRINUSE race on rapid restart.
- DEFECT NEW-05: _handleClose missing guard against double-null socket (defensive check missing).

### 2.3 lib/cert-manager.js (191 lines)
- Pure JS (node-forge): Cross-platform, no OpenSSL binary. OK
- SAN coverage: All local IPs + hostnames + *.local. OK
- DEFECT NEW-06: getMachineHostnames() uses execSync on macOS with no timeout guard.
- DEFECT NEW-07: CA cert missing keyUsage: keyCertSign, cRLSign extensions - strict clients may reject.

### 2.4 lib/settings-store.js (74 lines)
- Atomic write: Temp file + renameSync pattern. OK
- DEFECT NEW-08: Nested object fields (size) not validated - corrupt values pass through Object.assign.

### 2.5 lib/port-manager.js (51 lines)
- Sequential scan 9211-9299, first free port. OK. No issues.

### 2.6 lib/local-ip.js (83 lines)
- Interface filtering works for macOS and Windows. OK
- DEFECT NEW-09: Windows interface label UX - raw names shown for non-standard adapters.

### 2.7 preload-control.js / preload-receiver.js
- All methods correctly bridge to IPC channels. OK. No issues.

### 2.8 renderer/control.js (440 lines)
- DEFECT NEW-10 (ERR-03 residual): Line 173 hardcodes 'Port 9211' in error message. Should use status.port.
- DEFECT NEW-11: remoteSwitchBtn re-enable timeout 1000ms may fire too early, allowing double-clicks.
- DEFECT NEW-12: refreshSignalInfo() not triggered on server-start event from onConnectionStatus callback.

### 2.9 renderer/receiver.js (332 lines)
- ICE candidate queuing implemented. OK
- Reconnect backoff implemented. OK
- DEFECT NEW-13: PeerConnection handlers not explicitly removed on teardown - late callbacks possible.
- DEFECT NEW-14: phoneStream nulled on ws.onclose even when isUsingLocalCamera=true - cannot restore phone stream later.

### 2.10 phone/phone.js (352 lines)
- Session token, camera flip, ICE queuing all implemented. OK
- DEFECT NEW-15: negotiating flag race condition when peer-ready and ICE failure fire simultaneously.

### 2.11 HTML Files
- DEFECT NEW-16: receiver.html missing lang attribute on html tag.
- DEFECT NEW-17: control.html title not version-dynamic (minor cosmetic).

### 2.12 Build Scripts
- DEFECT NEW-18 (CRITICAL): build-windows.js ZIP step uses POSIX zip command which does NOT exist on Windows. Fails if script run on Windows host.
- DEFECT NEW-19: Packager hardcodes --electron-version=32.3.3. Will break if electron updated.
- DEFECT NEW-20: USE_SYSTEM_MAKENSIS env var is not recognized by electron-builder (should be USE_SYSTEM_NSIS on Linux). Harmless but incorrect.

### 2.13 package.json
- DEFECT NEW-21: allowToChangeInstallationDirectory=false undocumented - users cannot change install path.
- DEFECT NEW-22: electron 32.x has 36+ CVEs. Upgrade to 34.x+ recommended but is breaking change.
- DEFECT NEW-23: node-forge CVE (GHSA-86w9-cpqp-85rv) - accepted risk since we only generate certs, not verify.

---

## 3. Security Assessment

| Category | Status |
|---|---|
| Context Isolation | Enabled |
| Node Integration | Disabled |
| CSP Headers | All 3 HTML files |
| Session Token | Phone validated |
| Path Traversal | Guarded |
| shell.openExternal | URL not user-constructed |

---

## 4. Cross-Platform Compatibility

| Feature | macOS | Windows |
|---|---|---|
| App launches | OK | OK |
| Cert generation | OK | OK (pure JS) |
| NSIS installer | N/A | OK |
| ZIP from Windows host | N/A | BROKEN (NEW-18) |

---

## 5. Test Coverage

| Module | Tests | Level |
|---|---|---|
| cert-manager.js | 2 | Core paths |
| ipc-channels.js | 1 | Channel presence |
| local-ip.js | 2 | Basic |
| port-manager.js | 2 | Free port + collision |
| signaling-server.js | 1 | Token validation |
| settings-store.js | 3 | Load/set/reset |
| shapes.js | 4 | All shapes |
| renderer/control.js | 0 | NOT TESTED |
| renderer/receiver.js | 0 | NOT TESTED |
| phone/phone.js | 0 | NOT TESTED |
| main.js | 0 | NOT TESTED (Electron) |
