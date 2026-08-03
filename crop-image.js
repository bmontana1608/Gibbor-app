const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, 'public/landing/mobile-identity.jpg');
const outputPath = path.join(__dirname, 'public/landing/mobile-identity.jpg');

async function cropImage() {
  try {
    const metadata = await sharp(inputPath).metadata();
    const width = metadata.width;
    const height = metadata.height;
    
    // We want the right 55% of the image
    const cropWidth = Math.floor(width * 0.55);
    const leftOffset = width - cropWidth;
    
    // We can't overwrite the same file directly using sharp, so we write to a temp file then rename
    const tempPath = path.join(__dirname, 'public/landing/mobile-identity-temp.jpg');
    
    await sharp(inputPath)
      .extract({ left: leftOffset, top: 0, width: cropWidth, height: height })
      .toFile(tempPath);
      
    fs.renameSync(tempPath, inputPath);
    console.log('Image cropped successfully!');
  } catch (err) {
    console.error('Error cropping image:', err);
  }
}

cropImage();
