# FloatCam Phone Compatibility Test Plan

This document provides a repeatable manual test plan for evaluating FloatCam's phone-side camera client. It is a test plan, not evidence of completed testing.

## 1. Test Environment

Record the following details for every test session.

| Field | Value |
|---|---|
| Test date and time | |
| FloatCam version | |
| Phone manufacturer and model | |
| Mobile OS version | |
| Browser and version | |
| Desktop OS and version | |
| Network conditions | |
| Test operator | |

## 2. Browser and Camera Permissions

- [ ] Phone client loads over HTTPS.
- [ ] Browser displays the camera permission prompt.
- [ ] Granting permission allows camera access.
- [ ] Denying permission produces a clear error message.
- [ ] Revoking permission is handled correctly.
- [ ] Front and rear camera selection works where supported.
- [ ] Returning to the page restores the expected camera state.

Test each browser separately. Do not assume compatibility based on another browser.

## 3. WebRTC Connection

- [ ] Phone can reach the local signalling server.
- [ ] A fresh connection can be established.
- [ ] Desktop displays the live camera preview.
- [ ] Closing the phone page ends the session appropriately.
- [ ] Refreshing the page permits a new session.
- [ ] Temporary Wi-Fi disconnection is handled.
- [ ] Reconnection works using the documented workflow.
- [ ] Repeated connection attempts do not leave stale sessions.

## 4. Mobile Lifecycle Testing

- [ ] Switching to another phone application.
- [ ] Locking and unlocking the phone.
- [ ] Turning Wi-Fi off and on.
- [ ] Rotating the phone.
- [ ] Enabling battery-saving mode.
- [ ] Backgrounding or suspending the browser tab.
- [ ] Closing and reopening the desktop application.

Background camera behavior depends on the mobile operating system and browser. Do not claim it works unless actually tested.

## 5. Video Preview

- [ ] Correct camera orientation.
- [ ] Appropriate video aspect ratio.
- [ ] Camera switching works where supported.
- [ ] Preview updates after reconnecting.
- [ ] Camera stops when the session ends.
- [ ] Observed latency or frame drops are recorded.

## 6. Test Results

Use these statuses:

- PASS — tested successfully.
- FAIL — tested but unsuccessful.
- NOT RUN — not tested.
- BLOCKED — testing could not be completed.
- NOT APPLICABLE — does not apply to this device.

| Test | Device / Browser | Status | Evidence |
|---|---|---|---|
| HTTPS and permissions | | NOT RUN | |
| Camera selection | | NOT RUN | |
| WebRTC connection | | NOT RUN | |
| Video preview | | NOT RUN | |
| Wi-Fi recovery | | NOT RUN | |
| Screen-lock behavior | | NOT RUN | |
| Session cleanup | | NOT RUN | |

## 7. Bug Report Template

For any failed test, record:

- Test case:
- FloatCam version:
- Phone model and OS:
- Browser and version:
- Desktop OS:
- Steps to reproduce:
- Expected result:
- Actual result:
- Sanitized logs:

Never publish passwords, private keys, session tokens, or private camera footage.

## 8. Important Notes

Results apply only to the exact device, browser, operating-system version, application build, and network conditions tested.

A successful test on one phone does not establish compatibility with every phone.

Keep failures and untested scenarios visible. Never mark an untested scenario as PASS.

## 9. Network and Connection Diagnostics

When a connection test fails, record the failure stage instead of reporting only that "connection failed."

| Stage | What to verify | Evidence to record |
|---|---|---|
| Phone opens client | Correct local URL and HTTPS certificate | Browser error or successful page load |
| Signalling | Phone and desktop can reach the signalling endpoint | Sanitized console/network error |
| Peer negotiation | Offer/answer exchange completes | Sanitized WebRTC state transitions |
| ICE connectivity | A usable candidate pair is selected | ICE connection state and candidate type |
| Media flow | Video frames arrive at the desktop | Frames received, dimensions, and timestamp |
| Session cleanup | Tracks and peer connection stop after exit | Final connection and track states |

Do not include full URLs containing secrets, session identifiers, access tokens, or private network details in public reports.

## 10. Repeatability and Reporting Rules

- Run each scenario at least twice before describing an intermittent issue as reproducible.
- Change one variable at a time when isolating a failure, such as browser, network, or phone model.
- Record the exact application version and device configuration for every result.
- Keep raw observations separate from conclusions.
- Attach screenshots or logs only after removing personal data, tokens, device identifiers, and private footage.
- Report unsupported browser or operating-system behavior as "not supported" only when confirmed by project documentation or repeatable testing.
- Do not convert a NOT RUN or BLOCKED result into PASS.

A compatibility claim should identify the tested phone model, operating-system version, browser version, FloatCam version, and network conditions.
