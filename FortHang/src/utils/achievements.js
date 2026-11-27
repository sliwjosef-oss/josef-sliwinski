import { ACHIEVEMENTS } from '../achievements/catalog';
import {
  defaultAchievementState,
  loadAchievementState,
  saveAchievementState,
} from './achievementStore';
import {
  addPoints,
  countOwnedSidekickKinds,
  countPermanentShopUpgrades,
  grantSidekickById,
  loadEconomy,
  setDailyGuessBase,
} from './economy';

const LEVEL_FIVE_XP = 1500;
const SKIN_LEVEL_KEY = 'fort-hang-skin-levels-v1';

let checking = false;

function countLevelFive() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SKIN_LEVEL_KEY));
    if (!parsed || typeof parsed !== 'object') return 0;
    return Object.values(parsed).filter((entry) => {
      const level = Number(entry?.level) || 0;
      const xp = Number(entry?.xp) || 0;
      return level >= 5 || xp >= LEVEL_FIVE_XP;
    }).length;
  } catch {
    return 0;
  }
}

function ensureState() {
  let state = loadAchievementState() || defaultAchievementState();
  if (!state.seeded) {
    state.seeded = true;
    state.weebucksEarned = Math.max(state.weebucksEarned, Math.max(0, Number(loadEconomy().points) || 0));
    state = saveAchievementState(state);
  }
  return state;
}

function measure(state, extra = {}) {
  if (Number.isFinite(extra.discoveredCount)) state.discoveredCount = extra.discoveredCount;
  if (Number.isFinite(extra.totalSkins)) state.totalSkins = extra.totalSkins;
  return {
    discovered: state.discoveredCount,
    totalSkins: state.totalSkins,
    levelFive: countLevelFive(),
    shopOwned: countPermanentShopUpgrades(loadEconomy()).owned,
    sidekickKinds: countOwnedSidekickKinds(loadEconomy()),
    weebucks: state.weebucksEarned,
    trailRuns: state.trailRuns,
    bettingRuns: state.bettingRuns,
    flags: state.flags,
  };
}

function currentFor(achievement, stats) {
  if (achievement.kind === 'skins' || achievement.kind === 'skins-all') return stats.discovered;
  if (achievement.kind === 'trail-runs') return stats.trailRuns;
  if (achievement.kind === 'betting-runs') return stats.bettingRuns;
  if (achievement.kind === 'levels') return stats.levelFive;
  if (achievement.kind === 'weebucks') return stats.weebucks;
  if (achievement.kind === 'shop') return stats.shopOwned;
  if (achievement.kind === 'sidekicks') return stats.sidekickKinds;
  return stats.flags[achievement.flag] ? 1 : 0;
}

function targetFor(achievement, stats) {
  if (achievement.kind === 'skins-all') return stats.totalSkins;
  if (achievement.kind === 'flag') return null;
  return achievement.target;
}

function isMet(achievement, stats) {
  if (achievement.kind === 'flag') return !!stats.flags[achievement.flag];
  const target = targetFor(achievement, stats);
  if (!target) return false;
  return currentFor(achievement, stats) >= target;
}

function sidekickReward(sidekicks, name) {
  const target = name.trim().toLowerCase();
  const found = (sidekicks || []).find((sidekick) => sidekick.name.trim().toLowerCase() === target);
  return { id: found?.id || null, icon: found?.icon || null };
}

function applyReward(achievement, economy, sidekicks) {
  const reward = achievement.reward;
  let next = economy;
  let icon = null;
  if (reward.type === 'weebucks') next = addPoints(reward.amount, next);
  if (reward.type === 'sidekick') {
    const match = sidekickReward(sidekicks, reward.name);
    icon = match.icon;
    if (match.id) next = grantSidekickById(match.id, next);
  }
  if (reward.type === 'cap') next = setDailyGuessBase(reward.cap, next);
  return { economy: next, icon };
}

