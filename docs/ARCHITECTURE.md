# FloatCam Architecture

## System Overview

FloatCam consists of four integrated layers designed for ultra-low latency wireless camera streaming over local networks:

```
       +---------------------------------------------+
       |           Mobile Phone (Web Client)         |
       |  (Safari / Chrome getUserMedia -> WebRTC)   |
       +----------------------+----------------------+
                              |
                     HTTPS / WSS / WebRTC
                     (Local Wi-Fi / LAN)
                              |
       +----------------------v----------------------+
       |           Built-in Signaling Server         |
       |      (Node.js HTTPS + WebSocket /signal)    |
       +----------------------+----------------------+
                              |
                     Electron Main Process
                      (main.js / IPC Bus)
                              |
           +------------------+------------------+
           |                                     |
+----------v-----------+             +-----------v----------+
|  Preview Window      |             |  Control Dashboard   |
|  (Floating Camera)   |             |  (Menu Bar Popover)  |
+----------------------+             +----------------------+
```

---

## Component Breakdown

### 1. Main Process (`main.js`)
- **Lifecycle & Tray Management**: Runs as a resident menu bar utility (`LSUIElement` on macOS, taskbar tray icon on Windows).
- **Window Management**: Controls the floating, transparent, frameless preview window and the popover dashboard window.
- **IPC Coordinator**: Routes settings changes, window resizing, positioning, camera switches, and connection statuses between the renderer windows.

### 2. Built-in Signaling Server (`lib/signaling-server.js`)
- Serves the mobile client static web application (`phone/phone.html`, `phone.js`, `phone.css`) over local HTTPS on port `9211`.
- Provides a WebSocket endpoint (`/signal`) for WebRTC SDP offer/answer exchange and ICE candidate negotiation between the phone and the Mac receiver.
- Provides CA certificate download at `/ca.crt` for iOS certificate trust profile installation.

### 3. Certificate Manager (`lib/cert-manager.js`)
- Automatically generates a local Root Certificate Authority (CA) and an X.509 server certificate signed with Subject Alternative Names (SANs) covering:
  - Active local IPv4 addresses (e.g., `192.168.x.x`, `10.x.x.x`)
  - `localhost` and `127.0.0.1`
  - Local hostnames (`*.local`)
- Automatically validates existing certificates and regenerates them if the host changes network interfaces or Wi-Fi networks.

### 4. Floating Preview Window (`renderer/receiver.html` / `receiver.js`)
- Frameless, transparent, draggable window that floats always-on-top.
- Renders the remote WebRTC video stream with customizable clip-path geometry (10 geometric shapes), hardware-accelerated zoom, and opacity.
- Supports switching instantly to local Mac webcam (FaceTime camera) if no phone is connected.

### 5. Control Panel Dashboard (`renderer/control.html` / `control.js`)
- Native-styled popover panel providing:
  - QR code for instantaneous smartphone camera connection.
  - Active device connection list with one-click disconnect.
  - Network interface selector (Wi-Fi, Ethernet, Hotspot).
  - Shape picker, zoom slider (1.0x - 3.0x), size slider, opacity slider.
  - Corner snapping controls (↖ Top Left, ↗ Top Right, ↙ Bottom Left, ↘ Bottom Right).
  - Help, SSL, and mobile browser guides.

### 6. Mobile Web Client (`phone/phone.html` / `phone.js`)
- Zero-installation responsive web client accessible via any modern mobile browser (iOS Safari, Android Chrome).
- Automatically acquires camera streams using `navigator.mediaDevices.getUserMedia`.
- Supports switching between front (selfie) and rear (environment) cameras.
