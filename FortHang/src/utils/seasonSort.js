const SEASON_ORDER = [
  { chapter: '1', season: '1' },
  { chapter: '1', season: '2' },
  { chapter: '1', season: '3' },
  { chapter: '1', season: '4' },
  { chapter: '1', season: '5' },
  { chapter: '1', season: '6' },
  { chapter: '1', season: '7' },
  { chapter: '1', season: '8' },
  { chapter: '1', season: '9' },
  { chapter: '1', season: 'X' },
  { chapter: '2', season: '1' },
  { chapter: '2', season: '2' },
  { chapter: '2', season: '3' },
  { chapter: '2', season: '4' },
  { chapter: '2', season: '5' },
  { chapter: '2', season: '6' },
  { chapter: '2', season: '7' },
  { chapter: '2', season: '8' },
  { chapter: '3', season: '1' },
  { chapter: '3', season: '2' },
  { chapter: '3', season: '3' },
  { chapter: '3', season: '4' },
  { chapter: '4', season: '1' },
  { chapter: '4', season: '2' },
  { chapter: '4', season: '3' },
  { chapter: '4', season: '4' },
  { chapter: '4', season: 'OG' },
  { chapter: '5', season: '1' },
  { chapter: '5', season: '2' },
  { chapter: '5', season: '3' },
  { chapter: '5', season: '4' },
  { chapter: 'Remix', season: 'Remix', label: 'Chapter 5 · REMIX' },
  { chapter: '6', season: '1', label: 'Chapter 6 · Season 1' },
  { chapter: '6', season: '2', label: 'Chapter 6 · Season 2' },
  { chapter: '6', season: '3', label: 'Chapter 6 · Season MS1' },
  { chapter: '6', season: '4', label: 'Chapter 6 · Season 3' },
  { chapter: '6', season: '5', label: 'Chapter 6 · Season 4' },
  { chapter: '6', season: '6', label: 'Chapter 6 · Season MS2' },
  { chapter: '7', season: '1' },
  { chapter: '7', season: '2' },
  { chapter: '7', season: '3' },
];

const SEASON_ORDER_INDEX = new Map(
  SEASON_ORDER.map((entry, index) => [`${entry.chapter}|${entry.season}`, index])
);

const SEASON_LABELS = new Map(
  SEASON_ORDER.filter((entry) => entry.label).map((entry) => [`${entry.chapter}|${entry.season}`, entry.label])
);

const REMIX_SORT_INDEX = SEASON_ORDER_INDEX.get('Remix|Remix');

function isRemixSeason(season) {
  return String(season ?? '').trim().toLowerCase() === 'remix';
}

function fallbackSeasonOrder(season) {
  const normalized = String(season ?? '').trim();
  if (/^\d+$/.test(normalized)) return parseInt(normalized, 10);
  if (normalized.toUpperCase() === 'X') return 10;
  return 100;
}

export function getSeasonSortIndex(chapter, season) {
  if (isRemixSeason(season)) return REMIX_SORT_INDEX;

  const chapterKey = String(chapter ?? '').trim();
  const seasonKey = String(season ?? '').trim();
  const canonicalKey = `${chapterKey}|${seasonKey}`;
  const canonicalIndex = SEASON_ORDER_INDEX.get(canonicalKey);

  if (canonicalIndex != null) return canonicalIndex;

  const chapterNum = parseInt(chapterKey, 10) || 99;
  return 10000 + chapterNum * 100 + fallbackSeasonOrder(seasonKey);
}

export function formatSeasonLabel(chapter, season) {
  if (isRemixSeason(season)) return SEASON_LABELS.get('Remix|Remix') ?? 'Chapter 5 · REMIX';

  const chapterKey = String(chapter ?? '').trim();
  const seasonKey = String(season ?? '').trim();
  const customLabel = SEASON_LABELS.get(`${chapterKey}|${seasonKey}`);
  if (customLabel) return customLabel;

  const chapterLabel = chapterKey || '?';
  const seasonLabel = seasonKey || '?';
  return `Chapter ${chapterLabel} · Season ${seasonLabel}`;
}

function getSeasonGroupKey(chapter, season) {
  if (isRemixSeason(season)) return 'Remix|Remix';
  return `${chapter}|${season}`;
}

export function compareBySeason(a, b) {
  const seasonDiff =
    getSeasonSortIndex(a.chapter, a.season) - getSeasonSortIndex(b.chapter, b.season);

  if (seasonDiff !== 0) return seasonDiff;
  return a.number - b.number;
}

export function sortOutfitsByNumber(outfits) {
  return [...outfits].sort((a, b) => a.number - b.number);
}

export function sortOutfitsAlphabetically(outfits) {
  return [...outfits].sort((a, b) => {
    const nameDiff = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    if (nameDiff !== 0) return nameDiff;
    return a.number - b.number;
  });
}

export function groupOutfitsBySeason(outfits) {
  const groups = new Map();

  for (const outfit of outfits) {
    const key = getSeasonGroupKey(outfit.chapter, outfit.season);
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        chapter: isRemixSeason(outfit.season) ? 'Remix' : outfit.chapter,
        season: outfit.season,
        label: formatSeasonLabel(outfit.chapter, outfit.season),
        outfits: [],
      });
    }
    groups.get(key).outfits.push(outfit);
  }

  return [...groups.values()]
    .sort((a, b) => compareBySeason(
      { chapter: a.chapter, season: a.season, number: 0 },
      { chapter: b.chapter, season: b.season, number: 0 }
    ))
    .map((group) => ({
      ...group,
      outfits: sortOutfitsByNumber(group.outfits),
    }));
}
