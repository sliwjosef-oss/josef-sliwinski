import { getCatalogueSeriesKey } from '../utils/seriesSort';
import { resolveBracket, roundLabel } from './bracket';

/** Exact catalogue names that always roll 5d100. */
export const FIVE_STAR_NAMES = new Set([
  'Peter Griffin',
  'Spider-Man',
  'Peely',
  'Son Goku',
  'Naruto Uzumaki',
  'Monkey D. Luffy',
  'Homer Simpson',
  'Hatsune Miku',
  'John Cena',
  'Batman (Pen & Ink)',
  'Sonic the Hedgehog',
]);

const THREE_DICE_SERIES = new Set(['dc', 'icon', 'other-collab-skins', 'marvel', 'gaming-legends']);
const FOUR_DICE_SERIES = new Set(['tv-legends', 'wwe-legends', 'anime-legends', 'cartoon']);

export function getBaseDiceCount(outfit) {
  if (!outfit) return 1;
  if (FIVE_STAR_NAMES.has(outfit.name)) return 5;
  const series = getCatalogueSeriesKey(outfit);
  if (series === 'other') return 1;
  if (THREE_DICE_SERIES.has(series)) return 3;
  if (FOUR_DICE_SERIES.has(series)) return 4;
  return 2;
}

export function getDiceCount(outfit, bonusById = null) {
  const base = getBaseDiceCount(outfit);
  if (!outfit || !bonusById) return base;
  return base + (Number(bonusById[outfit.id]) || 0);
}

function rollOnce(diceCount, minRoll = 1) {
  const floor = Math.min(100, Math.max(1, Number(minRoll) || 1));
  const span = 100 - floor + 1;
  const rolls = Array.from(
    { length: Math.max(1, diceCount) },
    () => floor + Math.floor(Math.random() * span),
  );
  return { rolls, best: Math.max(...rolls), dice: diceCount, minRoll: floor };
}

/**
 * Each side rolls Nd100 and keeps their highest die.
 * On a tie, both sides re-roll until one best is higher.
 */
export function resolveSimulatedMatch(outfitA, outfitB, bonusById = null, minRollById = null) {
  const diceA = getDiceCount(outfitA, bonusById);
  const diceB = getDiceCount(outfitB, bonusById);
  const minA = outfitA && minRollById ? Number(minRollById[outfitA.id]) || 1 : 1;
  const minB = outfitB && minRollById ? Number(minRollById[outfitB.id]) || 1 : 1;
  let attempts = 0;
  let sideA;
  let sideB;

  do {
    attempts += 1;
    sideA = rollOnce(diceA, minA);
    sideB = rollOnce(diceB, minB);
  } while (sideA.best === sideB.best && attempts < 100);

  let winnerSlot = sideA.best > sideB.best ? 0 : 1;
  if (sideA.best === sideB.best) {
    winnerSlot = Math.random() < 0.5 ? 0 : 1;
  }

  return {
    winnerSlot,
    attempts,
    sides: [sideA, sideB],
  };
}

/** Resolve the current ready match; returns null if nothing to play. */
export function simulateNextMatch(bracket, history, outfitsById, bonusById = null, minRollById = null) {
  const state = resolveBracket(bracket, Object.fromEntries(history));
  if (!state.current || state.done) return null;

  const match = state.current;
  const outcome = state.outcomes.get(match.id);
  const [idA, idB] = outcome.participants;
  const roll = resolveSimulatedMatch(
    outfitsById.get(idA),
    outfitsById.get(idB),
    bonusById,
    minRollById,
  );

  return {
    matchId: match.id,
    winnerSlot: roll.winnerSlot,
    winnerId: roll.winnerSlot === 0 ? idA : idB,
    roll: {
      matchId: match.id,
      label: roundLabel(bracket, match),
      participants: [idA, idB],
      winnerSlot: roll.winnerSlot,
      attempts: roll.attempts,
      sides: roll.sides,
    },
  };
}

/**
 * Resolve every remaining match that shares the current round label,
 * walking play order so dependencies unlock as we go.
 */
export function simulateCurrentRound(bracket, history, outfitsById, bonusById = null, minRollById = null) {
  const start = resolveBracket(bracket, Object.fromEntries(history));
  if (!start.current || start.done) {
    return { history, rolls: [], wins: [], done: !!start.done };
  }

  const targetLabel = roundLabel(bracket, start.current);
  let nextHistory = [...history];
  const rolls = [];
  const wins = [];

  while (true) {
    const state = resolveBracket(bracket, Object.fromEntries(nextHistory));
    if (!state.current || state.done) break;
    if (roundLabel(bracket, state.current) !== targetLabel) break;

    const step = simulateNextMatch(bracket, nextHistory, outfitsById, bonusById, minRollById);
    if (!step) break;
    nextHistory = [...nextHistory, [step.matchId, step.winnerSlot]];
    rolls.push(step.roll);
    wins.push({ winnerId: step.winnerId, matchId: step.matchId });
  }

  const end = resolveBracket(bracket, Object.fromEntries(nextHistory));
  return { history: nextHistory, rolls, wins, done: !!end.done };
}

/** Resolve every remaining Round 1 Pools match, then stop. */
export function simulateRound1Pools(bracket, history, outfitsById, bonusById = null, minRollById = null) {
  let nextHistory = [...history];
  const rolls = [];
  const wins = [];

  while (true) {
    const state = resolveBracket(bracket, Object.fromEntries(nextHistory));
    if (!state.current || state.done) break;
    const pageIndex = bracket.pageOf.get(state.current.id);
    if (bracket.pages[pageIndex]?.phase !== 'Round 1 Pools') break;

    const step = simulateNextMatch(bracket, nextHistory, outfitsById, bonusById, minRollById);
    if (!step) break;
    nextHistory = [...nextHistory, [step.matchId, step.winnerSlot]];
    rolls.push(step.roll);
    wins.push({ winnerId: step.winnerId, matchId: step.matchId });
  }

  const end = resolveBracket(bracket, Object.fromEntries(nextHistory));
  return { history: nextHistory, rolls, wins, done: !!end.done };
}

export function hasRound1PoolsPending(bracket, history) {
  const state = resolveBracket(bracket, Object.fromEntries(history));
  if (!state.current || state.done) return false;
  const pageIndex = bracket.pageOf.get(state.current.id);
  return bracket.pages[pageIndex]?.phase === 'Round 1 Pools';
}

export function simulateEntireBracket(bracket, history, outfitsById, bonusById = null, minRollById = null) {
  let nextHistory = [...history];
  const rolls = [];
  const wins = [];

  while (true) {
    const step = simulateNextMatch(bracket, nextHistory, outfitsById, bonusById, minRollById);
    if (!step) break;
    nextHistory = [...nextHistory, [step.matchId, step.winnerSlot]];
    rolls.push(step.roll);
    wins.push({ winnerId: step.winnerId, matchId: step.matchId });
  }

  return { history: nextHistory, rolls, wins, done: true };
}
