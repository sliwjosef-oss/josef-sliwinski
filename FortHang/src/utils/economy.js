const STORAGE_KEY = 'fort-hang-economy-v1';

export const DAILY_GUESS_BASE = 50;
export const GUESS_PACKS = [
  { id: 'guess-5', amount: 5, cost: 10 },
  { id: 'guess-50', amount: 50, cost: 50 },
  { id: 'guess-125', amount: 125, cost: 100 },
];
/** @deprecated use GUESS_PACKS[0] */
export const GUESS_PACK_COST = GUESS_PACKS[0].cost;
/** @deprecated use GUESS_PACKS[0] */
export const GUESS_PACK_AMOUNT = GUESS_PACKS[0].amount;

export const SIDEKICK_ROLLS = [
  { id: 'sidekick-1', count: 1, cost: 100 },
  { id: 'sidekick-3', count: 3, cost: 200 },
  { id: 'sidekick-5', count: 5, cost: 300 },
];
/** @deprecated use SIDEKICK_ROLLS[0] */
export const SIDEKICK_ROLL_COST = SIDEKICK_ROLLS[0].cost;

export const RARE_ROLL_CHANCE = 0.1;
export const ULTRA_RARE_ROLL_CHANCE = 0.01;

export const BET_WIN_POINTS = 2;
export const MAX_STAR_BETS = 3;
export const MAX_BOOST_BETS = 10;
export const STAR_BET_BONUS_DICE = 4;
export const BOOST_BET_BONUS_DICE = 2;

/** Collab / rare sidekicks (10% roll tier). */
export const RARE_SIDEKICK_NAMES = new Set([
  'Tony Tony Chopper',
  'The Knight',
  'Morgana (P5R)',
  'PAC-MAN',
  'Rush (Mega Man)',
  'Spyro the Dragon',
  'Tails',
  'Patrick Star',
  'SpongeBob SquarePants',
  'Ace the Bat-Hound',
  'Krypto',
  'BDX Droid',
  'Aisha',
  'Dart Monkey',
  'Groot',
  'Towelie',
  'Itchy',
  'Rigby',
  'Peppermint Butler',
  'Toy Story Alien',
  'Super Meat Boy',
  'Dante',
]);

/** Ultra rare sidekicks (1% roll tier). */
export const ULTRA_RARE_SIDEKICK_NAMES = new Set([
  'SpongeBob SquarePants',
  'PAC-MAN',
  'The Knight',
]);

export function getSidekickRarity(sidekick) {
  if (!sidekick) return 'common';
  if (ULTRA_RARE_SIDEKICK_NAMES.has(sidekick.name)) return 'ultra';
  if (RARE_SIDEKICK_NAMES.has(sidekick.name)) return 'rare';
  return 'common';
}

const CST = 'America/Chicago';

function read() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!parsed || typeof parsed !== 'object') return defaultEconomy();
    return {
      points: Math.max(0, Number(parsed.points) || 0),
      ownedSidekickIds: Array.isArray(parsed.ownedSidekickIds)
        ? parsed.ownedSidekickIds.filter((id) => typeof id === 'string')
        : [],
      daily: normalizeDaily(parsed.daily),
      weeklyBets: normalizeWeekly(parsed.weeklyBets),
    };
  } catch {
    return defaultEconomy();
  }
}

function write(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  return state;
}

function defaultEconomy() {
  return {
    points: 0,
    ownedSidekickIds: [],
    daily: { dayKey: guessDayKey(), used: 0, bonus: 0 },
    weeklyBets: { weekKey: cstWeekKey(), usedIds: [] },
  };
}

function normalizeDaily(daily) {
  const dayKey = guessDayKey();
  if (!daily || daily.dayKey !== dayKey) {
    return { dayKey, used: 0, bonus: 0 };
  }
  return {
    dayKey,
    used: Math.max(0, Number(daily.used) || 0),
    bonus: Math.max(0, Number(daily.bonus) || 0),
  };
}

function normalizeWeekly(weekly) {
  const weekKey = cstWeekKey();
  if (!weekly || weekly.weekKey !== weekKey) {
    return { weekKey, usedIds: [] };
  }
  return {
    weekKey,
    usedIds: Array.isArray(weekly.usedIds) ? weekly.usedIds.filter((id) => typeof id === 'string') : [],
  };
}

function chicagoParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CST,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type) => Number(parts.find((part) => part.type === type)?.value);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
}

