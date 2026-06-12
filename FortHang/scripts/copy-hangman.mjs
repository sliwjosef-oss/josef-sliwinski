import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SIZE = 500;
const OUTPUT_DIRS = [
  join(__dirname, '..', 'public', 'hangman'),
  join(__dirname, '..', '..', 'fort-hang', 'hangman'),
];
const ASSETS_DIR =
  'C:/Users/sliwj/.cursor/projects/c-Users-sliwj-OneDrive-Documents-website/assets';

const sources = [
  join(__dirname, 'reference-peely.png'),
  ...Array.from({ length: 6 }, (_, i) => join(ASSETS_DIR, `hangman_${i + 1}.png`)),
];

for (let stage = 0; stage < sources.length; stage += 1) {
  const buf = await sharp(sources[stage])
    .resize(SIZE, SIZE, { fit: 'cover', position: 'centre' })
    .png()
    .toBuffer();

  for (const outputDir of OUTPUT_DIRS) {
    writeFileSync(join(outputDir, `hangman_${stage}.png`), buf);
  }

  console.log(`Wrote hangman_${stage}.png`);
}
