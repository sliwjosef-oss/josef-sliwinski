const STORAGE_KEY = 'fort-hang-economy-v1';

export const DAILY_GUESS_BASE = 50;
export const GUESS_PACKS = [
  { id: 'guess-5', amount: 5, cost: 100 },
  { id: 'guess-50', amount: 50, cost: 500 },
  { id: 'guess-125', amount: 125, cost: 1000 },
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

export const BET_WIN_POINTS = 4;
export const TOURNAMENT_WIN_POINTS = 60;
/** Extra weebucks on every match/tournament payout for super bet skins. */
export const SUPER_BET_ROUND_BONUS = 2;
export const TOP8_REWARD_TIER1 = 10;
export const TOP8_REWARD_TIER2 = 20;
export const TOP8_REWARD_TIER3 = 40;
export const TOP64_REWARD_TIER1 = 6;
export const TOP64_REWARD_TIER2 = 10;
export const TOP64_REWARD_TIER3 = 20;
export const TOURNAMENT_WIN_REWARD_TIER1 = 200;
export const TOURNAMENT_WIN_REWARD_TIER2 = 400;
export const CATALOG_COMPLETE_BONUS = 10000;
/** Weebucks granted once per guess-day (6:00 AM Central) when the player opens the game. */
export const DAILY_LOGIN_BONUS = 100;
export const BASE_DAILY_BET_RUNS = 3;
export const BASE_DAILY_TRAIL_RUNS = 3;
export const DAILY_TRAIL_RUNS_TIER1 = 5;
export const DAILY_TRAIL_RUNS_TIER2 = 7;
/** Previous betting free default before base dropped to 3. */
const LEGACY_DAILY_BET_RUNS_BASE = 5;
/** Previous max daily runs before the cap was lowered to 7. */
const LEGACY_DAILY_RUNS_TIER2 = 10;
export const TRAIL_SURVIVOR_PAYOUT = 100;
export const TRAIL_SURVIVOR_PAYOUT_TIER1 = 150;
export const TRAIL_FALLEN_PAYOUT = 50;
export const TRAIL_FALLEN_PAYOUT_TIER1 = 75;
export const TRAIL_SURVIVOR_XP = 200;
export const TRAIL_FALLEN_XP = 100;
export const DAILY_BET_RUNS_TIER1 = 5;
export const DAILY_BET_RUNS_TIER2 = 7;
export const BASE_STAR_BETS = 1;
export const STAR_BETS_TIER1 = 3;
export const STAR_BETS_TIER2 = 7;
/** Previous max before the tier-2 cap was raised to 7. */
const LEGACY_STAR_BETS_TIER2 = 5;
export const BASE_BOOST_BETS = 5;
export const BOOST_BETS_TIER1 = 10;
export const BOOST_BETS_TIER2 = 20;
/** @deprecated use getMaxStarBets(economy) */
export const MAX_STAR_BETS = STAR_BETS_TIER2;
/** @deprecated use getMaxBoostBets(economy) */
export const MAX_BOOST_BETS = BOOST_BETS_TIER2;
export const STAR_BET_BONUS_DICE = 4;
export const BOOST_BET_BONUS_DICE = 2;
export const STAR_BET_BONUS_DICE_UPGRADED = 5;
export const BOOST_BET_BONUS_DICE_UPGRADED = 3;

export const SHOP_UNLOCKS = {
  simulateAll: { id: 'simulateAll', cost: 5000, label: 'Unlock Simulate all', blurb: 'Unlock the Simulate all button in Betting.' },
  top8Tier1: {
    id: 'top8Tier1',
    cost: 50,
    reward: TOP8_REWARD_TIER1,
    label: `Top 8 wins → ${TOP8_REWARD_TIER1} weebucks`,
    blurb: `Raise Top 8 bet wins from ${BET_WIN_POINTS} to ${TOP8_REWARD_TIER1} weebucks.`,
  },
  top8Tier2: {
    id: 'top8Tier2',
    cost: 500,
    reward: TOP8_REWARD_TIER2,
    label: `Top 8 wins → ${TOP8_REWARD_TIER2} weebucks`,
    blurb: `Raise Top 8 bet wins from ${TOP8_REWARD_TIER1} to ${TOP8_REWARD_TIER2} weebucks.`,
    requires: 'top8Tier1',
  },
  top8Tier3: {
    id: 'top8Tier3',
    cost: 1000,
    reward: TOP8_REWARD_TIER3,
    label: `Top 8 wins → ${TOP8_REWARD_TIER3} weebucks`,
    blurb: `Raise Top 8 bet wins from ${TOP8_REWARD_TIER2} to ${TOP8_REWARD_TIER3} weebucks.`,
    requires: 'top8Tier2',
  },
  top64Tier1: {
    id: 'top64Tier1',
    cost: 100,
    reward: TOP64_REWARD_TIER1,
    label: `Top 64 wins → ${TOP64_REWARD_TIER1} weebucks`,
    blurb: `Raise Top 64 bet wins from ${BET_WIN_POINTS} to ${TOP64_REWARD_TIER1} weebucks.`,
  },
  top64Tier2: {
    id: 'top64Tier2',
    cost: 1000,
    reward: TOP64_REWARD_TIER2,
    label: `Top 64 wins → ${TOP64_REWARD_TIER2} weebucks`,
    blurb: `Raise Top 64 bet wins from ${TOP64_REWARD_TIER1} to ${TOP64_REWARD_TIER2} weebucks.`,
    requires: 'top64Tier1',
  },
  top64Tier3: {
    id: 'top64Tier3',
    cost: 1500,
    reward: TOP64_REWARD_TIER3,
    label: `Top 64 wins → ${TOP64_REWARD_TIER3} weebucks`,
    blurb: `Raise Top 64 bet wins from ${TOP64_REWARD_TIER2} to ${TOP64_REWARD_TIER3} weebucks.`,
    requires: 'top64Tier2',
  },
  tournamentWinTier1: {
    id: 'tournamentWinTier1',
    cost: 1000,
    reward: TOURNAMENT_WIN_REWARD_TIER1,
    label: `Tournament win → ${TOURNAMENT_WIN_REWARD_TIER1} weebucks`,
    blurb: `Raise the tournament-win payout from ${TOURNAMENT_WIN_POINTS} to ${TOURNAMENT_WIN_REWARD_TIER1} weebucks.`,
  },
  tournamentWinTier2: {
    id: 'tournamentWinTier2',
    cost: 2500,
    reward: TOURNAMENT_WIN_REWARD_TIER2,
    label: `Tournament win → ${TOURNAMENT_WIN_REWARD_TIER2} weebucks`,
    blurb: `Raise the tournament-win payout to ${TOURNAMENT_WIN_REWARD_TIER2} weebucks.`,
    requires: 'tournamentWinTier1',
  },
  starSlotsTier1: {
    id: 'starSlotsTier1',
    cost: 500,
    slots: STAR_BETS_TIER1,
    label: `Super bet slots → ${STAR_BETS_TIER1}`,
    blurb: `Increase the super bet cap from ${BASE_STAR_BETS} ${BASE_STAR_BETS === 1 ? 'skin' : 'skins'} to ${STAR_BETS_TIER1}.`,
  },
  starSlotsTier2: {
    id: 'starSlotsTier2',
    cost: 1500,
    slots: STAR_BETS_TIER2,
    label: `Super bet slots → ${STAR_BETS_TIER2}`,
    blurb: `Increase super bet skins from ${STAR_BETS_TIER1} to ${STAR_BETS_TIER2}.`,
    requires: 'starSlotsTier1',
  },
  boostSlotsTier1: {
    id: 'boostSlotsTier1',
    cost: 100,
    slots: BOOST_BETS_TIER1,
    label: `Bet slots → ${BOOST_BETS_TIER1}`,
    blurb: `Increase bet skins from ${BASE_BOOST_BETS} to ${BOOST_BETS_TIER1}.`,
  },
  boostSlotsTier2: {
    id: 'boostSlotsTier2',
    cost: 1000,
    slots: BOOST_BETS_TIER2,
    label: `Bet slots → ${BOOST_BETS_TIER2}`,
    blurb: `Increase bet skins from ${BOOST_BETS_TIER1} to ${BOOST_BETS_TIER2}.`,
    requires: 'boostSlotsTier1',
  },
  starDicePlus: {
    id: 'starDicePlus',
    cost: 150,
    label: 'Super bets +5 dice',
    blurb: 'Super bet skins grant +5 dice instead of +4.',
  },
  boostDicePlus: {
    id: 'boostDicePlus',
    cost: 250,
    label: 'Bet skins +3 dice',
    blurb: 'Bet skins grant +3 dice instead of +2.',
  },
  randomSelect: {
    id: 'randomSelect',
    cost: 1000,
    label: 'Unlock Select random',
    blurb: 'Auto-pick super bet and bet skins at random from available skins.',
  },
  betRunsTier1: {
    id: 'betRunsTier1',
    cost: 1000,
    runs: DAILY_BET_RUNS_TIER1,
    label: `Betting runs → ${DAILY_BET_RUNS_TIER1}`,
    blurb: `Increase Betting runs from ${BASE_DAILY_BET_RUNS} to ${DAILY_BET_RUNS_TIER1}.`,
  },
  betRunsTier2: {
    id: 'betRunsTier2',
    cost: 2000,
    runs: DAILY_BET_RUNS_TIER2,
    label: `Betting runs → ${DAILY_BET_RUNS_TIER2}`,
    blurb: `Increase Betting runs from ${DAILY_BET_RUNS_TIER1} to ${DAILY_BET_RUNS_TIER2}.`,
    requires: 'betRunsTier1',
  },
  superBetExtraLife: {
    id: 'superBetExtraLife',
    cost: 2000,
    label: 'Super bet extra life',
    blurb: 'Once per run, each super bet’s first loss becomes a win instead.',
  },
  betSeeding: {
    id: 'betSeeding',
    cost: 500,
    label: 'Seed bet skins',
    blurb: 'Super bets take the top seeds; bet skins are seeded right below them.',
  },
  diceRollTier1: {
    id: 'diceRollTier1',
    cost: 500,
    label: 'Dice roller → 1 second',
    blurb: 'Dice rolls take 1 second instead of 2.',
  },
  diceRollTier2: {
    id: 'diceRollTier2',
    cost: 1000,
    label: 'Dice roller → 0.5 seconds',
    blurb: 'Dice rolls take 0.5 seconds instead of 1.',
    requires: 'diceRollTier1',
  },
};

/** Battle Bus Trail boss-drop unlocks (buying adds them to the boss loot pool). */
export const TRAIL_SHOP_UNLOCKS = {
  trailBending: {
    id: 'trailBending',
    cost: 800,
    items: ['Firebending', 'Waterbending', 'Earthbending', 'Airbending'],
    label: 'Unlock Bending',
    blurb: 'Bosses can drop Fire, Water, Earth, and Airbending.',
  },
  trailLightsaber: {
    id: 'trailLightsaber',
    cost: 800,
    items: ['Sith Apprentice Lightsaber', 'Jedi Apprentice Lightsaber'],
    label: 'Unlock Lightsabers',
    blurb: 'Bosses can drop Sith and Jedi Apprentice Lightsabers.',
  },
  trailInfinity: {
    id: 'trailInfinity',
    cost: 1200,
    items: ['Infinity Blade'],
    label: 'Unlock Infinity Blade',
    blurb: 'Adds the Infinity Blade to the boss loot pool.',
  },
  trailKamehameha: {
    id: 'trailKamehameha',
    cost: 800,
    items: ['Kamehameha'],
    label: 'Unlock Kamehameha',
    blurb: 'Bosses can drop Kamehameha.',
  },
  trailGoldfish: {
    id: 'trailGoldfish',
    cost: 1000,
    items: ['Mythic Goldfish'],
    label: 'Unlock Mythic Goldfish',
    blurb: 'Bosses can drop the Mythic Goldfish.',
  },
  trailChugJug: {
    id: 'trailChugJug',
    cost: 1000,
    items: ['Chug Jug'],
    label: 'Unlock Chug Jug',
    blurb: 'Chests can drop a Chug Jug. Boss loot can still drop them too.',
  },
  trailStormResist10: {
    id: 'trailStormResist10',
    cost: 1000,
    kind: 'stormResist',
    value: 0.1,
    label: 'Storm damage −10%',
    blurb: 'Take 10% less Storm damage on Battle Bus Trail runs.',
  },
  trailStormResist20: {
    id: 'trailStormResist20',
    cost: 2000,
    kind: 'stormResist',
    value: 0.2,
    requires: 'trailStormResist10',
    label: 'Storm damage −20%',
    blurb: 'Take 20% less Storm damage on Battle Bus Trail runs.',
  },
  trailFightResist10: {
    id: 'trailFightResist10',
    cost: 1000,
    kind: 'fightResist',
    value: 0.1,
    label: 'Fight damage −10%',
    blurb: 'Take 10% less damage from enemy fights on Battle Bus Trail.',
  },
  trailFightResist20: {
    id: 'trailFightResist20',
    cost: 1000,
    kind: 'fightResist',
    value: 0.2,
    requires: 'trailFightResist10',
    label: 'Fight damage −20%',
    blurb: 'Take 20% less damage from enemy fights on Battle Bus Trail.',
  },
  trailRunsTier1: {
    id: 'trailRunsTier1',
    cost: 750,
    kind: 'dailyTrailRuns',
    value: DAILY_TRAIL_RUNS_TIER1,
    label: `Trail runs → ${DAILY_TRAIL_RUNS_TIER1}`,
    blurb: `Increase Trail runs from ${BASE_DAILY_TRAIL_RUNS} to ${DAILY_TRAIL_RUNS_TIER1}.`,
  },
  trailRunsTier2: {
    id: 'trailRunsTier2',
    cost: 1500,
    kind: 'dailyTrailRuns',
    value: DAILY_TRAIL_RUNS_TIER2,
    requires: 'trailRunsTier1',
    label: `Trail runs → ${DAILY_TRAIL_RUNS_TIER2}`,
    blurb: `Increase Trail runs from ${DAILY_TRAIL_RUNS_TIER1} to ${DAILY_TRAIL_RUNS_TIER2}.`,
  },
  trailForFun: {
    id: 'trailForFun',
    cost: 5000,
    kind: 'forFun',
    label: 'Unlock For Fun mode',
    blurb:
      'Unlock the For Fun button on Battle Bus Trail. For Fun runs skip locks, daily run limits, weebucks, and skin XP.',
  },
  trailSurvivorPayoutTier1: {
    id: 'trailSurvivorPayoutTier1',
    cost: 400,
    kind: 'survivorPayout',
    value: TRAIL_SURVIVOR_PAYOUT_TIER1,
    label: `Survivor payout → ${TRAIL_SURVIVOR_PAYOUT_TIER1}`,
    blurb: `Surviving squad members pay ${TRAIL_SURVIVOR_PAYOUT_TIER1} weebucks instead of ${TRAIL_SURVIVOR_PAYOUT}.`,
  },
  trailFallenPayoutTier1: {
    id: 'trailFallenPayoutTier1',
    cost: 400,
    kind: 'fallenPayout',
    value: TRAIL_FALLEN_PAYOUT_TIER1,
    label: `Fallen payout → ${TRAIL_FALLEN_PAYOUT_TIER1}`,
    blurb: `Fallen squad members pay ${TRAIL_FALLEN_PAYOUT_TIER1} weebucks instead of ${TRAIL_FALLEN_PAYOUT}.`,
  },
  trailLegendarySupplyDrop: {
    id: 'trailLegendarySupplyDrop',
    cost: 1000,
    kind: 'trailEvent',
    eventId: 'legendarySupplyDrop',
    label: 'Legendary Supply Drop',
    blurb: 'Rare Trail event: loot two Mythic boss-pool items. You can get ambushed while looting.',
  },
  trailVendingMachine: {
    id: 'trailVendingMachine',
    cost: 1000,
    kind: 'trailEvent',
    eventId: 'vendingMachine',
    label: 'Vending Machine',
    blurb: 'Can appear when you Rest. Trade one inventory item for Epic, Legendary, or Mythic loot.',
  },
  trailFloatingIsland: {
    id: 'trailFloatingIsland',
    cost: 1000,
    kind: 'trailEvent',
    eventId: 'floatingIsland',
    label: 'Floating Island',
    blurb: 'Random Trail event: climb for two Mythic boss-pool items — Sweats might be waiting up there.',
  },
  trailFishingSpot: {
    id: 'trailFishingSpot',
    cost: 1000,
    kind: 'trailEvent',
    eventId: 'fishingSpot',
    label: 'Fishing Spot',
    blurb:
      'Random Trail event: keep fishing as long as you want while the Storm closes. Catch commons through Mythics — or nothing.',
  },
  trailSlurpBarrel: {
    id: 'trailSlurpBarrel',
    cost: 1000,
    kind: 'trailEvent',
    eventId: 'slurpBarrel',
    label: 'Slurp Barrel',
    blurb: 'Rare find when you Rest and search for heals. Heals the whole squad to full health.',
  },
  trailPirateShopToken: {
    id: 'trailPirateShopToken',
    cost: 1000,
    kind: 'trailEvent',
    eventId: 'pirateShopToken',
    label: 'Pirate Shop Access Token',
    blurb:
      'Ranked only. Rare find when looting chests. Each token adds 500 weebucks to your Trail payout at the end of the run.',
  },
};

export const TRAIL_SHOP_ORDER = [
  'trailRunsTier1',
  'trailRunsTier2',
  'trailForFun',
  'trailSurvivorPayoutTier1',
  'trailFallenPayoutTier1',
  'trailStormResist10',
  'trailStormResist20',
  'trailFightResist10',
  'trailFightResist20',
  'trailBending',
  'trailLightsaber',
  'trailInfinity',
  'trailKamehameha',
  'trailGoldfish',
  'trailChugJug',
  'trailLegendarySupplyDrop',
  'trailVendingMachine',
  'trailFloatingIsland',
  'trailFishingSpot',
  'trailSlurpBarrel',
  'trailPirateShopToken',
];

function defaultUnlocks() {
  return {
    simulateAll: false,
    top8Reward: 0,
    top64Reward: 0,
    tournamentWinReward: 0,
    starSlots: BASE_STAR_BETS,
    boostSlots: BASE_BOOST_BETS,
    starDicePlus: false,
    boostDicePlus: false,
    randomSelect: false,
    catalogCompleteBonusPaid: false,
    dailyBetRuns: BASE_DAILY_BET_RUNS,
    superBetExtraLife: false,
    betSeeding: false,
    diceRollMs: 2000,
    trailBossItems: [],
    trailEvents: [],
    trailStormResist: 0,
    trailFightResist: 0,
    dailyTrailRuns: BASE_DAILY_TRAIL_RUNS,
    trailSurvivorPayout: TRAIL_SURVIVOR_PAYOUT,
    trailFallenPayout: TRAIL_FALLEN_PAYOUT,
    trailForFun: false,
    runsCapsMigratedV2: true,
    bettingPayoutsDoubledV1: true,
  };
}

function migrateBettingPayoutRewards(unlocks) {
  const top8Map = { 5: TOP8_REWARD_TIER1, 10: TOP8_REWARD_TIER2, 20: TOP8_REWARD_TIER3 };
  const top64Map = { 3: TOP64_REWARD_TIER1, 5: TOP64_REWARD_TIER2, 10: TOP64_REWARD_TIER3 };
  const tournamentMap = {
    100: TOURNAMENT_WIN_REWARD_TIER1,
    200: TOURNAMENT_WIN_REWARD_TIER2,
  };
  return {
    top8Reward: top8Map[unlocks.top8Reward] || 0,
    top64Reward: top64Map[unlocks.top64Reward] || 0,
    tournamentWinReward: tournamentMap[unlocks.tournamentWinReward] || 0,
  };
}

function migrateLegacyDailyRuns(unlocks) {
  const rawBet = Number(unlocks.dailyBetRuns);
  // Old free default was 5; old purchased tiers were 7 then 10.
  let dailyBetRuns = BASE_DAILY_BET_RUNS;
  if (rawBet >= LEGACY_DAILY_RUNS_TIER2 || rawBet === 7) {
    dailyBetRuns = DAILY_BET_RUNS_TIER2;
  } else if (rawBet === LEGACY_DAILY_BET_RUNS_BASE) {
    dailyBetRuns = BASE_DAILY_BET_RUNS;
  }

  const rawTrail = Number(unlocks.dailyTrailRuns);
  let dailyTrailRuns = BASE_DAILY_TRAIL_RUNS;
  if (rawTrail >= LEGACY_DAILY_RUNS_TIER2) {
    dailyTrailRuns = DAILY_TRAIL_RUNS_TIER2;
  } else if (rawTrail === DAILY_TRAIL_RUNS_TIER1) {
    dailyTrailRuns = DAILY_TRAIL_RUNS_TIER1;
  }

  return { dailyBetRuns, dailyTrailRuns };
}

function normalizeUnlocks(unlocks) {
  const base = defaultUnlocks();
  if (!unlocks || typeof unlocks !== 'object') return base;
  // Legacy buyers of the old max (5) keep a mid tier until they buy → 7.
  const starSlots =
    unlocks.starSlots === STAR_BETS_TIER2 ||
    unlocks.starSlots === STAR_BETS_TIER1 ||
    unlocks.starSlots === LEGACY_STAR_BETS_TIER2
      ? unlocks.starSlots === LEGACY_STAR_BETS_TIER2
        ? LEGACY_STAR_BETS_TIER2
        : unlocks.starSlots
      : BASE_STAR_BETS;
  const boostSlots =
    unlocks.boostSlots === BOOST_BETS_TIER2 || unlocks.boostSlots === BOOST_BETS_TIER1
      ? unlocks.boostSlots
      : BASE_BOOST_BETS;

  let dailyBetRuns;
  let dailyTrailRuns;
  let runsCapsMigratedV2 = !!unlocks.runsCapsMigratedV2;
  if (!runsCapsMigratedV2) {
    ({ dailyBetRuns, dailyTrailRuns } = migrateLegacyDailyRuns(unlocks));
    runsCapsMigratedV2 = true;
  } else {
    dailyBetRuns =
      unlocks.dailyBetRuns === DAILY_BET_RUNS_TIER2 || unlocks.dailyBetRuns === DAILY_BET_RUNS_TIER1
        ? unlocks.dailyBetRuns
        : BASE_DAILY_BET_RUNS;
    dailyTrailRuns =
      unlocks.dailyTrailRuns === DAILY_TRAIL_RUNS_TIER2 ||
      unlocks.dailyTrailRuns === DAILY_TRAIL_RUNS_TIER1
        ? unlocks.dailyTrailRuns
        : BASE_DAILY_TRAIL_RUNS;
  }

  let top8Reward;
  let top64Reward;
  let tournamentWinReward;
  let bettingPayoutsDoubledV1 = !!unlocks.bettingPayoutsDoubledV1;
  if (!bettingPayoutsDoubledV1) {
    ({ top8Reward, top64Reward, tournamentWinReward } = migrateBettingPayoutRewards(unlocks));
    bettingPayoutsDoubledV1 = true;
  } else {
    top8Reward =
      unlocks.top8Reward === TOP8_REWARD_TIER3 ||
      unlocks.top8Reward === TOP8_REWARD_TIER2 ||
      unlocks.top8Reward === TOP8_REWARD_TIER1
        ? unlocks.top8Reward
        : 0;
    top64Reward =
      unlocks.top64Reward === TOP64_REWARD_TIER3 ||
      unlocks.top64Reward === TOP64_REWARD_TIER2 ||
      unlocks.top64Reward === TOP64_REWARD_TIER1
        ? unlocks.top64Reward
        : 0;
    tournamentWinReward =
      unlocks.tournamentWinReward === TOURNAMENT_WIN_REWARD_TIER2 ||
      unlocks.tournamentWinReward === TOURNAMENT_WIN_REWARD_TIER1
        ? unlocks.tournamentWinReward
        : 0;
  }

  return {
    simulateAll: !!unlocks.simulateAll,
    top8Reward,
    top64Reward,
    tournamentWinReward,
    starSlots,
    boostSlots,
    starDicePlus: !!unlocks.starDicePlus,
    boostDicePlus: !!unlocks.boostDicePlus,
    randomSelect: !!unlocks.randomSelect,
    catalogCompleteBonusPaid: !!unlocks.catalogCompleteBonusPaid,
    dailyBetRuns,
    superBetExtraLife: !!unlocks.superBetExtraLife,
    betSeeding: !!unlocks.betSeeding,
    diceRollMs: unlocks.diceRollMs === 500 || unlocks.diceRollMs === 1000 ? unlocks.diceRollMs : 2000,
    trailBossItems: Array.isArray(unlocks.trailBossItems)
      ? unlocks.trailBossItems.filter((name) => typeof name === 'string')
      : [],
    trailEvents: Array.isArray(unlocks.trailEvents)
      ? unlocks.trailEvents.filter((name) => typeof name === 'string')
      : [],
    trailStormResist:
      unlocks.trailStormResist === 0.2 || unlocks.trailStormResist === 0.1
        ? unlocks.trailStormResist
        : 0,
    trailFightResist:
      unlocks.trailFightResist === 0.2 || unlocks.trailFightResist === 0.1
        ? unlocks.trailFightResist
        : 0,
    dailyTrailRuns,
    trailSurvivorPayout:
      unlocks.trailSurvivorPayout === TRAIL_SURVIVOR_PAYOUT_TIER1
        ? TRAIL_SURVIVOR_PAYOUT_TIER1
        : TRAIL_SURVIVOR_PAYOUT,
    trailFallenPayout:
      unlocks.trailFallenPayout === TRAIL_FALLEN_PAYOUT_TIER1
        ? TRAIL_FALLEN_PAYOUT_TIER1
        : TRAIL_FALLEN_PAYOUT,
    trailForFun: !!unlocks.trailForFun,
    runsCapsMigratedV2,
    bettingPayoutsDoubledV1,
  };
}

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
  'Snowball',
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

export const MUSIC_TRACK_COST = 2000;

/** Lobby songs sold in the Shop. Free songs stay available without a purchase. */
export const MUSIC_SHOP_IDS = ['between-the-rows', 'under-broken-skin', 'perfect-despair'];

function read() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!parsed || typeof parsed !== 'object') return defaultEconomy();
    return {
      points: Math.max(0, Number(parsed.points) || 0),
    ownedSidekickIds: Array.isArray(parsed.ownedSidekickIds)
      ? parsed.ownedSidekickIds.filter((id) => typeof id === 'string')
      : [],
    ownedMusicIds: Array.isArray(parsed.ownedMusicIds)
      ? parsed.ownedMusicIds.filter((id) => MUSIC_SHOP_IDS.includes(id))
      : [],
      daily: normalizeDaily(parsed.daily),
      dailyBetRuns: normalizeDailyBetRuns(parsed.dailyBetRuns),
      dailyTrailRuns: normalizeDailyTrailRuns(parsed.dailyTrailRuns),
      dailyLogin: normalizeDailyLogin(parsed.dailyLogin),
      dailyTrailSidekicks: normalizeDailyTrailSidekicks(parsed.dailyTrailSidekicks),
      weeklyBets: normalizeWeekly(parsed.weeklyBets),
      weeklyTrail: normalizeWeeklyTrail(parsed.weeklyTrail),
      unlocks: normalizeUnlocks(parsed.unlocks),
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
    ownedMusicIds: [],
    daily: { dayKey: guessDayKey(), used: 0, bonus: 0 },
    dailyBetRuns: { dayKey: guessDayKey(), used: 0 },
    dailyTrailRuns: { dayKey: guessDayKey(), used: 0 },
    dailyLogin: { dayKey: guessDayKey(), claimed: false },
    dailyTrailSidekicks: { dayKey: guessDayKey(), usedIds: [] },
    weeklyBets: { dayKey: guessDayKey(), usedIds: [] },
    weeklyTrail: { dayKey: guessDayKey(), usedIds: [] },
    unlocks: defaultUnlocks(),
  };
}

