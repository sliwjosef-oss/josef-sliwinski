import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '..', 'public');
const OUT_PATH = join(PUBLIC_DIR, 'outfits.json');
const ICON_DIR = join(PUBLIC_DIR, 'skin-icons');
const DEPLOY_ICON_DIR = join(__dirname, '..', '..', 'fort-hang', 'skin-icons');
const CONCURRENCY = 20;

mkdirSync(ICON_DIR, { recursive: true });
mkdirSync(DEPLOY_ICON_DIR, { recursive: true });

function hasValidSeason(season) {
  if (season == null) return false;
  const normalized = String(season).trim();
  if (!normalized) return false;
  if (normalized.toUpperCase() === 'TBD') return false;
  return true;
}

function getIconFileNumber(iconPath) {
  const match = iconPath?.match(/(\d+)\.png$/);
  return match ? Number(match[1]) : null;
}

function mapApiOutfit(item) {
  return {
    id: item.id,
    name: item.name,
    added: item.added ?? null,
    remoteIcon: item.images?.icon ?? item.images?.smallIcon ?? null,
    chapter: item.introduction?.chapter ?? null,
    season: item.introduction?.season ?? null,
    introductionText: item.introduction?.text ?? null,
    setText: item.set?.text ?? null,
    setName: item.set?.value ?? null,
  };
}

const existingOutfits = JSON.parse(readFileSync(OUT_PATH, 'utf8'));
const existingById = new Map(existingOutfits.map((outfit) => [outfit.id, outfit]));

const usedIconNumbers = new Set(
  existingOutfits
    .map((outfit) => getIconFileNumber(outfit.icon))
    .filter((value) => value != null)
);
let nextIconNumber = Math.max(0, ...usedIconNumbers) + 1;

const res = await fetch('https://fortnite-api.com/v2/cosmetics/br');
const json = await res.json();

if (json.status !== 200) {
  console.error('API error:', json);
  process.exit(1);
}

const playable = json.data
  .filter((item) => item.type?.value === 'outfit' && item.name?.trim())
  .filter((item) => item.name !== 'Recruit')
  .filter((item) => item.name !== 'TBD')
  .filter((item) => /[a-zA-Z]/.test(item.name))
  .filter((item) => hasValidSeason(item.introduction?.season ?? null))
  .map(mapApiOutfit)
  .sort((a, b) => {
    const aTime = a.added ? Date.parse(a.added) : Number.MAX_SAFE_INTEGER;
    const bTime = b.added ? Date.parse(b.added) : Number.MAX_SAFE_INTEGER;
    if (aTime !== bTime) return aTime - bTime;
    return a.name.localeCompare(b.name);
  });

async function resolveIcon(outfit) {
  const existing = existingById.get(outfit.id);
  if (existing?.icon) {
    return existing.icon;
  }

  const iconNumber = nextIconNumber;
  nextIconNumber += 1;

  const localPath = `/skin-icons/${iconNumber}.png`;
  const publicFilePath = join(ICON_DIR, `${iconNumber}.png`);
  const deployFilePath = join(DEPLOY_ICON_DIR, `${iconNumber}.png`);

  if (!outfit.remoteIcon) {
    return null;
  }

  try {
    const iconRes = await fetch(outfit.remoteIcon);
    if (!iconRes.ok) {
      return outfit.remoteIcon;
    }

    const buffer = Buffer.from(await iconRes.arrayBuffer());
    writeFileSync(publicFilePath, buffer);
    writeFileSync(deployFilePath, buffer);
    return localPath;
  } catch {
    return outfit.remoteIcon;
  }
}

async function downloadNewIcons(outfits) {
  const results = [...outfits];
  const pendingIndexes = outfits
    .map((outfit, index) => ({ outfit, index }))
    .filter(({ outfit }) => !existingById.get(outfit.id)?.icon);

  for (let i = 0; i < pendingIndexes.length; i += CONCURRENCY) {
    const batch = pendingIndexes.slice(i, i + CONCURRENCY);
    const downloaded = await Promise.all(
      batch.map(async ({ outfit, index }) => ({
        index,
        icon: await resolveIcon(outfit),
      }))
    );

    downloaded.forEach(({ index, icon }) => {
      results[index] = { ...results[index], icon };
    });

    console.log(`Downloaded new icons: ${Math.min(i + CONCURRENCY, pendingIndexes.length)}/${pendingIndexes.length}`);
  }

  return results.map((outfit) => {
    const existing = existingById.get(outfit.id);
    const icon = existing?.icon ?? outfit.icon ?? null;
    const { remoteIcon, ...rest } = outfit;
    return { ...rest, icon };
  });
}

const withIcons = await downloadNewIcons(playable);
const numbered = withIcons.map((outfit, index) => ({
  ...outfit,
  number: index + 1,
}));

writeFileSync(OUT_PATH, JSON.stringify(numbered, null, 2));
writeFileSync(join(__dirname, '..', '..', 'fort-hang', 'outfits.json'), JSON.stringify(numbered, null, 2));

const addedCount = numbered.length - existingOutfits.length;
const addedNames = numbered
  .filter((outfit) => !existingById.has(outfit.id))
  .map((outfit) => outfit.name);

console.log(`Updated outfits: ${existingOutfits.length} -> ${numbered.length}`);
if (addedCount > 0) {
  console.log(`Added ${addedCount} new skin(s):`);
  addedNames.forEach((name) => console.log(`  - ${name}`));
} else {
  console.log('No new skins to add.');
}
