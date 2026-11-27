import { getCatalogueSeriesKey } from '../utils/seriesSort';
import { BYE, resolveBracket, roundLabel } from './bracket';

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
  'Freddy Fazbear',
  'Slim Shady',
  'Master Chief',
  'Luke Skywalker',
  'Darth Vader',
  'Optimus Prime',
  'Midas',
  'Renegade Raider',
  'Genos',
  'Bugs Bunny',
  'Jason',
]);

/** Exact catalogue names that always roll 3d100. */
export const THREE_STAR_NAMES = new Set(['Helsie', 'Hope', 'Jonesy The First']);

const ONE_DICE_SERIES = new Set(['other', 'general-collaborations', 'sports']);
const THREE_DICE_SERIES = new Set([
  'dc',
  'icon',
  'other-collab-skins',
  'marvel',
  'gaming-legends',
  'star-wars',
]);
const FOUR_DICE_SERIES = new Set(['tv-legends', 'wwe-legends', 'anime-legends', 'cartoon']);

export function getBaseDiceCount(outfit) {
  if (!outfit) return 1;
  if (outfit.sidekick) {
    if (outfit.sidekickRarity === 'ultra') return 5;
    if (outfit.sidekickRarity === 'rare') return 4;
    return 2;
  }
  if (FIVE_STAR_NAMES.has(String(outfit.name || '').trim())) return 5;
  if (THREE_STAR_NAMES.has(outfit.name)) return 3;
  const series = getCatalogueSeriesKey(outfit);
  if (ONE_DICE_SERIES.has(series)) return 1;
  if (THREE_DICE_SERIES.has(series)) return 3;
  if (FOUR_DICE_SERIES.has(series)) return 4;
  return 2;
}

export function getDiceCount(outfit, bonusById = null) {
  const base = getBaseDiceCount(outfit);
  if (!outfit || !bonusById) return base;
  return base + (Number(bonusById[outfit.id]) || 0);
}

function rollD100() {
  return 1 + Math.floor(Math.random() * 100);
}

/** Roll 1–100. Results under the level floor are discarded and rolled again. */
function rollDie(minRoll) {
  const floor = Math.min(100, Math.max(1, Number(minRoll) || 1));
  let value = rollD100();
  let guard = 0;
  while (value < floor && guard < 1000) {
    value = rollD100();
    guard += 1;
  }
  return value;
}

function rollOnce(diceCount, minRoll = 1) {
  const floor = Math.min(100, Math.max(1, Number(minRoll) || 1));
  const rolls = Array.from({ length: Math.max(1, diceCount) }, () => rollDie(floor));
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

/**
 * Resolve the current ready match; returns null if nothing to play.
 * `extraLifeById` is a mutable map of skinId -> true while a save remains.
 */
export function simulateNextMatch(
  bracket,
  history,
  outfitsById,
  bonusById = null,
  minRollById = null,
  extraLifeById = null,
) {
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

  let winnerSlot = roll.winnerSlot;
  let extraLifeUsed = false;
  let extraLifeSavedId = null;
  const rolledLoserId = winnerSlot === 0 ? idB : idA;
  if (extraLifeById && extraLifeById[rolledLoserId]) {
    winnerSlot = 1 - winnerSlot;
    extraLifeById[rolledLoserId] = false;
    extraLifeUsed = true;
    extraLifeSavedId = rolledLoserId;
  }

  return {
    matchId: match.id,
    winnerSlot,
    winnerId: winnerSlot === 0 ? idA : idB,
    extraLifeUsed,
    extraLifeSavedId,
    roll: {
      matchId: match.id,
      label: roundLabel(bracket, match),
      participants: [idA, idB],
      winnerSlot,
      attempts: roll.attempts,
      sides: roll.sides,
      extraLifeUsed,
      extraLifeSavedId,
    },
  };
}

/**
 * Resolve every remaining match that shares the current round label,
 * walking play order so dependencies unlock as we go.
 */
export function simulateCurrentRound(
  bracket,
  history,
  outfitsById,
  bonusById = null,
  minRollById = null,
  extraLifeById = null,
) {
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

    const step = simulateNextMatch(
      bracket,
      nextHistory,
      outfitsById,
      bonusById,
      minRollById,
      extraLifeById,
    );
    if (!step) break;
    nextHistory = [...nextHistory, [step.matchId, step.winnerSlot]];
    rolls.push(step.roll);
    wins.push({ winnerId: step.winnerId, matchId: step.matchId });
  }

  const end = resolveBracket(bracket, Object.fromEntries(nextHistory));
  return { history: nextHistory, rolls, wins, done: !!end.done };
}

