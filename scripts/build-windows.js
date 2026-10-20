const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");

const ROOT_DIR = path.resolve(__dirname, "..");
const DIST_DIR = path.join(ROOT_DIR, "dist");
const DIST_WIN = path.join(DIST_DIR, "win");
const DIST_INSTALLER = path.join(DIST_DIR, "installer");
const APP_NAME = "FloatCam";
const ICO_PATH = path.join(ROOT_DIR, "assets", "icon.ico");
const WIN_APP_DIR = path.join(DIST_WIN, `${APP_NAME}-win32-x64`);
const ZIP_NAME = "FloatCam-v3-Windows-x64.zip";
const FINAL_ZIP = path.join(DIST_DIR, ZIP_NAME);
const SETUP_EXE_NAME = "FloatCam-Setup-v3.exe";
const RELEASES_DIR = path.join(ROOT_DIR, "releases");
const NSI_SCRIPT = path.join(ROOT_DIR, "scripts", "installer.nsi");

console.log("=== Building FloatCam V3 for Windows (x64) ===");

fs.mkdirSync(DIST_WIN, { recursive: true });
fs.mkdirSync(DIST_INSTALLER, { recursive: true });
fs.mkdirSync(RELEASES_DIR, { recursive: true });

// 1. Ensure Windows ICO exists
if (!fs.existsSync(ICO_PATH)) {
  console.log("Building Windows ICO...");
  execSync("node scripts/build-ico.js", { stdio: "inherit", cwd: ROOT_DIR });
}

const pkg = require("../package.json");
const electronVer = (pkg.devDependencies && pkg.devDependencies.electron)
  ? pkg.devDependencies.electron.replace(/^[\^~]/, "")
  : "32.3.3";

// 2. Package standalone Windows application directory with electron-packager
console.log("1. Packaging application for win32 x64 with @electron/packager...");
const packagerCmd = [
  "npx -y @electron/packager",
  `"${ROOT_DIR}"`,
  `"${APP_NAME}"`,
  "--platform=win32",
  "--arch=x64",
  `--electron-version=${electronVer}`,
  `--out="${DIST_WIN}"`,
  "--overwrite",
  `--icon="${ICO_PATH}"`,
  "--prune=true",
  "--asar",
  "--ignore=\"dist|releases|tests|docs|\\.github|scripts|certs\""
].join(" ");

execSync(packagerCmd, { stdio: "inherit", cwd: ROOT_DIR });

// Launcher batch script and instructions for portable zip
const winBat = `@echo off
title FloatCam V3
cd /d "%~dp0"
echo ==================================================
echo              Launching FloatCam V3                
echo ==================================================
start "" "${APP_NAME}.exe"
exit
`;
fs.writeFileSync(path.join(WIN_APP_DIR, "Run-FloatCam.bat"), winBat);

const readmeText = `FloatCam V3 - Windows Portable Edition
======================================

HOW TO RUN:
1. Extract ALL files from this ZIP to a folder on your computer.
2. Double-click "Run-FloatCam.bat" (or "${APP_NAME}.exe").
3. IMPORTANT: DO NOT move the .exe file out of this folder!
   It requires the accompanying DLLs (ffmpeg.dll, d3dcompiler_47.dll, etc.) to run.

RECOMMENDED ALTERNATIVE:
If you want an automatic installer that creates Desktop & Start Menu shortcuts,
run "FloatCam-Setup-v3.exe" instead! It installs the complete app with all
dependencies in one click without needing to manage files or DLLs.
`;
fs.writeFileSync(path.join(WIN_APP_DIR, "HOW-TO-RUN.txt"), readmeText);

// 3. Compile standalone NSIS Setup Installer (.exe) directly from the verified win32-x64 build
console.log("2. Compiling native NSIS Setup Installer with makensis...");
function getMakensisPath() {
  if (process.env.MAKENSIS_PATH && fs.existsSync(process.env.MAKENSIS_PATH)) {
    return process.env.MAKENSIS_PATH;
  }
  const brewMakensis = "/opt/homebrew/bin/makensis";
  if (fs.existsSync(brewMakensis)) return brewMakensis;

  const localMakensis = "/usr/local/bin/makensis";
  if (fs.existsSync(localMakensis)) return localMakensis;

  const winX86 = "C:\\Program Files (x86)\\NSIS\\makensis.exe";
  if (fs.existsSync(winX86)) return winX86;

  const winX64 = "C:\\Program Files\\NSIS\\makensis.exe";
  if (fs.existsSync(winX64)) return winX64;

  try {
    execSync("makensis -VERSION", { stdio: "ignore" });
    return "makensis";
  } catch (_) {
    return null;
  }
}

const makensis = getMakensisPath();
if (!makensis) {
  throw new Error("makensis not found! Please install NSIS (e.g. brew install makensis on macOS).");
}

console.log(`Using makensis: ${makensis}`);

// Convert paths to platform-native format for NSIS (always backslashes on Windows)
const nsiRoot = ROOT_DIR.replace(/\//g, '\\');
const nsiAppDir = WIN_APP_DIR.replace(/\//g, '\\');
const nsiOutDir = DIST_INSTALLER.replace(/\//g, '\\');
const nsiIcon = ICO_PATH.replace(/\//g, '\\');

const nsisDefines = [
  `-DROOT_DIR="${nsiRoot}"`,
  `-DAPP_DIR="${nsiAppDir}"`,
  `-DOUT_DIR="${nsiOutDir}"`,
  `-DICON_PATH="${nsiIcon}"`
].join(' ');

execSync(`"${makensis}" ${nsisDefines} "${NSI_SCRIPT}"`, {
  stdio: "inherit",
  cwd: ROOT_DIR
});

const builtSetup = path.join(DIST_INSTALLER, SETUP_EXE_NAME);
if (fs.existsSync(builtSetup)) {
  console.log(`Copying ${SETUP_EXE_NAME} to releases...`);
  fs.copyFileSync(builtSetup, path.join(RELEASES_DIR, SETUP_EXE_NAME));
} else {
  throw new Error(`Expected installer not found at ${builtSetup}`);
}

// 4. Create ZIP distribution from the verified application directory
console.log(`3. Creating ${FINAL_ZIP}...`);
if (fs.existsSync(FINAL_ZIP)) fs.unlinkSync(FINAL_ZIP);

if (process.platform === "win32") {
  execSync(`powershell.exe -NoProfile -NonInteractive -Command "Compress-Archive -Path '${WIN_APP_DIR}' -DestinationPath '${FINAL_ZIP}' -Force"`, { stdio: "inherit" });
} else {
  execSync(`cd "${DIST_WIN}" && zip -r -9 "${FINAL_ZIP}" "${APP_NAME}-win32-x64"`, { stdio: "pipe" });
}

fs.copyFileSync(FINAL_ZIP, path.join(RELEASES_DIR, ZIP_NAME));

console.log("=== Windows V3 Build Complete! ===");
console.log("Setup Installer (releases):", path.join(RELEASES_DIR, SETUP_EXE_NAME));
console.log("Windows ZIP Distribution:", path.join(RELEASES_DIR, ZIP_NAME));