function formatDayKey(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Instant for a Chicago wall-clock time on a given Chicago calendar date. */
function chicagoWallTimeToUtc(year, month, day, hour = 6, minute = 0, second = 0) {
  let guess = Date.UTC(year, month - 1, day, hour + 6, minute, second);
  for (let i = 0; i < 6; i += 1) {
    const parts = chicagoParts(new Date(guess));
    const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    const want = Date.UTC(year, month - 1, day, hour, minute, second);
    const delta = want - asUtc;
    if (delta === 0) break;
    guess += delta;
  }
  return new Date(guess);
}

/** Calendar date key in America/Chicago (YYYY-MM-DD). */
export function cstDayKey(date = new Date()) {
  const { year, month, day } = chicagoParts(date);
  return formatDayKey(year, month, day);
}

/**
 * Guess-day key in America/Chicago.
 * A new day starts at 6:00 AM CST/CDT — before that, still the previous day.
 */
export function guessDayKey(date = new Date()) {
  const { year, month, day, hour } = chicagoParts(date);
  const cursor = new Date(Date.UTC(year, month - 1, day));
  if (hour < 6) cursor.setUTCDate(cursor.getUTCDate() - 1);
  return formatDayKey(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, cursor.getUTCDate());
}

/** Next daily guess reset (6:00 AM America/Chicago). */
export function getNextGuessResetAt(date = new Date()) {
  const { year, month, day, hour } = chicagoParts(date);
  const cursor = new Date(Date.UTC(year, month - 1, day));
  if (hour >= 6) cursor.setUTCDate(cursor.getUTCDate() + 1);
  return chicagoWallTimeToUtc(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, cursor.getUTCDate(), 6, 0, 0);
}

export function getMsUntilGuessReset(date = new Date()) {
  return Math.max(0, getNextGuessResetAt(date).getTime() - date.getTime());
}

export function formatCountdown(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Monday 00:00 CST week key (YYYY-MM-DD of that Monday).
 * Betting locks reset each Monday morning in Chicago time.
 */
export function cstWeekKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CST,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value;
  const year = Number(get('year'));
  const month = Number(get('month'));
  const day = Number(get('day'));
  const weekday = get('weekday');
  const weekdayIndex = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[weekday] ?? 1;
  // Days since Monday (Mon=0 … Sun=6)
  const sinceMonday = (weekdayIndex + 6) % 7;
  const monday = new Date(Date.UTC(year, month - 1, day));
  monday.setUTCDate(monday.getUTCDate() - sinceMonday);
  const y = monday.getUTCFullYear();
  const m = String(monday.getUTCMonth() + 1).padStart(2, '0');
  const d = String(monday.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function loadEconomy() {
  const state = read();
  state.daily = normalizeDaily(state.daily);
  state.weeklyBets = normalizeWeekly(state.weeklyBets);
  return write(state);
}

export function getDailyGuessLimit(economy = loadEconomy()) {
  const fresh = { ...economy, daily: normalizeDaily(economy.daily) };
  return DAILY_GUESS_BASE + fresh.daily.bonus;
}

export function getDailyGuessesRemaining(economy = loadEconomy()) {
  const fresh = { ...economy, daily: normalizeDaily(economy.daily) };
  return Math.max(0, getDailyGuessLimit(fresh) - fresh.daily.used);
}

export function canSpendGuess(economy = loadEconomy()) {
  return getDailyGuessesRemaining(economy) > 0;
}

export function spendGuess(economy = loadEconomy()) {
  const state = {
    ...economy,
    daily: normalizeDaily(economy.daily),
    weeklyBets: normalizeWeekly(economy.weeklyBets),
  };
  if (state.daily.used >= getDailyGuessLimit(state)) return { ok: false, economy: state };
  state.daily = { ...state.daily, used: state.daily.used + 1 };
  return { ok: true, economy: write(state) };
}

export function addPoints(amount, economy = loadEconomy()) {
  const state = {
    ...economy,
    points: Math.max(0, (Number(economy.points) || 0) + amount),
    daily: normalizeDaily(economy.daily),
    weeklyBets: normalizeWeekly(economy.weeklyBets),
  };
  return write(state);
}

export function buyGuessPack(economy = loadEconomy(), pack = GUESS_PACKS[0]) {
  const state = {
    ...economy,
    daily: normalizeDaily(economy.daily),
    weeklyBets: normalizeWeekly(economy.weeklyBets),
  };
  const cost = Number(pack?.cost) || 0;
  const amount = Number(pack?.amount) || 0;
  if (!cost || !amount) {
    return { ok: false, reason: 'Invalid guess pack.', economy: state };
  }
  if (state.points < cost) {
    return { ok: false, reason: `Need ${cost} weebucks.`, economy: state };
  }
  state.points -= cost;
  state.daily = { ...state.daily, bonus: state.daily.bonus + amount };
  return { ok: true, economy: write(state), amount };
}

function pickFromPool(pool) {
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

function rollOneSidekick(sidekicks) {
  const ultraPool = sidekicks.filter((sidekick) => ULTRA_RARE_SIDEKICK_NAMES.has(sidekick.name));
  const rarePool = sidekicks.filter((sidekick) => RARE_SIDEKICK_NAMES.has(sidekick.name));
  const commonPool = sidekicks.filter((sidekick) => !RARE_SIDEKICK_NAMES.has(sidekick.name));

  const roll = Math.random();
  let rarity = 'common';
  let pick = null;

  if (roll < ULTRA_RARE_ROLL_CHANCE) {
    pick = pickFromPool(ultraPool);
    rarity = 'ultra';
  } else if (roll < ULTRA_RARE_ROLL_CHANCE + RARE_ROLL_CHANCE) {
    pick = pickFromPool(rarePool);
    rarity = 'rare';
  }

  if (!pick) {
    pick = pickFromPool(commonPool) ?? pickFromPool(sidekicks);
    rarity = pick ? getSidekickRarity(pick) : 'common';
  }

  return pick ? { sidekick: pick, rarity } : null;
}

/**
 * Roll one or more sidekicks. Duplicates are allowed and counted.
 * Each roll: 1% ultra rare, 10% rare, otherwise common.
 */
export function rollRandomSidekick(sidekicks, economy = loadEconomy(), options = {}) {
  const count = Math.max(1, Number(options.count) || 1);
  const cost = Number(options.cost) || SIDEKICK_ROLLS.find((pack) => pack.count === count)?.cost || count * 100;
  const state = {
    ...economy,
    ownedSidekickIds: [...(economy.ownedSidekickIds || [])],
    daily: normalizeDaily(economy.daily),
    weeklyBets: normalizeWeekly(economy.weeklyBets),
  };
  if (!sidekicks.length) {
    return { ok: false, reason: 'No sidekicks available.', economy: state };
  }
  if (state.points < cost) {
    return { ok: false, reason: `Need ${cost} weebucks.`, economy: state };
  }

  const results = [];
  for (let i = 0; i < count; i += 1) {
    const rolled = rollOneSidekick(sidekicks);
    if (!rolled) break;
    const alreadyOwned = state.ownedSidekickIds.includes(rolled.sidekick.id);
    state.ownedSidekickIds.push(rolled.sidekick.id);
    results.push({
      sidekick: rolled.sidekick,
      rarity: rolled.rarity,
      duplicate: alreadyOwned,
    });
  }

  if (!results.length) {
    return { ok: false, reason: 'Could not roll a sidekick.', economy: state };
  }

  state.points -= cost;
  return {
    ok: true,
    sidekick: results[0].sidekick,
    results,
    economy: write(state),
  };
}

export function isSidekickOwned(economy, sidekickId) {
  return (economy.ownedSidekickIds || []).includes(sidekickId);
}

/** Remap legacy `sidekick-*` ids onto current Fortnite API companion ids. */
export function migrateOwnedSidekickIds(ownedIds, sidekicks) {
  if (!Array.isArray(ownedIds) || !sidekicks?.length) return ownedIds || [];
  const byId = new Set(sidekicks.map((sidekick) => sidekick.id));
  const byName = new Map(
    sidekicks.map((sidekick) => [String(sidekick.name).trim().toLowerCase(), sidekick.id]),
  );

  return ownedIds.map((id) => {
    if (byId.has(id)) return id;
    const slug = String(id)
      .replace(/^sidekick-/i, '')
      .replace(/-/g, ' ')
      .trim()
      .toLowerCase();
    if (byName.has(slug)) return byName.get(slug);
    for (const [name, nextId] of byName) {
      if (name.includes(slug) || slug.includes(name)) return nextId;
    }
    return id;
  });
}

export function getSidekickCount(economy, sidekickId) {
  return (economy.ownedSidekickIds || []).filter((id) => id === sidekickId).length;
}

export function countOwnedSidekickKinds(economy) {
  return new Set(economy.ownedSidekickIds || []).size;
}

export function getLockedBetIds(economy = loadEconomy()) {
  const weekly = normalizeWeekly(economy.weeklyBets);
  return new Set(weekly.usedIds);
}

export function isBetSkinLocked(skinId, economy = loadEconomy()) {
  return getLockedBetIds(economy).has(skinId);
}

/** Lock bet skins until next Monday CST after a betting sim starts. */
export function lockBetSkins(skinIds, economy = loadEconomy()) {
  const state = {
    ...economy,
    daily: normalizeDaily(economy.daily),
    weeklyBets: normalizeWeekly(economy.weeklyBets),
  };
  const used = new Set(state.weeklyBets.usedIds);
  for (const id of skinIds) {
    if (id) used.add(id);
  }
  state.weeklyBets = { weekKey: state.weeklyBets.weekKey, usedIds: [...used] };
  return write(state);
}

export function nextMondayLabel() {
  const weekKey = cstWeekKey();
  const [y, m, d] = weekKey.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 7));
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(next);
}