/** Resolve every remaining Round 1 Pools match, then stop. */
export function simulateRound1Pools(
  bracket,
  history,
  outfitsById,
  bonusById = null,
  minRollById = null,
  extraLifeById = null,
) {
  let nextHistory = [...history];
  const rolls = [];
  const wins = [];

  while (true) {
    const state = resolveBracket(bracket, Object.fromEntries(nextHistory));
    if (!state.current || state.done) break;
    const pageIndex = bracket.pageOf.get(state.current.id);
    if (bracket.pages[pageIndex]?.phase !== 'Round 1 Pools') break;

    const step = simulateNextMatch(
      bracket,
      nextHistory,
      outfitsById,
      bonusById,
      minRollById,
      extraLifeById,
    );
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

export function simulateEntireBracket(
  bracket,
  history,
  outfitsById,
  bonusById = null,
  minRollById = null,
  extraLifeById = null,
) {
  let nextHistory = [...history];
  const rolls = [];
  const wins = [];

  while (true) {
    const step = simulateNextMatch(
      bracket,
      nextHistory,
      outfitsById,
      bonusById,
      minRollById,
      extraLifeById,
    );
    if (!step) break;
    nextHistory = [...nextHistory, [step.matchId, step.winnerSlot]];
    rolls.push(step.roll);
    wins.push({ winnerId: step.winnerId, matchId: step.matchId });
  }

  return { history: nextHistory, rolls, wins, done: true };
}

/**
 * Quietly resolve matches across the whole bracket (including later rounds),
 * the same way Simulate round walks play order, until the next ready match
 * involves a bet/super-bet skin — or the bracket ends.
 * Does not resolve that bet match itself. Non-bet matches in the same round
 * as a later bet match are still resolved.
 */
export function simulateUntilBetMatch(
  bracket,
  history,
  outfitsById,
  bonusById = null,
  minRollById = null,
  extraLifeById = null,
  betIds = [],
  superBetIds = [],
) {
  const betSet = new Set(betIds || []);
  const superSet = new Set(superBetIds || []);
  let nextHistory = [...history];
  const rolls = [];
  const wins = [];

  const classify = (participants = []) => {
    const ids = (participants || []).filter((id) => id && id !== BYE);
    if (ids.some((id) => superSet.has(id))) return 'super';
    if (ids.some((id) => betSet.has(id))) return 'bet';
    return null;
  };

  // Round-by-round like Simulate round, but stop before any bet/super-bet match.
  while (true) {
    const state = resolveBracket(bracket, Object.fromEntries(nextHistory));
    if (!state.current || state.done) {
      return { history: nextHistory, rolls, wins, done: true, watchKind: null };
    }

    const firstParticipants = state.outcomes.get(state.current.id)?.participants || [];
    const firstKind = classify(firstParticipants);
    if (firstKind) {
      return {
        history: nextHistory,
        rolls,
        wins,
        done: false,
        watchKind: firstKind,
        participants: firstParticipants,
      };
    }

    const targetLabel = roundLabel(bracket, state.current);
    while (true) {
      const inner = resolveBracket(bracket, Object.fromEntries(nextHistory));
      if (!inner.current || inner.done) {
        return { history: nextHistory, rolls, wins, done: !!inner.done, watchKind: null };
      }
      if (roundLabel(bracket, inner.current) !== targetLabel) break;

      const participants = inner.outcomes.get(inner.current.id)?.participants || [];
      const watchKind = classify(participants);
      if (watchKind) {
        return { history: nextHistory, rolls, wins, done: false, watchKind, participants };
      }

      const step = simulateNextMatch(
        bracket,
        nextHistory,
        outfitsById,
        bonusById,
        minRollById,
        extraLifeById,
      );
      if (!step) {
        return { history: nextHistory, rolls, wins, done: true, watchKind: null };
      }
      nextHistory = [...nextHistory, [step.matchId, step.winnerSlot]];
      rolls.push(step.roll);
      wins.push({ winnerId: step.winnerId, matchId: step.matchId });
    }
  }
}
