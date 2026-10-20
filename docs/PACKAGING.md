# FloatCam V3 — Packaging & Release Guide

FloatCam provides production packaging pipelines for macOS and Windows.

---

## 🍎 macOS Packaging

Generates a standalone, compressed disk image (`.dmg`) with `/Applications` drag-and-drop installer:

```bash
npm run build:mac
```

### macOS Pipeline Workflow:
1. Invokes `@electron/packager` for `darwin` (`arm64` Apple Silicon or `x64` Intel) with ASAR enabled.
2. Injects Camera, Microphone, and ATS local networking entitlements into `Info.plist`.
3. Injects high-resolution ICNS icon resources.
4. Applies ad-hoc code signature (`codesign --force --deep -s -`).
5. Stages disk image structure with symlink to `/Applications`.
6. Creates optimized UDZO compressed disk image:
   - Output: `releases/FloatCam-v3.dmg` (and `dist/FloatCam-v3.dmg`)

---

## 🪟 Windows Packaging

Generates a single-file NSIS setup installer and standalone portable archive:

```bash
npm run build:win
```

### Windows Pipeline Workflow:
1. **NSIS Setup Installer (`FloatCam-Setup-v3.exe`)**:
   - Built via `electron-builder --win nsis --x64`.
   - Embeds all runtime DLLs (`ffmpeg.dll`, `d3dcompiler_47.dll`, `vulkan-1.dll`, `libEGL.dll`, `libGLESv2.dll`) and `app.asar`.
   - Creates Desktop & Start Menu shortcuts.
   - Output: `releases/FloatCam-Setup-v3.exe`.
2. **Portable ZIP Distribution (`FloatCam-v3-Windows-x64.zip`)**:
   - Bundles all binaries together with `Run-FloatCam.bat` and `HOW-TO-RUN.txt`.
   - Output: `releases/FloatCam-v3-Windows-x64.zip`.

---

## 📦 Production Release Artifacts

All final releases are located in [`releases/`](../releases/):
- `releases/FloatCam-Setup-v3.exe` (79 MB)
- `releases/FloatCam-v3.dmg` (100 MB)
- `releases/FloatCam-v3-Windows-x64.zip` (112 MB)
