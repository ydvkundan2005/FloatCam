# FloatCam Packaging & Release Guide

## macOS Packaging

FloatCam includes an automated build script for macOS that generates a ready-to-distribute `.dmg` installer:

```bash
npm run build:mac
```

### What the macOS build process does:
1. Runs `@electron/packager` targeting platform `darwin` for the current architecture (`arm64` Apple Silicon or `x64` Intel).
2. Injects `LSUIElement=true` into `Contents/Info.plist` so the app functions seamlessly as a resident menu-bar utility without cluttering the macOS Dock.
3. Sets bundle metadata: `com.floatcam.desktop` in category `public.app-category.utilities`.
4. Applies ad-hoc codesigning (`codesign -s -`).
5. Stages a clean disk image layout containing `Floating Phone Camera.app` and a shortcut to `/Applications`.
6. Uses `hdiutil` to produce an optimized, compressed UDZO `FloatCam-macOS.dmg` inside `dist/`.

---

## Windows Packaging

FloatCam can be packaged for 64-bit Windows environments:

```bash
npm run build:win
```

### What the Windows build process does:
1. Verifies that the multi-size Windows icon (`assets/Floating-Phone-Camera.ico`) is present.
2. Invokes `@electron/packager` for platform `win32` and architecture `x64`.
3. Injects a convenient `Run-FPC.bat` launcher script into the application directory.
4. Compresses the application bundle into `dist/FloatCam-Windows-x64.zip`.

### Windows System Tray Behavior
On Windows, the application docks into the bottom-right Notification Area (System Tray). Clicking the tray icon calculates the taskbar position and opens the control dashboard popup directly above the system tray.

---

## Release Artifacts

All compiled outputs are saved to the `dist/` folder:
- `dist/FloatCam-macOS.dmg`: macOS installer
- `dist/FloatCam-Windows-x64.zip`: Windows standalone distribution