function popupPayload(achievement, icon) {
  return {
    id: achievement.id,
    name: achievement.name,
    rewardText: achievement.rewardText,
    headline: `Achievement unlocked - ${achievement.name} - ${achievement.rewardText}`,
    trackId: achievement.reward.trackId || null,
    icon,
  };
}

export function listAchievementProgress(extra = {}) {
  const state = ensureState();
  const stats = measure(state, extra);
  saveAchievementState(state);
  return ACHIEVEMENTS.map((achievement) => {
    const target = targetFor(achievement, stats);
    const current = currentFor(achievement, stats);
    return {
      ...achievement,
      unlocked: state.unlocked.includes(achievement.id),
      current,
      target,
      showBar: target != null && target > 1,
    };
  });
}

export function checkAchievements(extra = {}) {
  if (checking) return [];
  checking = true;
  try {
    const unlockedNow = [];
    let economy = loadEconomy();
    let guard = 0;
    while (guard < 12) {
      guard += 1;
      const state = ensureState();
      const stats = measure(state, extra);
      const pending = ACHIEVEMENTS.filter(
        (achievement) => !state.unlocked.includes(achievement.id) && isMet(achievement, stats),
      );
      if (!pending.length) {
        saveAchievementState(state);
        break;
      }
      for (const achievement of pending) {
        state.unlocked.push(achievement.id);
        if (achievement.reward.trackId && !state.musicIds.includes(achievement.reward.trackId)) {
          state.musicIds.push(achievement.reward.trackId);
        }
      }
      saveAchievementState(state);
      for (const achievement of pending) {
        const applied = applyReward(achievement, economy, extra.sidekicks);
        economy = applied.economy;
        unlockedNow.push(popupPayload(achievement, applied.icon));
      }
    }
    if (unlockedNow.length) {
      window.dispatchEvent(
        new CustomEvent('forthang-achievements', {
          detail: { unlocked: unlockedNow, economy },
        }),
      );
    }
    return unlockedNow;
  } finally {
    checking = false;
  }
}

export function noteTrailResult(match, extra = {}) {
  const state = ensureState();
  state.trailRuns += 1;
  const party = match?.partyNames || [];
  const survivors = new Set(match?.survivors || []);
  if (match?.won) state.flags.trailWin = true;
  if (match?.won && party.length > 0 && party.every((name) => survivors.has(name))) {
    state.flags.trailFlawless = true;
  }
  if (match?.stats?.carExploded) state.flags.carExploded = true;
  if (match?.stats?.sweatWipe) state.flags.sweatWipe = true;
  if (match?.stats?.infinityBlade) state.flags.infinityBlade = true;
  if (match?.stats?.usedBuggyBomb) state.flags.usedBuggyBomb = true;
  saveAchievementState(state);
  return checkAchievements(extra);
}

export function noteBettingResult({
  rolls = [],
  completed = false,
  hardMode = false,
  championId = null,
  runnerUpId = null,
  fromLosers = false,
  betIds = new Set(),
} = {}, extra = {}) {
  const state = ensureState();
  for (const roll of rolls) {
    const slot = Number(roll?.winnerSlot);
    if (slot !== 0 && slot !== 1) continue;
    const winnerBest = Number(roll?.sides?.[slot]?.best);
    const loserBest = Number(roll?.sides?.[1 - slot]?.best);
    if (!Number.isFinite(winnerBest) || !Number.isFinite(loserBest)) continue;
    if (winnerBest - loserBest !== 1) continue;
    const winnerId = roll?.participants?.[slot];
    if (betIds.has(winnerId)) state.flags.betOnePoint = true;
  }
  if (completed) {
    state.bettingRuns += 1;
    if (championId && betIds.has(championId)) {
      state.flags.betWin = true;
      if (hardMode) state.flags.betHardWin = true;
      if (fromLosers) state.flags.betFromLosers = true;
    }
    if (runnerUpId && betIds.has(runnerUpId)) state.flags.betSecond = true;
  }
  saveAchievementState(state);
  return checkAchievements(extra);
}
