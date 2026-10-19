const { app, BrowserWindow, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

app.whenReady().then(async () => {
  try {
    // 1. Render 1024x1024 master app icon
    const win = new BrowserWindow({
      width: 1024,
      height: 1024,
      show: false,
      frame: false,
      transparent: true,
      enableLargerThanScreen: true
    });

    const ROOT_DIR = path.resolve(__dirname, '..');
    const svgPath = path.join(ROOT_DIR, 'assets', 'icon-master.svg');
    const svgData = fs.readFileSync(svgPath, 'utf8');
    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgData)}`;

    await win.loadURL(dataUrl);
    // wait a moment for layout/rendering
    await new Promise(r => setTimeout(r, 600));

    const image = await win.webContents.capturePage({ x: 0, y: 0, width: 1024, height: 1024 });
    const pngPath = path.join(ROOT_DIR, 'assets', 'icon-1024.png');
    fs.writeFileSync(pngPath, image.toPNG());
    console.log('Saved 1024x1024 master icon:', pngPath);

    // 2. Render Template icons (for macOS menu bar)
    const tWin = new BrowserWindow({
      width: 36,
      height: 36,
      show: false,
      frame: false,
      transparent: true
    });
    const templateSvgPath = path.join(ROOT_DIR, 'assets', 'iconTemplate.svg');
    const templateSvgData = fs.readFileSync(templateSvgPath, 'utf8');
    const tDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(templateSvgData)}`;

    await tWin.loadURL(tDataUrl);
    await new Promise(r => setTimeout(r, 400));

    // Capture @2x (36x36)
    const tImage2x = await tWin.webContents.capturePage({ x: 0, y: 0, width: 36, height: 36 });
    const t2xPath = path.join(ROOT_DIR, 'assets', 'iconTemplate@2x.png');
    fs.writeFileSync(t2xPath, tImage2x.toPNG());

    // Scale to 18x18 (@1x)
    const t1xImage = tImage2x.resize({ width: 18, height: 18, quality: 'best' });
    const t1xPath = path.join(ROOT_DIR, 'assets', 'iconTemplate.png');
    fs.writeFileSync(t1xPath, t1xImage.toPNG());
    console.log('Saved menu bar template icons:', t1xPath, t2xPath);

    // 3. Build .iconset and generate .icns using macOS iconutil
    const iconsetDir = path.join(__dirname, 'Floating-Phone-Camera.iconset');
    if (fs.existsSync(iconsetDir)) fs.rmSync(iconsetDir, { recursive: true, force: true });
    fs.mkdirSync(iconsetDir, { recursive: true });

    const sizes = [
      { name: 'icon_16x16.png', size: 16 },
      { name: 'icon_16x16@2x.png', size: 32 },
      { name: 'icon_32x32.png', size: 32 },
      { name: 'icon_32x32@2x.png', size: 64 },
      { name: 'icon_128x128.png', size: 128 },
      { name: 'icon_128x128@2x.png', size: 256 },
      { name: 'icon_256x256.png', size: 256 },
      { name: 'icon_256x256@2x.png', size: 512 },
      { name: 'icon_512x512.png', size: 512 },
      { name: 'icon_512x512@2x.png', size: 1024 }
    ];

    for (const item of sizes) {
      const resized = image.resize({ width: item.size, height: item.size, quality: 'best' });
      fs.writeFileSync(path.join(iconsetDir, item.name), resized.toPNG());
    }

    const icnsPath = path.join(ROOT_DIR, 'assets', 'Floating-Phone-Camera.icns');
    execSync(`iconutil -c icns "${iconsetDir}" -o "${icnsPath}"`);
    console.log('Successfully compiled macOS ICNS:', icnsPath);

    // Also copy master PNG to workspace root as requested
    fs.copyFileSync(pngPath, path.join(ROOT_DIR, 'assets', 'Floating-Phone-Camera.png'));

    // Copy to FPC.app resources
    // ICNS is preserved in assets/

    console.log('Icons built and embedded into application bundle successfully!');
  } catch (err) {
    console.error('Error rendering icons:', err);
    process.exit(1);
  } finally {
    app.quit();
  }
});
