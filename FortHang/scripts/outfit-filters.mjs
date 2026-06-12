/** API entries missing introduction metadata — patched to match their release batch. */
export const INTRODUCTION_PATCHES = {
  Character_StairGummy: {
    chapter: '7',
    season: '2',
    introductionText: 'Introduced in Chapter 7, Season 2.',
  },
  Character_TigerRootFame: {
    chapter: '4',
    season: '2',
    introductionText: 'Introduced in Chapter 4, Season 2.',
  },
  Character_TigerRootHype: {
    chapter: '4',
    season: '2',
    introductionText: 'Introduced in Chapter 4, Season 2.',
  },
};

export function getIntroductionFields(item) {
  const patch = INTRODUCTION_PATCHES[item.id];
  const chapter = patch?.chapter ?? item.introduction?.chapter ?? null;
  const season = patch?.season ?? item.introduction?.season ?? null;
  const introductionText =
    patch?.introductionText ??
    item.introduction?.text ??
    (chapter && season ? `Introduced in Chapter ${chapter}, Season ${season}.` : null);

  return { chapter, season, introductionText };
}

export const EXCLUDED_NAMES = new Set([
  'Recruit',
  'TBD',
  'Set_01_LA_SG',
  'Set_01_OA',
  'Set_01_OA_SG',
  'Set_01_PA',
  'Set_01_TA_SG',
  'PERF OPTIMIZED',
  'Marauder',
  'Marauder Heavy',
  'Doombot Agent',
  'Marauder Elite',
  'null',
  'Random',
]);

export function hasValidSeason(season) {
  if (season == null) return false;
  const normalized = String(season).trim();
  if (!normalized) return false;
  if (normalized.toUpperCase() === 'TBD') return false;
  return true;
}

export function isDuplicateVariant(id) {
  return /_NPC|_LOD|CINE|ForSwitch|TBD_Athena/i.test(id);
}

export function dedupeByName(outfits) {
  const byName = new Map();

  for (const outfit of outfits) {
    const existing = byName.get(outfit.name);
    if (!existing) {
      byName.set(outfit.name, outfit);
      continue;
    }

    const existingIsDup = isDuplicateVariant(existing.id);
    const currentIsDup = isDuplicateVariant(outfit.id);

    if (existingIsDup && !currentIsDup) {
      byName.set(outfit.name, outfit);
      continue;
    }

    if (!existingIsDup && currentIsDup) {
      continue;
    }

    const existingTime = existing.added ? Date.parse(existing.added) : Number.MAX_SAFE_INTEGER;
    const currentTime = outfit.added ? Date.parse(outfit.added) : Number.MAX_SAFE_INTEGER;
    if (currentTime < existingTime) {
      byName.set(outfit.name, outfit);
    }
  }

  return [...byName.values()];
}
