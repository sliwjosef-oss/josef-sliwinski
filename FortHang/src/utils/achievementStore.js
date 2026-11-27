const STORAGE_KEY = 'fort-hang-achievements-v1';

const FLAGS = [
  'trailWin',
  'trailFlawless',
  'carExploded',
  'sweatWipe',
  'infinityBlade',
  'usedBuggyBomb',
  'betWin',
  'betFromLosers',
  'betOnePoint',
  'betSecond',
  'betHardWin',
];

export function defaultAchievementState() {
  return {
    unlocked: [],
    musicIds: [],
    trailRuns: 0,
    bettingRuns: 0,
    weebucksEarned: 0,
    discoveredCount: 0,
    totalSkins: 0,
    seeded: false,
    flags: Object.fromEntries(FLAGS.map((flag) => [flag, false])),
  };
}

function normalize(parsed) {
  const base = defaultAchievementState();
  const flags = { ...base.flags };
  for (const flag of FLAGS) flags[flag] = !!parsed?.flags?.[flag];
  return {
    unlocked: Array.isArray(parsed?.unlocked) ? parsed.unlocked.filter((id) => typeof id === 'string') : [],
    musicIds: Array.isArray(parsed?.musicIds) ? parsed.musicIds.filter((id) => typeof id === 'string') : [],
    trailRuns: Math.max(0, Number(parsed?.trailRuns) || 0),
    bettingRuns: Math.max(0, Number(parsed?.bettingRuns) || 0),
    weebucksEarned: Math.max(0, Number(parsed?.weebucksEarned) || 0),
    discoveredCount: Math.max(0, Number(parsed?.discoveredCount) || 0),
    totalSkins: Math.max(0, Number(parsed?.totalSkins) || 0),
    seeded: !!parsed?.seeded,
    flags,
  };
}

export function loadAchievementState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!parsed || typeof parsed !== 'object') return null;
    return normalize(parsed);
  } catch {
    return null;
  }
}

export function saveAchievementState(state) {
  const next = normalize(state);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function clearAchievementState() {
  localStorage.removeItem(STORAGE_KEY);
}

export function hasAchievement(id) {
  return (loadAchievementState()?.unlocked || []).includes(id);
}

export function unlockedMusicIds() {
  return loadAchievementState()?.musicIds || [];
}

export function addEarnedWeebucks(amount) {
  const gained = Math.max(0, Number(amount) || 0);
  if (!gained) return loadAchievementState() || defaultAchievementState();
  const state = loadAchievementState() || defaultAchievementState();
  state.weebucksEarned += gained;
  return saveAchievementState(state);
}
