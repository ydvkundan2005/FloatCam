# FloatCam Security & Network Model

## 1. Local-Only Architecture (No Cloud Dependency)

FloatCam operates entirely within your local local-area network (LAN / Wi-Fi):
- Video frames never leave your local Wi-Fi router.
- No third-party servers, cloud relays, or analytics trackers are used.
- WebRTC media exchange is direct peer-to-peer (P2P).

---

## 2. HTTPS & Camera Permissions

Modern mobile browsers (iOS Safari, Android Chrome) strictly enforce that camera hardware can only be accessed in **Secure Contexts** (`https://` or `localhost`).

To satisfy this requirement without requiring external domain registration or internet access:
1. FloatCam dynamically creates a local Root Certificate Authority (CA) on your computer.
2. An X.509 SSL server certificate is issued with Subject Alternative Names (SANs) corresponding to your computer's LAN IP address.
3. The built-in signaling server serves both the HTTPS static web application and the secure WebSocket signaling channel (`wss://`) over TLS.

---

## 3. Trusting the Certificate on Mobile Devices

### iOS Safari:
When opening the HTTPS URL for the first time:
1. Tap **Show Details** -> **visit this website** -> **Visit Website**.
2. Or download the CA certificate profile from `https://<IP>:9211/ca.crt` and install it under **Settings -> General -> VPN & Device Management**, then enable full trust under **Settings -> About -> Certificate Trust Settings**.

### Android Chrome:
1. Tap **Advanced** -> **Proceed to <IP> (unsafe)**.
2. Allow camera permissions when prompted.

---

## 4. Electron Security Best Practices

FloatCam adheres to the Electron security guidelines:
- **Context Isolation**: Enabled on all renderer windows (`contextIsolation: true`).
- **Node Integration**: Disabled in renderers (`nodeIntegration: false`).
- **Preload Scripts**: Only minimal, strictly validated API methods are exposed via `contextBridge`.
- **Content Security Policy**: Restrictive CSP applied to both desktop renderers and the mobile web client.
