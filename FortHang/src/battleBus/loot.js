import { hasAchievement } from '../utils/achievementStore';

/** Rarity-first loot. Roll a tier, then an unlocked item from that tier's pool. */

export const TIER_ORDER = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic'];

export const EMPTY_CHEST_CHANCE = 0.3;

/** @type {Record<string, { rarity: string, pools: string[], lootWeight: number, shop?: boolean }>} */
export const LOOT_ITEMS = {
  Medkit: { rarity: 'Common', pools: ['loot'], lootWeight: 1 },
  'Shield Potion': { rarity: 'Common', pools: ['loot'], lootWeight: 1 },
  Grenade: { rarity: 'Common', pools: ['loot'], lootWeight: 1 },
  Clinger: { rarity: 'Uncommon', pools: ['loot'], lootWeight: 1 },
  'Port-a-Bunker': { rarity: 'Uncommon', pools: ['loot'], lootWeight: 1 },
  'Chug Splash': { rarity: 'Uncommon', pools: ['loot'], lootWeight: 1 },
  Bush: { rarity: 'Rare', pools: ['loot'], lootWeight: 1 },
  'Slurp Juice': { rarity: 'Rare', pools: ['loot'], lootWeight: 2 },
  'Boogie Bomb': { rarity: 'Rare', pools: ['loot'], lootWeight: 1 },
  'Launch Pad': { rarity: 'Epic', pools: ['loot'], lootWeight: 1 },
  'Shield Keg': { rarity: 'Epic', pools: ['loot'], lootWeight: 1 },
  'Rocket Launcher': { rarity: 'Epic', pools: ['loot'], lootWeight: 1 },
  'Port-a-Fort': { rarity: 'Epic', pools: ['loot', 'boss'], lootWeight: 1 },
  Jetpack: { rarity: 'Epic', pools: ['loot', 'boss'], lootWeight: 1 },
  'Business Turret': { rarity: 'Epic', pools: ['loot', 'boss'], lootWeight: 1 },
  Kneecapper: { rarity: 'Epic', pools: ['loot', 'boss'], lootWeight: 1 },
  Leekcapper: { rarity: 'Epic', pools: [], lootWeight: 1 },
  'Rift-To-Go': { rarity: 'Legendary', pools: ['loot', 'boss'], lootWeight: 2 },
  'Chug Jug': { rarity: 'Legendary', pools: ['loot', 'boss'], lootWeight: 6, shop: true },
  'Kinetic Blade': { rarity: 'Legendary', pools: ['loot', 'boss'], lootWeight: 1 },
  'Typhoon Blade': { rarity: 'Legendary', pools: ['loot', 'boss'], lootWeight: 1 },
  'Nitro Fists': { rarity: 'Legendary', pools: ['loot', 'boss'], lootWeight: 1 },
  'Shockwave Hammer': { rarity: 'Legendary', pools: ['loot', 'boss'], lootWeight: 1 },
  'Port-a-Fortress': { rarity: 'Legendary', pools: ['loot', 'boss'], lootWeight: 1 },
  "Midas' Drum Gun": { rarity: 'Mythic', pools: ['loot', 'boss'], lootWeight: 1 },
  "TNTina's Boom Bow": { rarity: 'Mythic', pools: ['loot', 'boss'], lootWeight: 1 },
  'Buggy Bomb': { rarity: 'Mythic', pools: ['loot', 'boss'], lootWeight: 1 },
  'Stick of Truth': { rarity: 'Mythic', pools: ['loot', 'boss'], lootWeight: 1 },
  Firebending: { rarity: 'Mythic', pools: ['loot', 'boss'], lootWeight: 1, shop: true },
  Waterbending: { rarity: 'Mythic', pools: ['loot', 'boss'], lootWeight: 1, shop: true },
  Earthbending: { rarity: 'Mythic', pools: ['loot', 'boss'], lootWeight: 1, shop: true },
  Airbending: { rarity: 'Mythic', pools: ['loot', 'boss'], lootWeight: 1, shop: true },
  'Sith Apprentice Lightsaber': { rarity: 'Mythic', pools: ['loot', 'boss'], lootWeight: 1, shop: true },
  'Jedi Apprentice Lightsaber': { rarity: 'Mythic', pools: ['loot', 'boss'], lootWeight: 1, shop: true },
  Kamehameha: { rarity: 'Mythic', pools: ['loot', 'boss'], lootWeight: 1, shop: true },
  'Mythic Goldfish': { rarity: 'Mythic', pools: ['loot', 'boss'], lootWeight: 1, shop: true },
  'Infinity Blade': { rarity: 'Mythic', pools: ['boss'], lootWeight: 1, shop: true },
};

