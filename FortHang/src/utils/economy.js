const STORAGE_KEY = 'fort-hang-economy-v1';

export const DAILY_GUESS_BASE = 50;
export const GUESS_PACK_COST = 10;
export const GUESS_PACK_AMOUNT = 5;
export const SIDEKICK_ROLL_COST = 100;
export const BET_WIN_POINTS = 2;
export const MAX_STAR_BETS = 3;
export const MAX_BOOST_BETS = 10;
export const STAR_BET_BONUS_DICE = 4;
export const BOOST_BET_BONUS_DICE = 2;

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

export function buyGuessPack(economy = loadEconomy()) {
  const state = {
    ...economy,
    daily: normalizeDaily(economy.daily),
    weeklyBets: normalizeWeekly(economy.weeklyBets),
  };
  if (state.points < GUESS_PACK_COST) {
    return { ok: false, reason: `Need ${GUESS_PACK_COST} points.`, economy: state };
  }
  state.points -= GUESS_PACK_COST;
  state.daily = { ...state.daily, bonus: state.daily.bonus + GUESS_PACK_AMOUNT };
  return { ok: true, economy: write(state) };
}

export function rollRandomSidekick(sidekicks, economy = loadEconomy()) {
  const state = {
    ...economy,
    ownedSidekickIds: [...(economy.ownedSidekickIds || [])],
    daily: normalizeDaily(economy.daily),
    weeklyBets: normalizeWeekly(economy.weeklyBets),
  };
  if (state.points < SIDEKICK_ROLL_COST) {
    return { ok: false, reason: `Need ${SIDEKICK_ROLL_COST} points.`, economy: state };
  }
  const owned = new Set(state.ownedSidekickIds);
  const pool = sidekicks.filter((sidekick) => !owned.has(sidekick.id));
  if (pool.length === 0) {
    return { ok: false, reason: 'You already own every sidekick.', economy: state };
  }
  const pick = pool[Math.floor(Math.random() * pool.length)];
  state.points -= SIDEKICK_ROLL_COST;
  state.ownedSidekickIds.push(pick.id);
  return { ok: true, sidekick: pick, economy: write(state) };
}

export function isSidekickOwned(economy, sidekickId) {
  return (economy.ownedSidekickIds || []).includes(sidekickId);
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
