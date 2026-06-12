import { mkdirSync } from 'fs';
import { dirname } from 'path';
import sharp from 'sharp';

const ALPHA_THRESHOLD = 16;

export async function createSilhouette(inputPath, outputPath) {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = Buffer.alloc(data.length);

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > ALPHA_THRESHOLD) {
      pixels[i] = 0;
      pixels[i + 1] = 0;
      pixels[i + 2] = 0;
      pixels[i + 3] = 255;
    } else {
      pixels[i] = 0;
      pixels[i + 1] = 0;
      pixels[i + 2] = 0;
      pixels[i + 3] = 0;
    }
  }

  mkdirSync(dirname(outputPath), { recursive: true });

  await sharp(pixels, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  })
    .png()
    .toFile(outputPath);
}

export function getSilhouettePathForIcon(iconPath) {
  const match = String(iconPath ?? '').match(/skin-icons\/(\d+)\.png$/);
  if (!match) return null;
  return `/skin-icons-silhouette/${match[1]}.png`;
}
