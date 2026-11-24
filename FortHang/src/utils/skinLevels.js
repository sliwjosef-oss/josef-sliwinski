const STORAGE_KEY = 'fort-hang-skin-levels-v1';

export const MAX_SKIN_LEVEL = 5;
/**
 * Cumulative XP required to reach each level.
 * Level n costs n × 100 XP: 100, then 200 more (300 total), then 300 more (600 total), and so on.
 */
export const LEVEL_XP_THRESHOLDS = Array.from({ length: MAX_SKIN_LEVEL + 1 }, (_, level) =>
  level === 0 ? 0 : (100 * level * (level + 1)) / 2,
);

export function levelFromXp(xp) {
  const total = Math.max(0, Number(xp) || 0);
  let level = 0;
  for (let next = 1; next <= MAX_SKIN_LEVEL; next += 1) {
    if (total >= LEVEL_XP_THRESHOLDS[next]) level = next;
    else break;
  }
  return level;
}

export function getMinRollForLevel(level) {
  if (level >= 5) return 21;
  if (level >= 3) return 11;
  if (level >= 1) return 6;
  return 1;
}

/** Extra starting HP for Battle Bus Trail squad skins. */
export function getTrailStartHpBonus(level) {
  if (level >= 5) return 20;
  if (level >= 2) return 10;
  return 0;
}

export function getTrailStartHp(levels, skinId) {
  return 100 + getTrailStartHpBonus(getSkinLevel(levels, skinId));
}

/** Fraction of fight damage ignored at this skin level. */
export function getTrailFightDamageResist(level) {
  if (level >= 4) return 0.05;
  return 0;
}

/** Fraction of Storm damage ignored at this skin level. */
export function getTrailStormDamageResist(level) {
  if (level >= 1) return 0.05;
  return 0;
}

export function placementXp(place, superBet = false) {
  const rank = Number(place) || 999;
  let xp = 25;
  if (rank === 1) xp = 200;
  else if (rank >= 2 && rank <= 4) xp = 100;
  else if (rank >= 5 && rank <= 7) xp = 50;
  if (superBet) xp *= 2;
  return xp;
}

export function loadSkinLevels() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!parsed || typeof parsed !== 'object') return {};
    const next = {};
    for (const [id, value] of Object.entries(parsed)) {
      if (typeof id !== 'string') continue;
      const xp = Math.max(0, Number(value?.xp ?? value) || 0);
      next[id] = { xp, level: levelFromXp(xp) };
    }
    return next;
  } catch {
    return {};
  }
}

export function saveSkinLevels(levels) {
  const payload = {};
  for (const [id, entry] of Object.entries(levels || {})) {
    const xp = Math.max(0, Number(entry?.xp) || 0);
    if (xp <= 0) continue;
    payload[id] = { xp, level: levelFromXp(xp) };
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  return levels;
}

export function clearSkinLevels() {
  localStorage.removeItem(STORAGE_KEY);
  return {};
}

export function getSkinXp(levels, skinId) {
  return Math.max(0, Number(levels?.[skinId]?.xp) || 0);
}

export function getSkinLevel(levels, skinId) {
  return levelFromXp(getSkinXp(levels, skinId));
}

/** Highest level first, then catalogue number. */
export function sortOutfitsByLevel(outfits, levels) {
  return [...outfits].sort((a, b) => {
    const levelDiff = getSkinLevel(levels, b.id) - getSkinLevel(levels, a.id);
    if (levelDiff !== 0) return levelDiff;
    return (Number(a.number) || 0) - (Number(b.number) || 0);
  });
}

export function getSkinMinRoll(levels, skinId) {
  return getMinRollForLevel(getSkinLevel(levels, skinId));
}

export function xpProgress(levels, skinId) {
  const xp = getSkinXp(levels, skinId);
  const level = levelFromXp(xp);
  if (level >= MAX_SKIN_LEVEL) {
    return { xp, level, current: LEVEL_XP_THRESHOLDS[MAX_SKIN_LEVEL], next: null, intoLevel: 0, needed: 0 };
  }
  const current = LEVEL_XP_THRESHOLDS[level];
  const next = LEVEL_XP_THRESHOLDS[level + 1];
  return {
    xp,
    level,
    current,
    next,
    intoLevel: xp - current,
    needed: next - current,
  };
}

/**
 * @param {Record<string, {xp:number, level:number}>} levels
 * @param {{ id: string, place: number, superBet?: boolean }[]} awards
 */
export function awardPlacementXp(levels, awards) {
  const next = { ...levels };
  const gained = [];
  for (const award of awards) {
    if (!award?.id || award.place == null) continue;
    const amount = placementXp(award.place, !!award.superBet);
    if (amount <= 0) continue;
    const prevXp = getSkinXp(next, award.id);
    const prevLevel = levelFromXp(prevXp);
    const xp = prevXp + amount;
    const level = levelFromXp(xp);
    next[award.id] = { xp, level };
    gained.push({
      id: award.id,
      amount,
      place: award.place,
      superBet: !!award.superBet,
      prevLevel,
      level,
    });
  }
  saveSkinLevels(next);
  return { levels: next, gained };
}

/**
 * @param {Record<string, {xp:number, level:number}>} levels
 * @param {{ id: string, amount: number }[]} awards
 */
export function awardXpAmounts(levels, awards) {
  const next = { ...levels };
  const gained = [];
  for (const award of awards) {
    if (!award?.id) continue;
    const amount = Math.max(0, Number(award.amount) || 0);
    if (amount <= 0) continue;
    const prevXp = getSkinXp(next, award.id);
    const prevLevel = levelFromXp(prevXp);
    const xp = prevXp + amount;
    const level = levelFromXp(xp);
    next[award.id] = { xp, level };
    gained.push({ id: award.id, amount, prevLevel, level });
  }
  saveSkinLevels(next);
  return { levels: next, gained };
}
