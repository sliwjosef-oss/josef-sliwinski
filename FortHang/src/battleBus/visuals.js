import { getCatalogueSeriesKey } from '../utils/seriesSort';

/** Squad flavor pools shown in encounter text + event images. */
export const SQUAD_VISUAL_POOLS = [
  {
    key: 'anime-legends',
    groupLabel: 'Anime Legends skins',
    soloLabel: 'Anime Legends skin',
    series: ['anime-legends'],
    odds: [-15, 0, 20],
  },
  {
    key: 'anime-originals',
    groupLabel: 'Anime Originals skins',
    soloLabel: 'Anime Originals skin',
    series: ['anime-originals'],
    odds: [-15, 0, 20],
  },
  {
    key: 'cartoon',
    groupLabel: 'Cartoon Legends skins',
    soloLabel: 'Cartoon Legends skin',
    series: ['cartoon'],
    odds: [-10, 5, 10],
  },
  {
    key: 'star-wars',
    groupLabel: 'Star Wars skins',
    soloLabel: 'Star Wars skin',
    series: ['star-wars'],
    odds: [-5, 5, 10],
  },
  {
    key: 'marvel',
    groupLabel: 'Marvel skins',
    soloLabel: 'Marvel skin',
    series: ['marvel'],
    odds: [-5, 10, 5],
  },
  {
    key: 'icon',
    groupLabel: 'Icon skins',
    soloLabel: 'Icon skin',
    series: ['icon'],
    odds: [0, 10, 0],
  },
  {
    key: 'gaming-legends',
    groupLabel: 'Gaming Legends skins',
    soloLabel: 'Gaming Legends skin',
    series: ['gaming-legends'],
    odds: [-10, 0, 15],
  },
  {
    key: 'sports',
    groupLabel: 'sports skins',
    soloLabel: 'sports skin',
    series: ['sports', 'nfl'],
    odds: [-47, -32, 80],
  },
  {
    key: 'space',
    groupLabel: 'Space Explorer skins',
    soloLabel: 'Space Explorer skin',
    series: ['space-voyagers'],
    odds: [5, 5, -5],
  },
  {
    key: 'tv-legends',
    groupLabel: 'TV Legends skins',
    soloLabel: 'TV Legends skin',
    series: ['tv-legends'],
    odds: [-10, 5, 10],
  },
  {
    key: 'peely',
    groupLabel: 'Peely skins',
    soloLabel: 'Peely skin',
    series: ['nanners'],
    odds: [15, 5, -15],
  },
  {
    key: 'dc',
    groupLabel: 'DC skins',
    soloLabel: 'DC skin',
    series: ['dc'],
    odds: [-5, 10, 5],
  },
  {
    key: 'aliens',
    groupLabel: 'Alien skins',
    soloLabel: 'Alien skin',
    series: ['aliens'],
    odds: [0, 5, 5],
  },
  {
    key: 'midas-family',
    groupLabel: 'Midas Family skins',
    soloLabel: 'Midas Family skin',
    series: ['midas-family'],
    odds: [-10, 0, 15],
  },
  {
    key: 'winterfest',
    groupLabel: 'Winterfest skins',
    soloLabel: 'Winterfest skin',
    series: ['winterfest'],
    odds: [10, 5, -10],
  },
  {
    key: 'fortnightmares',
    groupLabel: 'Fortnightmares skins',
    soloLabel: 'Fortnightmares skin',
    series: ['fortnightmares'],
    odds: [-5, 0, 10],
  },
  {
    key: 'wwe-legends',
    groupLabel: 'WWE Legends skins',
    soloLabel: 'WWE Legends skin',
    series: ['wwe-legends'],
    odds: [-15, 0, 20],
  },
  {
    key: 'food',
    groupLabel: 'Food skins',
    soloLabel: 'Food skin',
    series: ['food'],
    odds: [15, 5, -15],
  },
  {
    key: 'toys',
    groupLabel: 'Toy skins',
    soloLabel: 'Toy skin',
    series: ['toys'],
    odds: [10, 5, -10],
  },
  {
    key: 'robots',
    groupLabel: 'Robot skins',
    soloLabel: 'Robot skin',
    series: ['robots'],
    odds: [-5, 5, 5],
  },
  {
    key: 'animals',
    groupLabel: 'Animal skins',
    soloLabel: 'Animal skin',
    series: ['animals'],
    odds: [5, 10, -5],
  },
];

