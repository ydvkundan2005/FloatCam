# Contributing to FloatCam

Thank you for your interest in contributing to **FloatCam**! This document provides guidelines and instructions for contributing.

---

## 🛠️ Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/username/FloatCam.git
   cd FloatCam
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run in development mode**:
   ```bash
   npm start
   ```

4. **Run unit tests**:
   ```bash
   npm test
   ```

---

## 🏗️ Architecture Guidelines

- **Zero Cloud Dependencies**: Video streaming is strictly point-to-point via WebRTC over the local Wi-Fi / LAN. Never introduce external relay or telemetry services without opt-in consensus.
- **Lightweight Footprint**: Avoid heavy dependencies. Keep Electron bundle size and CPU/memory utilization minimal.
- **Cross-Platform Compatibility**: Ensure features work predictably on macOS (menu bar, transparency, always-on-top) and Windows (system tray, acrylic/dark frame).

---

## 🧪 Testing Checklist

Before submitting a pull request:
- [ ] Run `npm test` to ensure all unit tests pass.
- [ ] Verify both the menu bar / system tray popover and the floating camera window appear correctly.
- [ ] Verify that opening the phone URL on a mobile device streams video smoothly without audio echo or lag.
- [ ] Confirm no secrets, private keys, or generated files are staged (`git status`).

---

## 📦 Pull Request Process

1. Create a feature branch from `main` (`git checkout -b feature/my-new-feature`).
2. Commit your changes with clear, descriptive commit messages.
3. Push to your branch and open a Pull Request.
4. Describe the problem your change solves and include test instructions.
