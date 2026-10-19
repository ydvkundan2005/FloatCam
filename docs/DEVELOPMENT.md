# FloatCam Development Guide

## Prerequisites

- **Node.js**: v18.0.0 or later (v20+ recommended)
- **npm**: v9.0.0 or later
- **OpenSSL / LibreSSL**: Included by default on macOS and Linux; standard on Windows via Git Bash.

---

## Getting Started

1. **Clone the repository**:
   ```bash
   git clone https://github.com/username/FloatCam.git
   cd FloatCam
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the application in development mode**:
   ```bash
   npm start
   ```

---

## Available Scripts

| Command | Description |
|---|---|
| `npm start` | Launches FloatCam using the local Electron runtime |
| `npm test` | Runs the unit test suite using Node.js built-in test runner |
| `npm run cert` | Generates local development SSL certificates in `certs/` |
| `npm run build:mac` | Packages macOS application and generates `FloatCam-macOS.dmg` |
| `npm run build:win` | Packages Windows x64 executable and produces distribution ZIP |
| `npm run build:ico` | Compiles high-resolution multi-size Windows `.ico` file |
| `npm run build:assets` | Re-renders SVG master vector assets into PNGs and iconsets |

---

## Project Structure

```
FloatCam/
├── .github/workflows/    # CI/CD automation pipelines
├── assets/               # Application icons (.icns, .ico, .png, .svg)
├── certs/                # Auto-generated local TLS certificates (.gitignored)
├── docs/                 # In-depth architectural & deployment guides
├── lib/                  # Backend Node.js modules (signaling, certs, IP, settings)
├── phone/                # Static web client served to mobile phones
├── renderer/             # Electron renderer windows (receiver & control dashboard)
├── shared/               # Shared constants (IPC channels, geometric shapes)
├── scripts/              # Build, asset rendering, and release scripts
├── tests/                # Automated unit tests
├── main.js               # Electron main process entry point
├── preload-control.js    # Secure context bridge for control dashboard
├── preload-receiver.js   # Secure context bridge for floating preview
├── package.json          # Dependency definitions and lifecycle scripts
└── README.md             # Project overview and quick start guide
```
