const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT_DIR = path.resolve(__dirname, "..");
const DIST_DIR = path.join(ROOT_DIR, "dist");
const DIST_WIN = path.join(DIST_DIR, "win");
const APP_NAME = "Floating Phone Camera";
const ICO_PATH = path.join(ROOT_DIR, "assets", "Floating-Phone-Camera.ico");
const WIN_APP_DIR = path.join(DIST_WIN, `${APP_NAME}-win32-x64`);
const FINAL_ZIP = path.join(DIST_DIR, "FloatCam-Windows-x64.zip");

console.log("=== Building FloatCam for Windows (x64) ===");

fs.mkdirSync(DIST_WIN, { recursive: true });

if (!fs.existsSync(ICO_PATH)) {
  console.log("Building Windows ICO...");
  execSync("node scripts/build-ico.js", { stdio: "inherit", cwd: ROOT_DIR });
}

console.log("Packaging application for win32 x64...");
const packagerCmd = [
  "npx -y @electron/packager",
  `"${ROOT_DIR}"`,
  `"${APP_NAME}"`,
  "--platform=win32",
  "--arch=x64",
  "--electron-version=32.3.3",
  `--out="${DIST_WIN}"`,
  "--overwrite",
  `--icon="${ICO_PATH}"`,
  "--prune=true",
  "--ignore=\"^/(dist|tests|docs|\\.github|scripts|certs/(.*\\.(pem|key|srl|csr|ext)))\""
].join(" ");

execSync(packagerCmd, { stdio: "inherit", cwd: ROOT_DIR });

const winBat = `@echo off
title Floating Phone Camera
cd /d "%~dp0"
echo ==================================================
echo     Launching Floating Phone Camera (Windows)     
echo ==================================================
start "" "${APP_NAME}.exe"
exit
`;
fs.writeFileSync(path.join(WIN_APP_DIR, "Run-FPC.bat"), winBat);

console.log(`Creating ${FINAL_ZIP}...`);
if (fs.existsSync(FINAL_ZIP)) fs.unlinkSync(FINAL_ZIP);

execSync(`cd "${DIST_WIN}" && zip -r -9 "${FINAL_ZIP}" "${APP_NAME}-win32-x64"`, { stdio: "pipe" });

console.log("=== Windows Build Complete! ===");
console.log("Windows App Directory:", WIN_APP_DIR);
console.log("Windows Executable:", path.join(WIN_APP_DIR, `${APP_NAME}.exe`));
console.log("Windows ZIP Distribution:", FINAL_ZIP);
