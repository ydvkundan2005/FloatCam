const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT_DIR = path.resolve(__dirname, "..");
const DIST_DIR = path.join(ROOT_DIR, "dist");
const DIST_MAC = path.join(DIST_DIR, "mac");
const APP_NAME = "Floating Phone Camera";
const DMG_NAME = "FloatCam-macOS.dmg";
const FINAL_DMG = path.join(DIST_DIR, DMG_NAME);
const ICNS_PATH = path.join(ROOT_DIR, "assets", "Floating-Phone-Camera.icns");

console.log("=== Building FloatCam macOS Application & DMG ===");

fs.mkdirSync(DIST_MAC, { recursive: true });

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
  `--icon="${ICNS_PATH}"`,
  "--app-bundle-id=\"com.floatcam.desktop\"",
  "--app-category-type=\"public.app-category.utilities\"",
  "--prune=true",
  "--ignore=\"^/(dist|tests|docs|\\.github|scripts|certs/(.*\\.(pem|key|srl|csr|ext)))\""
].join(" ");

execSync(packagerCmd, { stdio: "inherit", cwd: ROOT_DIR });

const appBundleDir = path.join(DIST_MAC, `${APP_NAME}-darwin-${arch}`);
const appBundle = path.join(appBundleDir, `${APP_NAME}.app`);

if (!fs.existsSync(appBundle)) {
  throw new Error(`Expected application bundle not found at: ${appBundle}`);
}

console.log("2. Configuring Info.plist (LSUIElement, Camera/Mic permissions, ATS)...");
const infoPlistPath = path.join(appBundle, "Contents", "Info.plist");
if (fs.existsSync(infoPlistPath)) {
  let plist = fs.readFileSync(infoPlistPath, "utf8");
  if (!plist.includes("<key>LSUIElement</key>")) {
    plist = plist.replace("<dict>", "<dict>\n    <key>LSUIElement</key>\n    <true/>");
  }
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
  fs.copyFileSync(ICNS_PATH, path.join(resDir, "Floating-Phone-Camera.icns"));
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

if (fs.existsSync(FINAL_DMG)) fs.unlinkSync(FINAL_DMG);

const tempDmg = path.join(DIST_DIR, "temp.dmg");
if (fs.existsSync(tempDmg)) fs.unlinkSync(tempDmg);

execSync(
  `hdiutil create -srcfolder "${stagingDir}" -volname "${APP_NAME}" ` +
  `-fs HFS+ -fsargs "-c c=64,a=16,e=16" -format UDRW -size 400m "${tempDmg}"`,
  { stdio: "pipe" }
);

execSync(`hdiutil convert "${tempDmg}" -format UDZO -imagekey zlib-level=9 -o "${FINAL_DMG}"`, { stdio: "pipe" });

fs.rmSync(stagingDir, { recursive: true, force: true });
if (fs.existsSync(tempDmg)) fs.unlinkSync(tempDmg);

console.log("=== macOS Build Complete! ===");
console.log("Application Bundle:", appBundle);
console.log("DMG Installer:", FINAL_DMG);
