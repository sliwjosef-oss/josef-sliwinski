const STORAGE_KEY = 'fort-hang-guessed-skins';

export function loadGuessedSkinIds() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveGuessedSkinIds(ids) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export function clearGuessedSkinIds() {
  localStorage.removeItem(STORAGE_KEY);
  return [];
}

export function normalizeGuessedSkinIds(guessedIds, outfits) {
  const discoveredIds = new Set();

  for (const entry of guessedIds) {
    if (typeof entry === 'number') {
      const outfit = outfits.find((item) => item.number === entry);
      if (outfit) discoveredIds.add(outfit.id);
      continue;
    }

    if (typeof entry === 'string' && outfits.some((item) => item.id === entry)) {
      discoveredIds.add(entry);
    }
  }

  return [...discoveredIds];
}

export function addGuessedSkinId(ids, skinId) {
  if (!skinId || ids.includes(skinId)) return ids;
  const next = [...ids, skinId];
  saveGuessedSkinIds(next);
  return next;
}

export function isSkinGuessed(guessedIds, outfit) {
  return guessedIds.includes(outfit.id);
}

export function countDiscoveredSkins(outfits, guessedIds) {
  return outfits.filter((outfit) => isSkinGuessed(guessedIds, outfit)).length;
}

export function isSeasonComplete(outfits, guessedIds) {
  return outfits.length > 0 && outfits.every((outfit) => isSkinGuessed(guessedIds, outfit));
}
