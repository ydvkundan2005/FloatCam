# FloatCam Releases (v1.0)

This folder contains pre-built release packages for **FloatCam v1.0**.

---

## 📦 Release Files

| File | Target Platform | Description |
|---|---|---|
| **`FloatCam-v1.0-macOS.dmg`** | macOS (Apple Silicon / arm64) | Standalone disk image installer with `/Applications` shortcut and ad-hoc codesigning. |
| **`FloatCam-v1.0-Windows.exe`** | Windows (64-bit) | Compiled Windows executable binary. |
| **`FloatCam-v1.0-Windows-x64.zip`** | Windows (64-bit) | Complete portable application directory including all Electron runtime libraries and `Run-FPC.bat`. |

---

## 🚀 How to Run

### macOS
1. Double-click `FloatCam-v1.0-macOS.dmg`.
2. Drag **Floating Phone Camera** into your **Applications** folder.
3. Launch from Applications or Spotlight.

### Windows
1. Unzip `FloatCam-v1.0-Windows-x64.zip`.
2. Double-click `Run-FPC.bat` or `Floating Phone Camera.exe`.

---

## ☁️ Publishing to GitHub Releases

To attach these binary installers to your GitHub repository:
1. Push your repository code to GitHub (`git push -u origin main`).
2. Go to your repository on GitHub and click **Releases** &rarr; **Draft a new release**.
3. Set the tag version to **`v1.0.0`** and title to **`FloatCam v1.0`**.
4. Drag and drop the files from this `releases/` folder into the binaries attachment box.
5. Click **Publish release**.
