const { app, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(() => {
  try {
    const ROOT_DIR = path.resolve(__dirname, '..');
    const pngPath = fs.existsSync(path.join(ROOT_DIR, 'assets', 'icon-1024.png')) ? path.join(ROOT_DIR, 'assets', 'icon-1024.png') : path.join(ROOT_DIR, 'assets', 'icon.png');
    const img = nativeImage.createFromPath(pngPath);

    const sizes = [16, 24, 32, 48, 64, 128, 256];
    const pngBuffers = sizes.map(size => {
      const resized = img.resize({ width: size, height: size, quality: 'best' });
      return {
        size,
        buffer: resized.toPNG()
      };
    });

    // Build standard Windows .ico binary
    // Header: 6 bytes
    // Directory: 16 bytes per image
    // Data: concatenated PNG buffers
    const numImages = pngBuffers.length;
    const headerSize = 6;
    const dirSize = 16 * numImages;
    let currentOffset = headerSize + dirSize;

    const header = Buffer.alloc(headerSize);
    header.writeUInt16LE(0, 0); // Reserved
    header.writeUInt16LE(1, 2); // Type 1 = ICO
    header.writeUInt16LE(numImages, 4);

    const dirEntries = [];
    for (const item of pngBuffers) {
      const entry = Buffer.alloc(16);
      entry.writeUInt8(item.size >= 256 ? 0 : item.size, 0); // Width
      entry.writeUInt8(item.size >= 256 ? 0 : item.size, 1); // Height
      entry.writeUInt8(0, 2); // Colors
      entry.writeUInt8(0, 3); // Reserved
      entry.writeUInt16LE(1, 4); // Planes
      entry.writeUInt16LE(32, 6); // Bit count
      entry.writeUInt32LE(item.buffer.length, 8); // Size of image data
      entry.writeUInt32LE(currentOffset, 12); // Offset of image data
      dirEntries.push(entry);
      currentOffset += item.buffer.length;
    }

    const icoBuffer = Buffer.concat([
      header,
      ...dirEntries,
      ...pngBuffers.map(p => p.buffer)
    ]);

    const outPath = path.join(ROOT_DIR, 'assets', 'Floating-Phone-Camera.ico');
    fs.writeFileSync(outPath, icoBuffer);
    console.log('Successfully created Windows ICO:', outPath, 'Bytes:', icoBuffer.length);

    // Also put into src/assets/icon.ico
    fs.writeFileSync(path.join(ROOT_DIR, 'assets', 'icon.ico'), icoBuffer);
  } catch (err) {
    console.error('Failed to create ICO:', err);
    process.exit(1);
  } finally {
    app.quit();
  }
});
