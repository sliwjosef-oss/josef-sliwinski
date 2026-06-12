import { readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createSilhouette } from './silhouette.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ICON_DIRS = [
  join(__dirname, '..', 'public', 'skin-icons'),
  join(__dirname, '..', '..', 'fort-hang', 'skin-icons'),
];
const SILHOUETTE_DIRS = [
  join(__dirname, '..', 'public', 'skin-icons-silhouette'),
  join(__dirname, '..', '..', 'fort-hang', 'skin-icons-silhouette'),
];

const CONCURRENCY = 40;
const sourceDir = ICON_DIRS.find((dir) => existsSync(dir));

if (!sourceDir) {
  console.error('No skin-icons directory found.');
  process.exit(1);
}

const iconFiles = readdirSync(sourceDir).filter((file) => file.endsWith('.png'));
let completed = 0;
let failed = 0;

async function processIcon(fileName) {
  const inputPath = join(sourceDir, fileName);

  try {
    await Promise.all(
      SILHOUETTE_DIRS.map((outputDir) =>
        createSilhouette(inputPath, join(outputDir, fileName))
      )
    );
    completed += 1;
  } catch (error) {
    failed += 1;
    console.error(`Failed ${fileName}:`, error.message);
  }
}

for (let i = 0; i < iconFiles.length; i += CONCURRENCY) {
  const batch = iconFiles.slice(i, i + CONCURRENCY);
  await Promise.all(batch.map(processIcon));
  console.log(`Silhouettes: ${Math.min(i + CONCURRENCY, iconFiles.length)}/${iconFiles.length}`);
}

console.log(`Done. Created ${completed} silhouettes${failed ? `, ${failed} failed` : ''}.`);
