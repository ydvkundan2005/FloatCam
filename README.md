# FloatCam

> Turn your smartphone into a wireless, floating desktop webcam with zero cloud dependencies and sub-second WebRTC latency.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-lightgrey.svg)](docs/PACKAGING.md)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](package.json)
[![Electron](https://img.shields.io/badge/electron-32.3.3-blue.svg)](package.json)

---

## 🌟 Highlights & Features

- **📱 Wireless Smartphone Webcam**: Stream your iPhone (Safari) or Android (Chrome) camera directly to your desktop over local Wi-Fi.
- **⚡ Sub-Second Latency**: Direct peer-to-peer WebRTC streaming with adaptive hardware acceleration.
- **🛡️ 100% Private & Local**: Zero cloud relays, zero accounts, and zero telemetry. All video packets stay within your local network.
- **🪟 Customizable Floating Preview**: Always-on-top, transparent, frameless preview window that never gets buried behind other apps.
- **🎨 10 Geometric Window Shapes**: Circle, Squircle, Rounded Rectangle, Hexagon, Heart, Star, Diamond, Octagon, Square, and Standard 16:9 Rectangle.
- **🔍 Real-Time Transforms**: Live digital zoom slider (1.0× to 3.0×), opacity slider (10% to 100%), and interactive corner drag-to-resize.
- **📍 Quick Corner Snapping**: One-click instant positioning (↖ Top Left, ↗ Top Right, ↙ Bottom Left, ↘ Bottom Right).
- **📶 Instant QR Connection**: Just point your phone's default Camera app at the on-screen QR code—no mobile app installation required.
- **💻 Built-in Mac Webcam Fallback**: Toggle to your computer's FaceTime / integrated camera when needed.
- **🖥️ Native Menu Bar & System Tray**: Runs as an unobtrusive background utility on both macOS (`LSUIElement`) and Windows (System Tray).

---

## 🏗️ Architecture

```
+-------------------------------------------------------------+
|                  Mobile Browser Web Client                  |
|          (iOS Safari / Android Chrome getUserMedia)         |
+------------------------------+------------------------------+
                               |
                      HTTPS / WSS / WebRTC
                      (Local Wi-Fi / LAN)
                               |
+------------------------------v------------------------------+
|                   Built-in Signaling Server                 |
|             (Node.js HTTPS + WebSocket on :9211)            |
+------------------------------+------------------------------+
                               |
                      Electron Main Process
                       (main.js / IPC Bus)
                               |
           +-------------------+-------------------+
           |                                       |
+----------v------------+              +-----------v----------+
|  Preview Window       |              |  Control Dashboard   |
|  (Floating Camera)    |              |  (Menu Bar Popover)  |
+-----------------------+              +----------------------+
```

For in-depth details, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation & Run

```bash
# 1. Clone the repository
git clone https://github.com/username/FloatCam.git
cd FloatCam

# 2. Install dependencies
npm install

# 3. Launch FloatCam
npm start
```

---

## 📱 How to Connect Your Phone

1. **Connect to Same Wi-Fi**: Ensure your Mac/PC and phone are on the same Wi-Fi network.
2. **Open Dashboard**: Click the FloatCam icon in your menu bar (macOS) or system tray (Windows).
3. **Scan QR Code**: Open your phone camera and scan the displayed QR code (or type the `https://...:9211` link in Safari/Chrome).
4. **Bypass Local HTTPS Warning**:
   - **iOS Safari**: Tap **Show Details** -> **visit this website** -> **Visit Website**.
   - **Android Chrome**: Tap **Advanced** -> **Proceed to <IP> (unsafe)**.
5. **Tap "Start Camera"**: Allow camera permissions when prompted. Your video feed will appear in the floating window instantly!

---

## 📦 Building Standalone Installers

### macOS DMG Installer
Generates an ad-hoc signed, compressed `.dmg` installer with `/Applications` shortcut:
```bash
npm run build:mac
```
Output: `dist/FloatCam-macOS.dmg`

### Windows x64 Distribution
Generates the portable Windows 64-bit application package and distribution `.zip`:
```bash
npm run build:win
```
Output: `dist/FloatCam-Windows-x64.zip`

For packaging details, see [docs/PACKAGING.md](docs/PACKAGING.md).

---

## 🧪 Testing

FloatCam includes an automated test suite verifying geometric calculations, settings persistence, IP detection, IPC constants, and SSL certificate managers:

```bash
npm test
```

---

## 📚 Documentation Index

- [Architecture & Data Flow](docs/ARCHITECTURE.md)
- [Development Workflow](docs/DEVELOPMENT.md)
- [Packaging & Releases (macOS / Windows)](docs/PACKAGING.md)
- [Security Model & TLS Guide](docs/SECURITY.md)
- [Troubleshooting & Network Checklist](docs/TROUBLESHOOTING.md)

---

## 🤝 Contributing

Contributions are welcome! Please check out [CONTRIBUTING.md](CONTRIBUTING.md) before submitting pull requests.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