/** Boss portrait pools — collabs only, never general collaborations. */
export const BOSS_SERIES_KEYS = [
  'icon',
  'marvel',
  'star-wars',
  'gaming-legends',
  'other-collab-skins',
  'anime-legends',
  'anime-originals',
  'cartoon',
  'tv-legends',
  'wwe-legends',
  'dc',
];

/**
 * Fortnite.gg item image IDs → https://fortnite.gg/img/items/{id}/icon.png
 * Fill in as IDs are confirmed on fortnite.gg; missing IDs use the labeled item card.
 */
export const FORTNITE_GG_ITEM_IDS = {
  Medkit: null,
  'Shield Potion': null,
  Bandage: null,
  'Chug Jug': null,
  'Slurp Juice': null,
  Grenade: null,
  'Rocket Launcher': null,
  'Launch Pad': null,
  'Rift-To-Go': null,
  Bush: null,
  'Port-a-Bunker': null,
  'Port-a-Fort': null,
  'Infinity Blade': null,
  Kamehameha: null,
  'Mythic Goldfish': null,
  'Sith Apprentice Lightsaber': null,
  'Jedi Apprentice Lightsaber': null,
  Firebending: null,
  Waterbending: null,
  Earthbending: null,
  Airbending: null,
  "Midas' Drum Gun": null,
  "TNTina's Boom Bow": null,
  'Kinetic Blade': null,
  'Typhoon Blade': null,
  'Nitro Fists': null,
  'Shockwave Hammer': null,
  Kneecapper: null,
  'Business Turret': null,
  Jetpack: null,
  AR: null,
  SMG: null,
  Shotgun: null,
};

/** Slug used on https://fortnite.gg/weapons/weapon/{slug} */
export const FORTNITE_GG_WEAPON_SLUGS = {
  Medkit: 'med-kit',
  'Med Kit': 'med-kit',
  'Shield Potion': 'shield-potion',
  Bandage: 'bandage',
  'Chug Jug': 'chug-jug',
  'Slurp Juice': 'slurp-juice',
  Grenade: 'grenade',
  'Rocket Launcher': 'rocket-launcher',
  'Launch Pad': 'launch-pad',
  'Rift-To-Go': 'rift-to-go',
  Bush: 'bush',
  'Port-a-Bunker': 'port-a-bunker',
  'Port-a-Fort': 'port-a-fort',
  'Infinity Blade': 'infinity-blade',
  AR: 'assault-rifle',
  SMG: 'tactical-submachine-gun',
  Shotgun: 'pump-shotgun',
};

/** Prefer png, fall back to jpg in the UI onError. */
export function getFortniteGgIconUrls(itemName) {
  const id = FORTNITE_GG_ITEM_IDS[itemName];
  if (!id) return [];
  return [
    `https://fortnite.gg/img/items/${id}/icon.png`,
    `https://fortnite.gg/img/items/${id}/icon.jpg`,
  ];
}

export function getFortniteGgWeaponPage(itemName) {
  const slug = FORTNITE_GG_WEAPON_SLUGS[itemName];
  if (!slug) return null;
  return `https://fortnite.gg/weapons/weapon/${slug}`;
}
export function groupOutfitsBySeriesKey(outfits = []) {
  const map = new Map();
  for (const outfit of outfits) {
    const key = getCatalogueSeriesKey(outfit);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(outfit);
  }
  return map;
}

function shuffle(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function pickOutfitsFromSeries(bySeries, seriesKeys, count) {
  const pool = [];
  for (const key of seriesKeys) {
    const list = bySeries.get(key);
    if (list?.length) pool.push(...list);
  }
  // Ownership never gates encounters — fall back to the full catalogue if needed.
  if (!pool.length) {
    for (const list of bySeries.values()) {
      if (list?.length) pool.push(...list);
    }
  }
  if (!pool.length) return [];
  return shuffle(pool).slice(0, Math.max(1, count));
}

export function pickRandomPool(pools = SQUAD_VISUAL_POOLS) {
  return pools[Math.floor(Math.random() * pools.length)];
}

export function squadCountFromGroupWord(word = '') {
  if (word.includes('duo')) return 2;
  if (word.includes('trio')) return 3;
  return 4;
}
