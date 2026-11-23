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

export function getDiceCount(outfit) {
  if (!outfit) return 1;
  if (FIVE_STAR_NAMES.has(outfit.name)) return 5;
  const series = getCatalogueSeriesKey(outfit);
  if (series === 'other') return 1;
  if (THREE_DICE_SERIES.has(series)) return 3;
  if (FOUR_DICE_SERIES.has(series)) return 4;
  return 2;
}

function rollOnce(diceCount) {
  const rolls = Array.from({ length: Math.max(1, diceCount) }, () => 1 + Math.floor(Math.random() * 100));
  return { rolls, best: Math.max(...rolls), dice: diceCount };
}

/**
 * Each side rolls Nd100 and keeps their highest die.
 * On a tie, both sides re-roll until one best is higher.
 */
export function resolveSimulatedMatch(outfitA, outfitB) {
  const diceA = getDiceCount(outfitA);
  const diceB = getDiceCount(outfitB);
  let attempts = 0;
  let sideA;
  let sideB;

  do {
    attempts += 1;
    sideA = rollOnce(diceA);
    sideB = rollOnce(diceB);
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
export function simulateNextMatch(bracket, history, outfitsById) {
  const state = resolveBracket(bracket, Object.fromEntries(history));
  if (!state.current || state.done) return null;

  const match = state.current;
  const outcome = state.outcomes.get(match.id);
  const [idA, idB] = outcome.participants;
  const roll = resolveSimulatedMatch(outfitsById.get(idA), outfitsById.get(idB));

  return {
    matchId: match.id,
    winnerSlot: roll.winnerSlot,
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
export function simulateCurrentRound(bracket, history, outfitsById) {
  const start = resolveBracket(bracket, Object.fromEntries(history));
  if (!start.current || start.done) {
    return { history, rolls: [], done: !!start.done };
  }

  const targetLabel = roundLabel(bracket, start.current);
  let nextHistory = [...history];
  const rolls = [];

  while (true) {
    const state = resolveBracket(bracket, Object.fromEntries(nextHistory));
    if (!state.current || state.done) break;
    if (roundLabel(bracket, state.current) !== targetLabel) break;

    const step = simulateNextMatch(bracket, nextHistory, outfitsById);
    if (!step) break;
    nextHistory = [...nextHistory, [step.matchId, step.winnerSlot]];
    rolls.push(step.roll);
  }

  const end = resolveBracket(bracket, Object.fromEntries(nextHistory));
  return { history: nextHistory, rolls, done: !!end.done };
}

export function simulateEntireBracket(bracket, history, outfitsById) {
  let nextHistory = [...history];
  const rolls = [];

  while (true) {
    const step = simulateNextMatch(bracket, nextHistory, outfitsById);
    if (!step) break;
    nextHistory = [...nextHistory, [step.matchId, step.winnerSlot]];
    rolls.push(step.roll);
  }

  return { history: nextHistory, rolls, done: true };
}
