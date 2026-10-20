# FloatCam V3 — Fix Implementation Plan

**Project:** FloatCam  
**Version:** 3.0.0  
**Status:** Approved for Systematic Execution  

---

## 1. Prioritization & Execution Strategy

Fixes are prioritized to resolve functional failures and race conditions first, followed by data reliability, UI consistency, and legacy cleanup:

```
+-----------------------------------------------------------+
| Stage 1: Functional & Core Signaling Fixes                |
| - ERR-01: Connect remote camera flip IPC & server handler |
| - ERR-02: Fix CA profile download URL path construction   |
| - ERR-03: Dynamic port in UI footer and troubleshooting   |
+-----------------------------+-----------------------------+
                              |
+-----------------------------v-----------------------------+
| Stage 2: WebRTC Resilience & Data Safety                  |
| - ERR-04: Receiver ICE candidate queuing & draining       |
| - ERR-05: Phone client ICE candidate queuing & draining   |
| - ERR-06: Atomic settings file persistence (.tmp + rename)|
+-----------------------------+-----------------------------+
                              |
+-----------------------------v-----------------------------+
| Stage 3: UI, Phrasing & Documentation Polish              |
| - ERR-07: Update control dashboard version badge to v3.0  |
| - ERR-08: Generalize platform phrasing in phone.html      |
| - ERR-09: Update root launcher scripts for V3             |
| - ERR-10: Clean legacy paths and references in docs/      |
+-----------------------------+-----------------------------+
                              |
+-----------------------------v-----------------------------+
| Stage 4: Test Suite Expansion & Installer Rebuild         |
| - Add unit tests for camera flip and atomic persistence   |
| - Execute full test suite (npm test)                      |
| - Rebuild production installers (DMG & NSIS Setup)        |
| - Final verification & handoff                            |
+-----------------------------------------------------------+
```

---

## 2. Detailed Task Breakdown

### Stage 1: Functional & Core Signaling Fixes

#### Task 1.1: Fix Remote Camera Flip (ERR-01)
- **Files Modified**:
  - `shared/ipc-channels.js` (Add `SWITCH_CAMERA: 'floatingcam:switch-camera'`)
  - `preload-control.js` (Expose `switchCamera: () => ipcRenderer.invoke(CH.SWITCH_CAMERA)`)
  - `lib/signaling-server.js` (Add `switchPhoneCamera()` method emitting to `phoneSocket`)
  - `main.js` (Add IPC handler for `CH.SWITCH_CAMERA` delegating to `server.switchPhoneCamera()`)
  - `renderer/control.js` (Wire `remoteSwitchBtn` click to `window.controls.switchCamera()`)
- **Regression Risk**: None. Replaces a non-functional clipboard copy stub with the actual IPC implementation.
- **Acceptance Criteria**: Clicking "Flip Phone Camera" sends `{ type: 'camera-switch' }` over WebSocket to the phone client.

#### Task 1.2: Fix Root CA Download URL Path (ERR-02)
- **Files Modified**:
  - `renderer/control.js`
- **Fix**:
  ```javascript
  downloadCaBtn.addEventListener('click', () => {
    if (currentPhoneUrl && window.controls.openExternal) {
      const baseUrl = currentPhoneUrl.split('?')[0].replace(/\/+$/, '');
      window.controls.openExternal(`${baseUrl}/ca.crt`);
    }
  });
  ```
- **Regression Risk**: None.
- **Acceptance Criteria**: Clicking button opens `https://<ip>:<port>/ca.crt` directly in external browser.

#### Task 1.3: Dynamic Port Display in UI (ERR-03)
- **Files Modified**:
  - `renderer/control.js`
  - `renderer/control.html`
- **Fix**: Use `${info.port}` instead of `:9211` when updating `footerIpText`. Update placeholder text in `control.html`.
- **Acceptance Criteria**: Footer displays the actual active port (e.g. 9211, 9212).

---

### Stage 2: WebRTC Resilience & Data Safety

#### Task 2.1: Receiver ICE Candidate Queue (ERR-04)
- **Files Modified**:
  - `renderer/receiver.js`
- **Fix**: Maintain a `pendingCandidates` array. When `msg.type === 'candidate'` arrives:
  - If `pc && pc.remoteDescription`: call `pc.addIceCandidate()`.
  - Else: push to `pendingCandidates`.
  - After `pc.setRemoteDescription(offer)` completes: drain `pendingCandidates`.
- **Acceptance Criteria**: ICE candidates received prior to SDP offer processing are preserved and applied.

#### Task 2.2: Phone Client ICE Candidate Queue (ERR-05)
- **Files Modified**:
  - `phone/phone.js`
- **Fix**: Implement the identical candidate queue pattern for incoming candidates before `setRemoteDescription` on answer.
- **Acceptance Criteria**: Eliminates race conditions in WebRTC peer setup.

#### Task 2.3: Atomic Settings Store Persistence (ERR-06)
- **Files Modified**:
  - `lib/settings-store.js`
- **Fix**: Write JSON data to `${this.filePath}.tmp`, then atomically rename via `fs.renameSync`.
- **Acceptance Criteria**: Settings file is never corrupted or zeroed out during unexpected shutdown.

---

### Stage 3: UI, Phrasing & Documentation Polish

#### Task 3.1: Dashboard Version Badge (ERR-07)
- **Files Modified**: `renderer/control.html`
- **Fix**: Change title to `FloatCam V3 — App Dashboard` and badge to `v3.0`.

#### Task 3.2: Generalize Phone Permission Text (ERR-08)
- **Files Modified**: `phone/phone.html`
- **Fix**: Change "so your Mac can receive" to "so your computer can receive".

#### Task 3.3: Update Root Launcher Scripts (ERR-09)
- **Files Modified**:
  - `Run-FPC.bat`
  - `Floating-Phone-Camera.command`
- **Fix**: Target `FloatCam-Setup-v3.exe`, `FloatCam.app`, or `npm start`.

#### Task 3.4: Update Legacy Docs (ERR-10)
- **Files Modified**:
  - `docs/INSTALL-GUIDE.md`
  - `docs/PACKAGING.md`

---

### Stage 4: Test Suite Expansion & Production Rebuild

#### Task 4.1: Automated Unit Tests
- Add tests in `tests/settings-store.test.js` verifying atomic save.
- Add tests in `tests/signaling-server.test.js` verifying `switchPhoneCamera()`.
- Run full test suite with `npm test`.

#### Task 4.2: Production Artifact Rebuild & Packaging Verification
- Run `npm run build:mac` to produce `releases/FloatCam-v3.dmg`.
- Run `npm run build:win` to produce `releases/FloatCam-Setup-v3.exe` and `releases/FloatCam-v3-Windows-x64.zip`.
- Perform mount test and executable inspection.