function withFreshMeta(economy) {
  return {
    ...economy,
    daily: normalizeDaily(economy.daily),
    dailyBetRuns: normalizeDailyBetRuns(economy.dailyBetRuns),
    dailyTrailRuns: normalizeDailyTrailRuns(economy.dailyTrailRuns),
    dailyLogin: normalizeDailyLogin(economy.dailyLogin),
    dailyTrailSidekicks: normalizeDailyTrailSidekicks(economy.dailyTrailSidekicks),
    weeklyBets: normalizeWeekly(economy.weeklyBets),
    weeklyTrail: normalizeWeeklyTrail(economy.weeklyTrail),
    unlocks: normalizeUnlocks(economy.unlocks),
  };
}

export function getStarBetBonusDice(economy = loadEconomy()) {
  return normalizeUnlocks(economy.unlocks).starDicePlus ? STAR_BET_BONUS_DICE_UPGRADED : STAR_BET_BONUS_DICE;
}

export function getBoostBetBonusDice(economy = loadEconomy()) {
  return normalizeUnlocks(economy.unlocks).boostDicePlus
    ? BOOST_BET_BONUS_DICE_UPGRADED
    : BOOST_BET_BONUS_DICE;
}

export function getBetWinPointsForPhase(phase, economy = loadEconomy(), { superBet = false } = {}) {
  const unlocks = normalizeUnlocks(economy.unlocks);
  const label = String(phase || '');
  let points = BET_WIN_POINTS;
  if (label.startsWith('Top 8') && unlocks.top8Reward) points = unlocks.top8Reward;
  else if (label.startsWith('Top 64') && unlocks.top64Reward) points = unlocks.top64Reward;
  if (superBet) points += SUPER_BET_ROUND_BONUS;
  return points;
}

