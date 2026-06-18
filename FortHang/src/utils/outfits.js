const EXCLUDED_NAMES = new Set([
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

export function isPlayableOutfitName(name) {
  return name?.trim() && !EXCLUDED_NAMES.has(name);
}

export function hasValidSeason(outfit) {
  const season = outfit.season;
  if (season == null) return false;

  const normalized = String(season).trim();
  if (!normalized) return false;
  if (normalized.toUpperCase() === 'TBD') return false;

  return true;
}

function isDuplicateVariant(id) {
  return /_NPC|_LOD|CINE|ForSwitch|TBD_Athena/i.test(id);
}

function dedupeByName(outfits) {
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

export function getGameOutfits(outfits) {
  return dedupeByName(
    outfits.filter(
      (outfit) =>
        isPlayableOutfitName(outfit.name) &&
        hasValidSeason(outfit) &&
        !isDuplicateVariant(outfit.id)
    )
  );
}

export function resolveAssetPath(path) {
  if (!path) return path;
  if (/^https?:\/\//i.test(path)) return path;

  const base = import.meta.env.BASE_URL;
  const normalized = path.startsWith('/') ? path.slice(1) : path;
  return `${base}${normalized}`;
}

export function getOutfitIconSrc(outfit) {
  if (outfit.icon) return resolveAssetPath(outfit.icon);
  return resolveAssetPath(`skin-icons/${outfit.number}.png`);
}

export function getOutfitIconFallbackSrc(outfit) {
  if (outfit.icon) return null;
  if (outfit.number == null) return null;
  return resolveAssetPath(`skin-icons/${outfit.number}.png`);
}

function getOutfitIconFileName(outfit) {
  const iconPath = outfit.icon ?? `/skin-icons/${outfit.number}.png`;
  const match = String(iconPath).match(/(\d+)\.png$/);
  return match ? `${match[1]}.png` : null;
}

export function getOutfitSilhouetteSrc(outfit) {
  const fileName = getOutfitIconFileName(outfit);
  if (!fileName) return null;
  return resolveAssetPath(`skin-icons-silhouette/${fileName}`);
}
