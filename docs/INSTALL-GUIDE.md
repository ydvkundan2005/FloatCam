# FloatCam V3 — User & Installation Guide

**FloatCam** transforms your smartphone into a wireless, floating desktop webcam preview window over local Wi-Fi.

---

## 🚀 Quick Launch & Installation

### Windows 10 / 11 Installation
1. Download **`FloatCam-Setup-v3.exe`** from `releases/`.
2. Double-click the installer wizard.
3. The setup automatically installs the complete application (including `ffmpeg.dll`, `d3dcompiler_47.dll`, and all dependencies) to `%LOCALAPPDATA%\Programs\FloatCam` and creates Desktop & Start Menu shortcuts.
4. Launch FloatCam from your Desktop shortcut or Start Menu.

### macOS Installation
1. Download **`FloatCam-v3.dmg`** from `releases/`.
2. Double-click the DMG to open the disk image.
3. Drag **FloatCam** into the **Applications** folder shortcut.
4. Launch **FloatCam** from Spotlight (`⌘ + Space` → `FloatCam`), Launchpad, or Applications.

---

## 📱 How to Connect Your Phone

1. **Launch FloatCam**: The FloatCam Dashboard will open front-and-center.
2. **Same Wi-Fi**: Verify that your computer and phone are connected to the same Wi-Fi network.
3. **Scan the QR Code**: Open the default Camera app on your iPhone (iOS) or Android device and scan the on-screen QR code.
4. **First-Time Certificate Trust**:
   - **iOS Safari**: Tap **Show Details** → **visit this website** → **Visit Website**.
   - **Android Chrome**: Tap **Advanced** → **Proceed to [IP] (unsafe)**.
   *(Optional zero-warning mode: tap **"Install Root CA Profile"** on the dashboard or phone footer).*
5. **Start Streaming**: Tap **Start Camera** on your phone. Your live video stream will immediately appear in the floating preview window.

---

## 🎛 Features & Controls

### Floating Preview Window
- **Draggable & Resizable**: Click and drag anywhere to reposition. Drag edges or bottom-right corner grip to resize.
- **10 Custom Shapes**: Circle, Squircle, Rounded Rectangle, Hexagon, Heart, Star, Diamond, Octagon, Square, and Standard 16:9 Rectangle.
- **Live Adjustments**: Real-time zoom slider (1.0× to 3.0×), opacity slider (10% to 100%), and quick corner snapping (↖ ↗ ↙ ↘).
- **Dual Camera Support**: Switch between Phone Camera and built-in integrated webcam with one toggle.

### App Dashboard
- **Server Control**: Start / stop local HTTPS signaling server with 1 click.
- **Dynamic Port Selection**: Automatically allocates an open port in range 9211–9299 to prevent collisions.
- **Session Isolation**: Every launch generates a cryptographic session token ensuring other devices cannot cross-connect.
- **Remote Camera Flip**: Flip between the front and rear cameras of your connected phone directly from your desktop.
