import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATHS = [
  join(__dirname, '..', 'public', 'outfits.json'),
  join(__dirname, '..', '..', 'fort-hang', 'outfits.json'),
];

const outfits = JSON.parse(readFileSync(OUT_PATHS[0], 'utf8'));

const res = await fetch('https://fortnite-api.com/v2/cosmetics/br');
const json = await res.json();

if (json.status !== 200) {
  console.error('API error:', json);
  process.exit(1);
}

const descriptionById = new Map(
  json.data.map((item) => [item.id, item.description?.trim() || null])
);

let updated = 0;
let missing = 0;

const withDescriptions = outfits.map((outfit) => {
  const description = descriptionById.get(outfit.id) ?? null;
  if (!description) {
    missing += 1;
    return { ...outfit, description: null };
  }

  if (outfit.description !== description) {
    updated += 1;
  }

  return { ...outfit, description };
});

for (const outPath of OUT_PATHS) {
  writeFileSync(outPath, JSON.stringify(withDescriptions, null, 2));
}

console.log(`Backfilled descriptions for ${withDescriptions.length} outfits.`);
console.log(`Updated: ${updated}, missing from API: ${missing}`);
