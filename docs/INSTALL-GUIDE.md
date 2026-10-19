# Floating Phone Camera (FPC) — User & Installation Guide

**Floating Phone Camera** transforms your smartphone into a wireless, floating webcam preview window on your Mac over local Wi-Fi.

---

## 🚀 Quick Launch

You have three convenient ways to launch Floating Phone Camera:

1. **One-Click Launch:**
   Double-click [Floating-Phone-Camera.command](file:///Users/kundanprasadyadav/Project/floating%20Camera/Floating-Phone-Camera.command).
2. **From Terminal:**
   ```bash
   open "/Users/kundanprasadyadav/Project/floating Camera/Floating Phone Camera.app"
   ```
3. **Install to Applications via DMG:**
   Double-click [Floating-Phone-Camera-macOS.dmg](file:///Users/kundanprasadyadav/Project/floating%20Camera/Floating-Phone-Camera-macOS.dmg), drag **Floating Phone Camera** into your **Applications** folder shortcut, and launch it anytime from Spotlight or Launchpad.

---

## 📱 How to Connect Your Phone

1. **Start FPC on your Mac:**
   The camera icon will appear in your top macOS menu bar.
2. **Open Dashboard:**
   Click the menu bar camera icon to open the dashboard popover.
3. **Scan the QR Code:**
   Open the Camera app on your iPhone or Android phone and scan the prominent QR code displayed on the dashboard.
   *(Alternatively, type the HTTPS address shown, e.g., `https://10.70.8.137:9211/`)*
4. **First-Time Certificate Trust:**
   Because the local HTTPS certificate is generated directly on your Mac for security:
   - **iOS Safari:** Tap **Show Details** → **visit this website** → **Visit Website**.
   - **Android Chrome:** Tap **Advanced** → **Proceed to [IP] (unsafe)**.
   *(Optional zero-warning mode: tap the **"Install Root CA Profile"** button in the dashboard or phone footer to trust the local CA profile directly).*
5. **Start Streaming:**
   Tap **Start Camera** on your phone and allow camera permission. Within seconds, your live video feed will appear in the floating preview window on your Mac.

---

## 🎛 Features & Controls

### Floating Preview Window
- **Draggable & Resizable:** Click and drag anywhere to move. Drag edges or bottom-right corner grip to resize.
- **Custom Shapes:** Circle, Squircle, Rounded Rectangle, Hexagon, Heart, Star, Diamond, Octagon, Square, Rectangle.
- **Live Adjustments:** Zoom slider (1.0× to 3.0×), opacity slider (10% to 100%), and quick corner snapping (↖ ↗ ↙ ↘).
- **Dual Camera Support:** Switch between Phone Camera and built-in Mac FaceTime webcam directly from the dashboard!

### Menu-Bar Dashboard
- **Server Control:** Start / stop local HTTPS server with 1 click.
- **Network Interface Selection:** Automatically discovers active Wi-Fi and Ethernet interfaces, updating the certificate and QR code dynamically.
- **Device Management:** Shows connected devices with individual disconnect controls.
- **Help & SSL Tab:** Step-by-step connection guides for iOS Safari, Android Chrome, and certificate renewal.

---

## 🛠 Troubleshooting

| Issue | Resolution |
|---|---|
| **App blocked by macOS Gatekeeper** | Right-click `Floating Phone Camera.app` in Finder, choose **Open**, and click **Open**. Or run: `xattr -cr "Floating Phone Camera.app"` |
| **Phone shows "Waiting for phone..."** | Verify both Mac and Phone are connected to the same Wi-Fi network. Corporate/Guest networks with client isolation block local device-to-device streaming. |
| **Port 9211 in use** | If another service is holding port 9211, stop it or toggle the server button off and on in the dashboard. |
| **Camera permission denied on phone** | **Safari:** Tap address bar `aA` → Website Settings → Camera → Allow. <br/> **Chrome:** Tap address bar lock icon → Permissions → Camera → Allow. |

---

## 📁 Deliverable Files & Locations

- **Installer DMG:** [Floating-Phone-Camera-macOS.dmg](file:///Users/kundanprasadyadav/Project/floating%20Camera/Floating-Phone-Camera-macOS.dmg)
- **Application Bundle:** [Floating Phone Camera.app](file:///Users/kundanprasadyadav/Project/floating%20Camera/Floating%20Phone%20Camera.app)
- **Executable Launcher:** [Floating-Phone-Camera.command](file:///Users/kundanprasadyadav/Project/floating%20Camera/Floating-Phone-Camera.command)
- **Launcher Text Guide:** [Run-FPC.txt](file:///Users/kundanprasadyadav/Project/floating%20Camera/Run-FPC.txt)
- **Application Icon (.icns):** [Floating-Phone-Camera.icns](file:///Users/kundanprasadyadav/Project/floating%20Camera/Floating-Phone-Camera.icns)
- **Master Icon Asset (.png):** [Floating-Phone-Camera.png](file:///Users/kundanprasadyadav/Project/floating%20Camera/Floating-Phone-Camera.png)
- **Full Source Tree:** [src/](file:///Users/kundanprasadyadav/Project/floating%20Camera/src/)
