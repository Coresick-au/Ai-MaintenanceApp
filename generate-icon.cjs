const Jimp = require('jimp');
const path = require('path');
const fs = require('fs');

console.log('Jimp object:', Jimp);

async function generatePlaceholderIcon() {
  const iconPath = path.join(__dirname, 'public', 'icons', 'icon.png');
  const iconDir = path.dirname(iconPath);

  // Ensure the directory exists
  if (!fs.existsSync(iconDir)) {
    fs.mkdirSync(iconDir, { recursive: true });
  }

  // Create a 256x256 image with a blue background and a white "M"
  const image = await new Jimp.Jimp(256, 256, 0x3b82f6ff); // Blue background
  const font = await Jimp.loadFont(Jimp.FONT_SANS_128_WHITE); // White font

  image.print(font, 0, 0, {
    text: 'M',
    alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
    alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
  }, image.bitmap.width, image.bitmap.height);

  await image.writeAsync(iconPath);
  console.log(`Placeholder icon generated at: ${iconPath}`);

  // Now convert to .ico if electron-builder requires it explicitly
  // This step might require another library, so for now, we'll try with PNG.
  // If electron-builder fails with PNG, we'll reconsider converting to ICO.
}

generatePlaceholderIcon().catch(console.error);
