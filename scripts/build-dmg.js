const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT_DIR = path.resolve(__dirname, "..");
const DIST_DIR = path.join(ROOT_DIR, "dist");
const DIST_MAC = path.join(DIST_DIR, "mac");
const APP_NAME = "FloatCam";
const DMG_NAME = "FloatCam-v3.dmg";
const FINAL_DMG = path.join(DIST_DIR, DMG_NAME);
const ICNS_PATH = path.join(ROOT_DIR, "assets", "icon.icns");
const RELEASES_DIR = path.join(ROOT_DIR, "releases");

console.log("=== Building FloatCam V3 macOS Application & DMG ===");

fs.mkdirSync(DIST_MAC, { recursive: true });
fs.mkdirSync(RELEASES_DIR, { recursive: true });

const arch = process.arch || "arm64";
console.log(`1. Packaging application with electron-packager for darwin (${arch})...`);

const packagerCmd = [
  "npx -y @electron/packager",
  `"${ROOT_DIR}"`,
  `"${APP_NAME}"`,
  "--platform=darwin",
  `--arch=${arch}`,
  "--electron-version=32.3.3",
  `--out="${DIST_MAC}"`,
  "--overwrite",
  "--asar",
  `--icon="${ICNS_PATH}"`,
  "--app-bundle-id=\"com.floatcam.desktop\"",
  "--app-category-type=\"public.app-category.utilities\"",
  "--prune=true",
  "--ignore=\"dist|releases|tests|docs|\\.github|scripts|certs\""
].join(" ");

execSync(packagerCmd, { stdio: "inherit", cwd: ROOT_DIR });

const appBundleDir = path.join(DIST_MAC, `${APP_NAME}-darwin-${arch}`);
const appBundle = path.join(appBundleDir, `${APP_NAME}.app`);

if (!fs.existsSync(appBundle)) {
  throw new Error(`Expected application bundle not found at: ${appBundle}`);
}

console.log("2. Configuring Info.plist (Camera/Mic permissions, ATS)...");
const infoPlistPath = path.join(appBundle, "Contents", "Info.plist");
if (fs.existsSync(infoPlistPath)) {
  let plist = fs.readFileSync(infoPlistPath, "utf8");
  // Ensure LSUIElement is false or removed so Dock icon and window dashboard appear
  plist = plist.replace(/<key>LSUIElement<\/key>\s*<true\/>/g, "<key>LSUIElement</key>\n    <false/>");
  if (!plist.includes("<key>NSCameraUsageDescription</key>")) {
    plist = plist.replace("<dict>", "<dict>\n    <key>NSCameraUsageDescription</key>\n    <string>FloatCam needs camera access for floating preview.</string>");
  }
  if (!plist.includes("<key>NSMicrophoneUsageDescription</key>")) {
    plist = plist.replace("<dict>", "<dict>\n    <key>NSMicrophoneUsageDescription</key>\n    <string>FloatCam microphone access.</string>");
  }
  if (!plist.includes("<key>NSAppTransportSecurity</key>")) {
    plist = plist.replace("<dict>", "<dict>\n    <key>NSAppTransportSecurity</key>\n    <dict>\n      <key>NSAllowsArbitraryLoads</key>\n      <true/>\n      <key>NSAllowsLocalNetworking</key>\n      <true/>\n    </dict>");
  }
  fs.writeFileSync(infoPlistPath, plist);
}

console.log("2b. Injecting application icons into Resources/...");
const resDir = path.join(appBundle, "Contents", "Resources");
if (fs.existsSync(ICNS_PATH)) {
  fs.copyFileSync(ICNS_PATH, path.join(resDir, "electron.icns"));
  fs.copyFileSync(ICNS_PATH, path.join(resDir, `${APP_NAME}.icns`));
}

console.log("3. Applying ad-hoc codesign...");
try {
  execSync(`codesign --force --deep -s - "${appBundle}"`, { stdio: "inherit" });
} catch (e) {
  console.warn("   Codesign notice:", e.message);
}

console.log(`4. Generating DMG installer: ${DMG_NAME}...`);
const stagingDir = path.join(DIST_DIR, "dmg-staging");
if (fs.existsSync(stagingDir)) fs.rmSync(stagingDir, { recursive: true, force: true });
fs.mkdirSync(stagingDir, { recursive: true });

execSync(`cp -a "${appBundle}" "${stagingDir}/"`);
execSync(`ln -s /Applications "${path.join(stagingDir, "Applications")}"`);

try {
  execSync('hdiutil detach "/Volumes/FloatCam" -force 2>/dev/null || true');
  execSync('hdiutil detach "/Volumes/FloatCam V3" -force 2>/dev/null || true');
  execSync('hdiutil detach "/Volumes/FloatCam 2.0" -force 2>/dev/null || true');
} catch (_) {}

if (fs.existsSync(FINAL_DMG)) fs.unlinkSync(FINAL_DMG);

execSync(
  `hdiutil create -srcfolder "${stagingDir}" -volname "FloatCam" ` +
  `-format UDZO -imagekey zlib-level=9 -ov "${FINAL_DMG}"`,
  { stdio: "inherit" }
);

fs.rmSync(stagingDir, { recursive: true, force: true });

fs.copyFileSync(FINAL_DMG, path.join(RELEASES_DIR, DMG_NAME));

console.log("=== macOS V3 Build Complete! ===");
console.log("Application Bundle:", appBundle);
console.log("DMG Installer (dist):", FINAL_DMG);
console.log("DMG Installer (releases):", path.join(RELEASES_DIR, DMG_NAME));