export function getTournamentWinPoints(economy = loadEconomy(), { superBet = false } = {}) {
  const unlocks = normalizeUnlocks(economy.unlocks);
  const base = unlocks.tournamentWinReward || TOURNAMENT_WIN_POINTS;
  return base + (superBet ? SUPER_BET_ROUND_BONUS : 0);
}

export function hasSimulateAllUnlock(economy = loadEconomy()) {
  return normalizeUnlocks(economy.unlocks).simulateAll;
}

export function getMaxStarBets(economy = loadEconomy()) {
  return normalizeUnlocks(economy.unlocks).starSlots;
}

export function getMaxBoostBets(economy = loadEconomy()) {
  return normalizeUnlocks(economy.unlocks).boostSlots;
}

export function hasRandomSelectUnlock(economy = loadEconomy()) {
  return normalizeUnlocks(economy.unlocks).randomSelect;
}

export function hasSuperBetExtraLifeUnlock(economy = loadEconomy()) {
  return normalizeUnlocks(economy.unlocks).superBetExtraLife;
}

export function hasBetSeedingUnlock(economy = loadEconomy()) {
  return normalizeUnlocks(economy.unlocks).betSeeding;
}

/** Milliseconds between each die in a Betting roll. 2000, then 1000, then 500. */
export function getDiceRollMs(economy = loadEconomy()) {
  return normalizeUnlocks(economy.unlocks).diceRollMs;
}

