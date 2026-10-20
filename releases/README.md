# FloatCam V3 Releases

Official production release packages for **FloatCam V3 (v3.0.0)**.

---

## 📦 Production Release Artifacts

| File | Target Platform | Description |
|---|---|---|
| **`FloatCam-v3-Portable.exe`** | Windows 10/11 (64-bit) | **Direct Standalone Executable (Zero-Install)**. Single self-contained `.exe` file. Double-click to run immediately without installing or extracting any zip files. |
| **`FloatCam-Setup-v3.exe`** | Windows 10/11 (64-bit) | **Recommended Windows Installer (NSIS)**. Installs all files and runtime DLLs into your computer, creates Desktop & Start Menu shortcuts, and provides clean uninstaller. |
| **`FloatCam-v3.dmg`** | macOS (Apple Silicon & Intel) | **macOS Disk Image Installer**. Drag-and-drop installer with `/Applications` shortcut, Camera/Mic privacy entitlements, ATS local networking flags, and ad-hoc codesigning. |
| **`FloatCam-v3-Windows-x64.zip`** | Windows 10/11 (64-bit) | Unpacked portable application directory with `Run-FloatCam.bat` and all runtime libraries bundled together. |

---

## 🚀 Installation & Launch Guide

### Option 1: Windows Single-File Portable (No Install, No Zip)
1. Download **`FloatCam-v3-Portable.exe`** (or send it directly to any Windows PC).
2. Double-click **`FloatCam-v3-Portable.exe`**.
3. It launches FloatCam immediately! (If Windows SmartScreen prompts "Windows protected your PC", click **More info** &rarr; **Run anyway**).

### Option 2: Windows Setup Installer (Recommended for permanent setup)
1. Download **`FloatCam-Setup-v3.exe`**.
2. Double-click to run the setup wizard and install to your computer.
3. Launch from the created Desktop or Start Menu shortcut.

### Option 3: Windows Portable ZIP Folder
1. Download **`FloatCam-v3-Windows-x64.zip`**.
2. Right-click &rarr; **Extract All...** to a folder.
3. Open the folder and double-click `Run-FloatCam.bat` (or `FloatCam.exe`).
4. *Important: Do not drag `FloatCam.exe` out of that folder by itself.*

---

### macOS Installation

1. Download **`FloatCam-v3.dmg`**.
2. Double-click `FloatCam-v3.dmg` to open the disk image.
3. Drag **FloatCam** into the **Applications** shortcut.
4. Launch **FloatCam** from Launchpad, Applications, or Spotlight (`⌘ + Space` → `FloatCam`).
5. Grant Camera permission when prompted so the floating preview can display your video stream.

---

## 🛡️ Multi-User & LAN Session Isolation (V3)

FloatCam V3 is engineered to run seamlessly across multiple computers and users on the same local network:

1. **Deterministic Dynamic Port Selection (9211–9299)**:
   - Checks port availability on startup. If port `9211` is occupied (e.g., another instance running), it automatically binds to the next available port (`9212`, `9213`, ...).
   - Zero port collisions when multiple users or instances run on the same computer or network.

2. **Per-Session Cryptographic Token Validation**:
   - Every launch generates a cryptographically secure session token (`?s=<token>`) encoded directly into the pairing QR code and URL.
   - The signaling server strictly validates this token on WebSocket connection.
   - Stray phones or other local FloatCam users cannot accidentally cross-connect to your camera feed.

3. **Isolated Per-User Application State**:
   - Certificates, settings, and logs are stored exclusively in the OS user data directory (`%APPDATA%\FloatCam` on Windows, `~/Library/Application Support/FloatCam` on macOS).
   - Multi-user isolation prevents permission conflicts and ensures each user has independent settings.

4. **Pure Cross-Platform Certificate Engine**:
   - Root CA and TLS server certificates are dynamically generated using pure JavaScript (`node-forge`), eliminating external OpenSSL binary dependencies and missing DLL issues on Windows.