export const DROP_TABLES = {
  bots: { Common: 49.5, Uncommon: 30, Rare: 12, Epic: 5.5, Legendary: 2.5, Mythic: 0.5 },
  players: { Common: 40, Uncommon: 28, Rare: 16, Epic: 10, Legendary: 5, Mythic: 1 },
  sweats: { Common: 0, Uncommon: 0, Rare: 52, Epic: 30, Legendary: 14, Mythic: 4 },
  boss: { Common: 0, Uncommon: 0, Rare: 0, Epic: 45, Legendary: 40, Mythic: 15 },
};

export const TABLE_POOL = {
  bots: 'loot',
  players: 'loot',
  sweats: 'loot',
  boss: 'boss',
};

export const CHEST_ONLY_ITEMS = Object.entries(LOOT_ITEMS)
  .filter(([, item]) => item.pools.length === 1 && item.pools[0] === 'loot')
  .map(([name]) => name);

export function itemRarity(name) {
  return LOOT_ITEMS[name]?.rarity || 'Common';
}

/** One random item of a rarity that can actually drop. Shop items stay locked until unlocked. */
export function rollItemByRarity(rarity, { unlocked = new Set(), rand = Math.random } = {}) {
  const options = Object.entries(LOOT_ITEMS)
    .filter(([name, item]) => {
      if (item.rarity !== rarity) return false;
      if (!item.pools.includes('loot') && !item.pools.includes('boss')) return false;
      if (item.shop && !unlocked.has(name)) return false;
      if (name === 'Buggy Bomb' && !hasAchievement('bet-from-losers')) return false;
      return true;
    })
    .map(([name]) => name);
  if (!options.length) return null;
  return options[Math.floor(rand() * options.length)];
}

function weighted(entries, rand) {
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  if (total <= 0) return null;
  let roll = rand() * total;
  for (const [value, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return value;
  }
  return entries[entries.length - 1][0];
}

function candidates(tier, pool, unlocked) {
  const options = [];
  for (const [name, item] of Object.entries(LOOT_ITEMS)) {
    if (item.rarity !== tier || !item.pools.includes(pool)) continue;
    if (name === 'Buggy Bomb' && !hasAchievement('bet-from-losers')) continue;
    if (item.shop && !unlocked.has(name)) continue;
    options.push([name, pool === 'loot' ? item.lootWeight : 1]);
  }
  return options;
}

/**
 * @param {'bots'|'players'|'sweats'|'boss'} tableName
 * @param {{ unlocked?: Set<string>, isChest?: boolean, rand?: () => number }} [options]
 * @returns {string | null}
 */
export function rollLootDrop(tableName, { unlocked = new Set(), isChest = false, rand = Math.random } = {}) {
  if (isChest && rand() < EMPTY_CHEST_CHANCE) return null;

  const table = DROP_TABLES[tableName];
  const pool = TABLE_POOL[tableName];
  const liveTiers = TIER_ORDER.filter((tier) => table[tier] > 0);
  let index = TIER_ORDER.indexOf(weighted(liveTiers.map((tier) => [tier, table[tier]]), rand));
  while (index >= 0) {
    const options = candidates(TIER_ORDER[index], pool, unlocked);
    if (options.length) return weighted(options, rand);
    index -= 1;
  }
  return null;
}

export function lootTableForEnemy(enemy) {
  if (enemy === 'Boss') return 'boss';
  if (enemy === 'Sweats' || enemy === 'Solo sweat') return 'sweats';
  if (enemy === 'Bots' || enemy === 'Solo bot') return 'bots';
  return 'players';
}