export function buyShopUnlock(unlockId, economy = loadEconomy()) {
  const state = withFreshMeta(economy);
  const item = Object.values(SHOP_UNLOCKS).find((entry) => entry.id === unlockId);
  if (!item) return { ok: false, reason: 'Unknown shop item.', economy: state };

  if (item.requires === 'top8Tier1' && state.unlocks.top8Reward < TOP8_REWARD_TIER1) {
    return {
      ok: false,
      reason: `Buy the Top 8 → ${TOP8_REWARD_TIER1} weebucks upgrade first.`,
      economy: state,
    };
  }
  if (item.requires === 'top8Tier2' && state.unlocks.top8Reward < TOP8_REWARD_TIER2) {
    return {
      ok: false,
      reason: `Buy the Top 8 → ${TOP8_REWARD_TIER2} weebucks upgrade first.`,
      economy: state,
    };
  }
  if (item.requires === 'top64Tier1' && state.unlocks.top64Reward < TOP64_REWARD_TIER1) {
    return {
      ok: false,
      reason: `Buy the Top 64 → ${TOP64_REWARD_TIER1} weebucks upgrade first.`,
      economy: state,
    };
  }
  if (item.requires === 'top64Tier2' && state.unlocks.top64Reward < TOP64_REWARD_TIER2) {
    return {
      ok: false,
      reason: `Buy the Top 64 → ${TOP64_REWARD_TIER2} weebucks upgrade first.`,
      economy: state,
    };
  }
  if (
    item.requires === 'tournamentWinTier1' &&
    state.unlocks.tournamentWinReward < TOURNAMENT_WIN_REWARD_TIER1
  ) {
    return {
      ok: false,
      reason: `Buy Tournament win → ${TOURNAMENT_WIN_REWARD_TIER1} weebucks first.`,
      economy: state,
    };
  }
  if (item.requires === 'starSlotsTier1' && state.unlocks.starSlots < STAR_BETS_TIER1) {
    return { ok: false, reason: `Buy Super bet slots → ${STAR_BETS_TIER1} first.`, economy: state };
  }
  if (item.requires === 'boostSlotsTier1' && state.unlocks.boostSlots < BOOST_BETS_TIER1) {
    return { ok: false, reason: `Buy Bet slots → ${BOOST_BETS_TIER1} first.`, economy: state };
  }
  if (item.requires === 'betRunsTier1' && state.unlocks.dailyBetRuns < DAILY_BET_RUNS_TIER1) {
    return {
      ok: false,
      reason: `Buy Daily betting runs → ${DAILY_BET_RUNS_TIER1} first.`,
      economy: state,
    };
  }
  if (item.requires === 'diceRollTier1' && state.unlocks.diceRollMs > 1000) {
    return { ok: false, reason: 'Buy Dice roller → 1 second first.', economy: state };
  }

  const already =
    (unlockId === 'simulateAll' && state.unlocks.simulateAll) ||
    (unlockId === 'starDicePlus' && state.unlocks.starDicePlus) ||
    (unlockId === 'boostDicePlus' && state.unlocks.boostDicePlus) ||
    (unlockId === 'randomSelect' && state.unlocks.randomSelect) ||
    (unlockId === 'superBetExtraLife' && state.unlocks.superBetExtraLife) ||
    (unlockId === 'betSeeding' && state.unlocks.betSeeding) ||
    (unlockId === 'top8Tier1' && state.unlocks.top8Reward >= TOP8_REWARD_TIER1) ||
    (unlockId === 'top8Tier2' && state.unlocks.top8Reward >= TOP8_REWARD_TIER2) ||
    (unlockId === 'top8Tier3' && state.unlocks.top8Reward >= TOP8_REWARD_TIER3) ||
    (unlockId === 'top64Tier1' && state.unlocks.top64Reward >= TOP64_REWARD_TIER1) ||
    (unlockId === 'top64Tier2' && state.unlocks.top64Reward >= TOP64_REWARD_TIER2) ||
    (unlockId === 'top64Tier3' && state.unlocks.top64Reward >= TOP64_REWARD_TIER3) ||
    (unlockId === 'tournamentWinTier1' &&
      state.unlocks.tournamentWinReward >= TOURNAMENT_WIN_REWARD_TIER1) ||
    (unlockId === 'tournamentWinTier2' &&
      state.unlocks.tournamentWinReward >= TOURNAMENT_WIN_REWARD_TIER2) ||
    (unlockId === 'starSlotsTier1' && state.unlocks.starSlots >= STAR_BETS_TIER1) ||
    (unlockId === 'starSlotsTier2' && state.unlocks.starSlots >= STAR_BETS_TIER2) ||
    (unlockId === 'boostSlotsTier1' && state.unlocks.boostSlots >= BOOST_BETS_TIER1) ||
    (unlockId === 'boostSlotsTier2' && state.unlocks.boostSlots >= BOOST_BETS_TIER2) ||
    (unlockId === 'betRunsTier1' && state.unlocks.dailyBetRuns >= DAILY_BET_RUNS_TIER1) ||
    (unlockId === 'betRunsTier2' && state.unlocks.dailyBetRuns >= DAILY_BET_RUNS_TIER2) ||
    (unlockId === 'diceRollTier1' && state.unlocks.diceRollMs <= 1000) ||
    (unlockId === 'diceRollTier2' && state.unlocks.diceRollMs <= 500);

  if (already) return { ok: false, reason: 'Already owned.', economy: state };
  if (state.points < item.cost) {
    return { ok: false, reason: `Need ${item.cost} weebucks.`, economy: state };
  }

  state.points -= item.cost;
  if (unlockId === 'simulateAll') state.unlocks.simulateAll = true;
  if (unlockId === 'starDicePlus') state.unlocks.starDicePlus = true;
  if (unlockId === 'boostDicePlus') state.unlocks.boostDicePlus = true;
  if (unlockId === 'randomSelect') state.unlocks.randomSelect = true;
  if (unlockId === 'superBetExtraLife') state.unlocks.superBetExtraLife = true;
  if (unlockId === 'betSeeding') state.unlocks.betSeeding = true;
  if (unlockId === 'top8Tier1') state.unlocks.top8Reward = TOP8_REWARD_TIER1;
  if (unlockId === 'top8Tier2') state.unlocks.top8Reward = TOP8_REWARD_TIER2;
  if (unlockId === 'top8Tier3') state.unlocks.top8Reward = TOP8_REWARD_TIER3;
  if (unlockId === 'top64Tier1') state.unlocks.top64Reward = TOP64_REWARD_TIER1;
  if (unlockId === 'top64Tier2') state.unlocks.top64Reward = TOP64_REWARD_TIER2;
  if (unlockId === 'top64Tier3') state.unlocks.top64Reward = TOP64_REWARD_TIER3;
  if (unlockId === 'tournamentWinTier1') {
    state.unlocks.tournamentWinReward = TOURNAMENT_WIN_REWARD_TIER1;
  }
  if (unlockId === 'tournamentWinTier2') {
    state.unlocks.tournamentWinReward = TOURNAMENT_WIN_REWARD_TIER2;
  }
  if (unlockId === 'starSlotsTier1') state.unlocks.starSlots = STAR_BETS_TIER1;
  if (unlockId === 'starSlotsTier2') state.unlocks.starSlots = STAR_BETS_TIER2;
  if (unlockId === 'boostSlotsTier1') state.unlocks.boostSlots = BOOST_BETS_TIER1;
  if (unlockId === 'boostSlotsTier2') state.unlocks.boostSlots = BOOST_BETS_TIER2;
  if (unlockId === 'betRunsTier1') state.unlocks.dailyBetRuns = DAILY_BET_RUNS_TIER1;
  if (unlockId === 'betRunsTier2') state.unlocks.dailyBetRuns = DAILY_BET_RUNS_TIER2;
  if (unlockId === 'diceRollTier1') state.unlocks.diceRollMs = 1000;
  if (unlockId === 'diceRollTier2') state.unlocks.diceRollMs = 500;

  return { ok: true, economy: write(state) };
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

function normalizeDailyBetRuns(dailyBetRuns) {
  const dayKey = guessDayKey();
  if (!dailyBetRuns || dailyBetRuns.dayKey !== dayKey) {
    return { dayKey, used: 0 };
  }
  return {
    dayKey,
    used: Math.max(0, Number(dailyBetRuns.used) || 0),
  };
}

function normalizeDailyTrailRuns(dailyTrailRuns) {
  const dayKey = guessDayKey();
  if (!dailyTrailRuns || dailyTrailRuns.dayKey !== dayKey) {
    return { dayKey, used: 0 };
  }
  return {
    dayKey,
    used: Math.max(0, Number(dailyTrailRuns.used) || 0),
  };
}

function normalizeDailyLogin(dailyLogin) {
  const dayKey = guessDayKey();
  if (!dailyLogin || dailyLogin.dayKey !== dayKey) {
    return { dayKey, claimed: false };
  }
  return {
    dayKey,
    claimed: !!dailyLogin.claimed,
  };
}

/** Sidekicks used on a ranked Trail run rest until the next 6:00 AM Central guess-day. */
function normalizeDailyTrailSidekicks(dailyTrailSidekicks) {
  const dayKey = guessDayKey();
  if (!dailyTrailSidekicks || dailyTrailSidekicks.dayKey !== dayKey) {
    return { dayKey, usedIds: [] };
  }
  return {
    dayKey,
    usedIds: Array.isArray(dailyTrailSidekicks.usedIds)
      ? dailyTrailSidekicks.usedIds.filter((id) => typeof id === 'string')
      : [],
  };
}

/** Bet and Trail skin locks clear at 6:00 AM Central, with hangman attempts. Old Monday locks are dropped. */
function normalizeDailySkinLock(entry) {
  const dayKey = guessDayKey();
  if (!entry || entry.dayKey !== dayKey) {
    return { dayKey, usedIds: [] };
  }
  return {
    dayKey,
    usedIds: Array.isArray(entry.usedIds)
      ? entry.usedIds.filter((id) => typeof id === 'string')
      : [],
  };
}

function normalizeWeeklyTrail(weekly) {
  return normalizeDailySkinLock(weekly);
}

function normalizeWeekly(weekly) {
  return normalizeDailySkinLock(weekly);
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

export function loadEconomy() {
  const state = read();
  state.daily = normalizeDaily(state.daily);
  state.dailyBetRuns = normalizeDailyBetRuns(state.dailyBetRuns);
  state.dailyTrailRuns = normalizeDailyTrailRuns(state.dailyTrailRuns);
  state.dailyLogin = normalizeDailyLogin(state.dailyLogin);
  state.dailyTrailSidekicks = normalizeDailyTrailSidekicks(state.dailyTrailSidekicks);
  state.weeklyBets = normalizeWeekly(state.weeklyBets);
  state.weeklyTrail = normalizeWeeklyTrail(state.weeklyTrail);
  return write(state);
}

/** Award the once-per-day login weebuck bonus if it has not been claimed yet. */
export function claimDailyLoginBonus(economy = loadEconomy()) {
  const state = withFreshMeta(economy);
  state.dailyLogin = normalizeDailyLogin(state.dailyLogin);
  if (state.dailyLogin.claimed) {
    return { ok: false, awarded: 0, alreadyClaimed: true, economy: write(state) };
  }
  state.points = Math.max(0, (Number(state.points) || 0) + DAILY_LOGIN_BONUS);
  state.dailyLogin = { dayKey: guessDayKey(), claimed: true };
  return {
    ok: true,
    awarded: DAILY_LOGIN_BONUS,
    alreadyClaimed: false,
    economy: write(state),
  };
}

/** Wipe weebucks, unlocks, sidekicks, and reset daily attempts / betting runs. */
export function resetEconomy() {
  return write(defaultEconomy());
}

export function getDailyBetRunLimit(economy = loadEconomy()) {
  return normalizeUnlocks(economy.unlocks).dailyBetRuns;
}

export function getDailyBetRunsRemaining(economy = loadEconomy()) {
  const state = withFreshMeta(economy);
  return Math.max(0, getDailyBetRunLimit(state) - state.dailyBetRuns.used);
}

export function canStartBettingRun(economy = loadEconomy()) {
  return getDailyBetRunsRemaining(economy) > 0;
}

export function spendBettingRun(economy = loadEconomy()) {
  const state = withFreshMeta(economy);
  if (state.dailyBetRuns.used >= getDailyBetRunLimit(state)) {
    return { ok: false, reason: 'No betting runs left today.', economy: state };
  }
  state.dailyBetRuns = { ...state.dailyBetRuns, used: state.dailyBetRuns.used + 1 };
  return { ok: true, economy: write(state) };
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
    unlocks: normalizeUnlocks(economy.unlocks),
  };
  return write(state);
}

/** One-time 10000 weebucks when the player finishes the outfit catalogue. */
export function awardCatalogCompleteBonus(economy = loadEconomy()) {
  const state = withFreshMeta(economy);
  if (state.unlocks.catalogCompleteBonusPaid) {
    return { ok: false, awarded: 0, economy: state };
  }
  state.unlocks = { ...state.unlocks, catalogCompleteBonusPaid: true };
  state.points = Math.max(0, (Number(state.points) || 0) + CATALOG_COMPLETE_BONUS);
  return { ok: true, awarded: CATALOG_COMPLETE_BONUS, economy: write(state) };
}

export function isShopUnlockOwned(unlockId, economy = loadEconomy()) {
  const unlocks = normalizeUnlocks(economy.unlocks);
  if (unlockId === 'simulateAll') return unlocks.simulateAll;
  if (unlockId === 'starDicePlus') return unlocks.starDicePlus;
  if (unlockId === 'boostDicePlus') return unlocks.boostDicePlus;
  if (unlockId === 'randomSelect') return unlocks.randomSelect;
  if (unlockId === 'superBetExtraLife') return unlocks.superBetExtraLife;
  if (unlockId === 'betSeeding') return unlocks.betSeeding;
  if (unlockId === 'top8Tier1') return unlocks.top8Reward >= TOP8_REWARD_TIER1;
  if (unlockId === 'top8Tier2') return unlocks.top8Reward >= TOP8_REWARD_TIER2;
  if (unlockId === 'top8Tier3') return unlocks.top8Reward >= TOP8_REWARD_TIER3;
  if (unlockId === 'top64Tier1') return unlocks.top64Reward >= TOP64_REWARD_TIER1;
  if (unlockId === 'top64Tier2') return unlocks.top64Reward >= TOP64_REWARD_TIER2;
  if (unlockId === 'top64Tier3') return unlocks.top64Reward >= TOP64_REWARD_TIER3;
  if (unlockId === 'tournamentWinTier1') {
    return unlocks.tournamentWinReward >= TOURNAMENT_WIN_REWARD_TIER1;
  }
  if (unlockId === 'tournamentWinTier2') {
    return unlocks.tournamentWinReward >= TOURNAMENT_WIN_REWARD_TIER2;
  }
  if (unlockId === 'starSlotsTier1') return unlocks.starSlots >= STAR_BETS_TIER1;
  if (unlockId === 'starSlotsTier2') return unlocks.starSlots >= STAR_BETS_TIER2;
  if (unlockId === 'boostSlotsTier1') return unlocks.boostSlots >= BOOST_BETS_TIER1;
  if (unlockId === 'boostSlotsTier2') return unlocks.boostSlots >= BOOST_BETS_TIER2;
  if (unlockId === 'betRunsTier1') return unlocks.dailyBetRuns >= DAILY_BET_RUNS_TIER1;
  if (unlockId === 'betRunsTier2') return unlocks.dailyBetRuns >= DAILY_BET_RUNS_TIER2;
  if (unlockId === 'diceRollTier1') return unlocks.diceRollMs <= 1000;
  if (unlockId === 'diceRollTier2') return unlocks.diceRollMs <= 500;
  return false;
}

/** Permanent shop unlocks only (excludes consumable guess packs and sidekick rolls). */
export function countPermanentShopUpgrades(economy = loadEconomy()) {
  const bettingIds = Object.keys(SHOP_UNLOCKS);
  const trailIds = Object.keys(TRAIL_SHOP_UNLOCKS);
  let owned = 0;
  for (const id of bettingIds) {
    if (isShopUnlockOwned(id, economy)) owned += 1;
  }
  for (const id of trailIds) {
    if (isTrailShopUnlockOwned(id, economy)) owned += 1;
  }
  for (const id of MUSIC_SHOP_IDS) {
    if (isMusicTrackOwned(id, economy)) owned += 1;
  }
  return { owned, total: bettingIds.length + trailIds.length + MUSIC_SHOP_IDS.length };
}

export function isShopUnlockAvailable(unlockId, economy = loadEconomy()) {
  const unlocks = normalizeUnlocks(economy.unlocks);
  if (isShopUnlockOwned(unlockId, economy)) return false;
  if (unlockId === 'top8Tier2') return unlocks.top8Reward >= TOP8_REWARD_TIER1;
  if (unlockId === 'top8Tier3') return unlocks.top8Reward >= TOP8_REWARD_TIER2;
  if (unlockId === 'top64Tier2') return unlocks.top64Reward >= TOP64_REWARD_TIER1;
  if (unlockId === 'top64Tier3') return unlocks.top64Reward >= TOP64_REWARD_TIER2;
  if (unlockId === 'tournamentWinTier2') {
    return unlocks.tournamentWinReward >= TOURNAMENT_WIN_REWARD_TIER1;
  }
  if (unlockId === 'starSlotsTier2') return unlocks.starSlots >= STAR_BETS_TIER1;
  if (unlockId === 'boostSlotsTier2') return unlocks.boostSlots >= BOOST_BETS_TIER1;
  if (unlockId === 'betRunsTier2') return unlocks.dailyBetRuns >= DAILY_BET_RUNS_TIER1;
  if (unlockId === 'diceRollTier2') return unlocks.diceRollMs <= 1000;
  return true;
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

export function isMusicTrackOwned(trackId, economy = loadEconomy()) {
  return (economy.ownedMusicIds || []).includes(trackId);
}

export function buyMusicTrack(trackId, economy = loadEconomy()) {
  const state = {
    ...economy,
    ownedMusicIds: [...(economy.ownedMusicIds || [])],
  };
  if (!MUSIC_SHOP_IDS.includes(trackId)) {
    return { ok: false, reason: 'That song is not for sale.', economy: state };
  }
  if (state.ownedMusicIds.includes(trackId)) {
    return { ok: false, reason: 'You already own that song.', economy: state };
  }
  if ((Number(state.points) || 0) < MUSIC_TRACK_COST) {
    return { ok: false, reason: `Need ${MUSIC_TRACK_COST} weebucks.`, economy: state };
  }
  state.points -= MUSIC_TRACK_COST;
  state.ownedMusicIds.push(trackId);
  return { ok: true, economy: write(state) };
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

/** Lock bet skins until the next 6:00 AM Central reset. */
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
  state.weeklyBets = { dayKey: state.weeklyBets.dayKey, usedIds: [...used] };
  return write(state);
}

/** Remove skins from today's bet lock so a discarded run can be picked again. */
export function unlockBetSkins(skinIds, economy = loadEconomy()) {
  const state = {
    ...economy,
    daily: normalizeDaily(economy.daily),
    weeklyBets: normalizeWeekly(economy.weeklyBets),
  };
  const drop = new Set(skinIds);
  state.weeklyBets = {
    dayKey: state.weeklyBets.dayKey,
    usedIds: state.weeklyBets.usedIds.filter((id) => !drop.has(id)),
  };
  return write(state);
}

export function getMaxDailyTrailRuns(economy = loadEconomy()) {
  return normalizeUnlocks(economy.unlocks).dailyTrailRuns;
}

export function getDailyTrailRunsRemaining(economy = loadEconomy()) {
  const state = withFreshMeta(economy);
  return Math.max(0, getMaxDailyTrailRuns(state) - state.dailyTrailRuns.used);
}

export function canStartTrailRun(economy = loadEconomy()) {
  return getDailyTrailRunsRemaining(economy) > 0;
}

export function spendTrailRun(economy = loadEconomy()) {
  const state = withFreshMeta(economy);
  const maxRuns = getMaxDailyTrailRuns(state);
  if (state.dailyTrailRuns.used >= maxRuns) {
    return { ok: false, reason: 'No Battle Bus Trail runs left today.', economy: state };
  }
  state.dailyTrailRuns = { ...state.dailyTrailRuns, used: state.dailyTrailRuns.used + 1 };
  return { ok: true, economy: write(state) };
}

export function getTrailStormResist(economy = loadEconomy()) {
  return normalizeUnlocks(economy.unlocks).trailStormResist;
}

export function getTrailFightResist(economy = loadEconomy()) {
  return normalizeUnlocks(economy.unlocks).trailFightResist;
}

export function getTrailSurvivorPayout(economy = loadEconomy()) {
  return normalizeUnlocks(economy.unlocks).trailSurvivorPayout;
}

export function getTrailFallenPayout(economy = loadEconomy()) {
  return normalizeUnlocks(economy.unlocks).trailFallenPayout;
}

export function getLockedTrailSkinIds(economy = loadEconomy()) {
  return new Set(normalizeWeeklyTrail(economy.weeklyTrail).usedIds);
}

export function lockTrailSkins(skinIds, economy = loadEconomy()) {
  const state = withFreshMeta(economy);
  const used = new Set(state.weeklyTrail.usedIds);
  for (const id of skinIds) {
    if (id) used.add(id);
  }
  state.weeklyTrail = { dayKey: state.weeklyTrail.dayKey, usedIds: [...used] };
  return write(state);
}

/** Sidekicks resting after a ranked Trail run (clears at 6:00 AM Central with hangman attempts). */
export function getLockedTrailSidekickIds(economy = loadEconomy()) {
  return new Set(normalizeDailyTrailSidekicks(economy.dailyTrailSidekicks).usedIds);
}

export function isTrailSidekickLocked(sidekickId, economy = loadEconomy()) {
  if (!sidekickId) return false;
  return getLockedTrailSidekickIds(economy).has(sidekickId);
}

export function lockTrailSidekick(sidekickId, economy = loadEconomy()) {
  const state = withFreshMeta(economy);
  if (!sidekickId) return write(state);
  const used = new Set(state.dailyTrailSidekicks.usedIds);
  used.add(sidekickId);
  state.dailyTrailSidekicks = {
    dayKey: state.dailyTrailSidekicks.dayKey,
    usedIds: [...used],
  };
  return write(state);
}

export function getTrailUnlockedBossItems(economy = loadEconomy()) {
  return [...normalizeUnlocks(economy.unlocks).trailBossItems];
}

export function getTrailUnlockedEvents(economy = loadEconomy()) {
  return [...normalizeUnlocks(economy.unlocks).trailEvents];
}

function trailUnlockItems(entry) {
  if (!entry) return [];
  if (Array.isArray(entry.items) && entry.items.length) return entry.items;
  if (entry.item) return [entry.item];
  return [];
}

function isTrailMetaUnlockOwned(entry, unlocks) {
  if (!entry?.kind) return false;
  if (entry.kind === 'stormResist') return unlocks.trailStormResist >= entry.value;
  if (entry.kind === 'fightResist') return unlocks.trailFightResist >= entry.value;
  if (entry.kind === 'dailyTrailRuns') return unlocks.dailyTrailRuns >= entry.value;
  if (entry.kind === 'survivorPayout') return unlocks.trailSurvivorPayout >= entry.value;
  if (entry.kind === 'fallenPayout') return unlocks.trailFallenPayout >= entry.value;
  if (entry.kind === 'trailEvent') return unlocks.trailEvents.includes(entry.eventId);
  if (entry.kind === 'forFun') return !!unlocks.trailForFun;
  return false;
}

export function hasTrailForFun(economy = loadEconomy()) {
  return !!normalizeUnlocks(economy.unlocks).trailForFun;
}

export function isTrailShopUnlockOwned(unlockId, economy = loadEconomy()) {
  const entry = TRAIL_SHOP_UNLOCKS[unlockId];
  if (!entry) return false;
  const unlocks = normalizeUnlocks(economy.unlocks);
  if (entry.kind) return isTrailMetaUnlockOwned(entry, unlocks);
  const owned = new Set(getTrailUnlockedBossItems(economy));
  const items = trailUnlockItems(entry);
  if (!items.length) return false;
  return items.every((item) => owned.has(item));
}

export function isTrailShopUnlockAvailable(unlockId, economy = loadEconomy()) {
  const entry = TRAIL_SHOP_UNLOCKS[unlockId];
  if (!entry) return false;
  if (isTrailShopUnlockOwned(unlockId, economy)) return false;
  if (entry.requires && !isTrailShopUnlockOwned(entry.requires, economy)) return false;
  return true;
}

export function buyTrailShopUnlock(unlockId, economy = loadEconomy()) {
  const state = withFreshMeta(economy);
  const entry = TRAIL_SHOP_UNLOCKS[unlockId];
  if (!entry) return { ok: false, reason: 'Unknown Trail shop item.', economy: state };
  if (isTrailShopUnlockOwned(unlockId, state)) {
    return { ok: false, reason: 'Already unlocked.', economy: state };
  }
  if (entry.requires && !isTrailShopUnlockOwned(entry.requires, state)) {
    const needed = TRAIL_SHOP_UNLOCKS[entry.requires]?.label || 'the previous upgrade';
    return { ok: false, reason: `Buy ${needed} first.`, economy: state };
  }
  if (state.points < entry.cost) {
    return { ok: false, reason: 'Not enough weebucks.', economy: state };
  }
  state.points -= entry.cost;
  if (entry.kind === 'stormResist') {
    state.unlocks.trailStormResist = entry.value;
  } else if (entry.kind === 'fightResist') {
    state.unlocks.trailFightResist = entry.value;
  } else if (entry.kind === 'dailyTrailRuns') {
    state.unlocks.dailyTrailRuns = entry.value;
  } else if (entry.kind === 'survivorPayout') {
    state.unlocks.trailSurvivorPayout = entry.value;
  } else if (entry.kind === 'fallenPayout') {
    state.unlocks.trailFallenPayout = entry.value;
  } else if (entry.kind === 'trailEvent') {
    const owned = new Set(state.unlocks.trailEvents);
    owned.add(entry.eventId);
    state.unlocks.trailEvents = [...owned];
  } else if (entry.kind === 'forFun') {
    state.unlocks.trailForFun = true;
  } else {
    const items = trailUnlockItems(entry);
    if (!items.length) return { ok: false, reason: 'Unknown Trail shop item.', economy: state };
    const owned = new Set(state.unlocks.trailBossItems);
    for (const item of items) owned.add(item);
    state.unlocks.trailBossItems = [...owned];
  }
  return { ok: true, economy: write(state) };
}

export function settleTrailPayout(
  { survivors = 0, fallen = 0, bonusWeebucks = 0 },
  economy = loadEconomy(),
) {
  const survivorPay = getTrailSurvivorPayout(economy);
  const fallenPay = getTrailFallenPayout(economy);
  const bonus = Math.max(0, Math.floor(Number(bonusWeebucks) || 0));
  const amount =
    Math.max(0, survivors) * survivorPay + Math.max(0, fallen) * fallenPay + bonus;
  return { amount, economy: addPoints(amount, economy), survivorPay, fallenPay, bonusWeebucks: bonus };
}
