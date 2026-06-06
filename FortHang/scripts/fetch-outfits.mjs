import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { dedupeByName, EXCLUDED_NAMES, hasValidSeason } from './outfit-filters.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(__dirname, '..', 'public', 'outfits.json');
const ICON_DIR = join(__dirname, '..', 'public', 'skin-icons');
const CONCURRENCY = 20;

mkdirSync(ICON_DIR, { recursive: true });

const res = await fetch('https://fortnite-api.com/v2/cosmetics/br');
const json = await res.json();

if (json.status !== 200) {
  console.error('API error:', json);
  process.exit(1);
}

const playable = dedupeByName(json.data
  .filter((item) => item.type?.value === 'outfit' && item.name?.trim())
  .filter((item) => !EXCLUDED_NAMES.has(item.name))
  .filter((item) => /[a-zA-Z]/.test(item.name))
  .filter((item) => hasValidSeason(item.introduction?.season ?? null))
  .map((item) => ({
    id: item.id,
    name: item.name,
    added: item.added ?? null,
    remoteIcon: item.images?.icon ?? item.images?.smallIcon ?? null,
    chapter: item.introduction?.chapter ?? null,
    season: item.introduction?.season ?? null,
    introductionText: item.introduction?.text ?? null,
    setText: item.set?.text ?? null,
    setName: item.set?.value ?? null,
  }))
  .sort((a, b) => {
    const aTime = a.added ? Date.parse(a.added) : Number.MAX_SAFE_INTEGER;
    const bTime = b.added ? Date.parse(b.added) : Number.MAX_SAFE_INTEGER;
    if (aTime !== bTime) return aTime - bTime;
    return a.name.localeCompare(b.name);
  }))
  .map((item, index) => ({
    ...item,
    number: index + 1,
  }));

async function downloadIcon(outfit) {
  const localPath = `/skin-icons/${outfit.number}.png`;
  const filePath = join(ICON_DIR, `${outfit.number}.png`);

  if (!outfit.remoteIcon) {
    return { ...outfit, icon: null };
  }

  try {
    const iconRes = await fetch(outfit.remoteIcon);
    if (!iconRes.ok) {
      return { ...outfit, icon: outfit.remoteIcon };
    }

    const buffer = Buffer.from(await iconRes.arrayBuffer());
    writeFileSync(filePath, buffer);
    return { ...outfit, icon: localPath };
  } catch {
    return { ...outfit, icon: outfit.remoteIcon };
  }
}

async function downloadAllIcons(outfits) {
  const results = [...outfits];
  let completed = 0;

  for (let i = 0; i < outfits.length; i += CONCURRENCY) {
    const batch = outfits.slice(i, i + CONCURRENCY);
    const downloaded = await Promise.all(batch.map(downloadIcon));
    downloaded.forEach((outfit, batchIndex) => {
      results[i + batchIndex] = outfit;
    });
    completed += batch.length;
    console.log(`Downloaded icons: ${completed}/${outfits.length}`);
  }

  return results.map(({ remoteIcon, ...outfit }) => outfit);
}

const outfitsWithIcons = await downloadAllIcons(playable);

writeFileSync(OUT_PATH, JSON.stringify(outfitsWithIcons, null, 2));
console.log(`Saved ${outfitsWithIcons.length} outfits to ${OUT_PATH}`);
