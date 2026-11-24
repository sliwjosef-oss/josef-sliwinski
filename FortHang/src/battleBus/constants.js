export const ENEMY_DAMAGE_MULT = 2.0;
export const STORM_DAMAGE_MULT = 2.2;
export const ENEMY_HP_MULT = 2.0;
export const START_PLAYERS = 100;
export const MAX_ITEMS = 10;

export const PHASES = [
  { start: 70, name: 'Hot drop', elims: [5, 12], eventChance: 0.15 },
  { start: 30, name: 'Mid game', elims: [2, 6], eventChance: 0.15 },
  { start: 10, name: 'Storm closing', elims: [2, 4], eventChance: 0.2 },
  { start: 0, name: 'Endgame', elims: [1, 2], eventChance: 0.25 },
];

export const LOOT_AMBUSH = [0.25, 0.15, 0.2, 0.3];
/** Chance to find a Pirate Shop Access Token on a successful chest loot (when unlocked). */
export const PIRATE_SHOP_TOKEN_CHANCE = 0.01;
export const PIRATE_SHOP_TOKEN_BONUS = 500;
export const REST_STORM = [0.05, 0.1, 0.25, 0.35];
export const FIGHT_SNIPER = [0.04, 0.06, 0.08, 0.1];
export const BOOK_IT_AMBUSH = [0.25, 0.25, 0.35, 0.4];
export const SAFE_ROUTE_AMBUSH = [0.05, 0.05, 0.05, 0.08];

/** @type {Record<string, { hp: number, dmg: [number, number], hits: number, elims: number, loot: number }>} */
export const ENEMY_TEAMS = {
  Bots: { hp: 60, dmg: [5, 20], hits: 1, elims: 4, loot: 1 },
  'Normal players': { hp: 120, dmg: [20, 40], hits: 1, elims: 4, loot: 1 },
  Sweats: { hp: 200, dmg: [30, 55], hits: 2, elims: 4, loot: 2 },
  'Solo bot': { hp: 25, dmg: [3, 10], hits: 1, elims: 1, loot: 1 },
  'Solo player': { hp: 45, dmg: [15, 30], hits: 1, elims: 1, loot: 1 },
  'Solo sweat': { hp: 90, dmg: [35, 60], hits: 1, elims: 1, loot: 2 },
  Boss: { hp: 150, dmg: [5, 15], hits: 1, elims: 0, loot: 1 },
};

export const RARE_REWARD = { Sweats: 0.5, 'Solo sweat': 0.3, Boss: 1 };
export const BOSS_FIGHT_AMBUSH = 0.08;

export const ENEMY_SKILL = {
  Bots: [1.3, 0.5],
  'Normal players': [1.0, 0.75],
  Sweats: [0.75, 0.9],
  'Solo bot': [1.3, 0.5],
  'Solo player': [1.0, 0.75],
  'Solo sweat': [0.75, 0.9],
  Boss: [1.0, 0.5],
};

export const WEAPONS = {
  AR: { damage: [10, 20], miss: 0 },
  SMG: { damage: [12, 28], miss: 0.15 },
  Shotgun: { damage: [20, 40], miss: 0.3 },
};

export const DAMAGE_ITEMS = {
  Grenade: [30, 45],
  'Rocket Launcher': [60, 100],
};

export const CHASE = {
  Bots: [0.6, 0.1, [5, 15]],
  'Normal players': [0.4, 0.25, [15, 35]],
  Sweats: [0.2, 0.4, [30, 50]],
  'Solo bot': [0.75, 0.05, [3, 8]],
  'Solo player': [0.55, 0.15, [10, 25]],
  'Solo sweat': [0.35, 0.3, [25, 45]],
  Boss: [1.0, 0.0, [0, 0]],
};

export const SQUAD_TYPES = ['Bots', 'Normal players', 'Sweats'];
export const SQUAD_BASE_ODDS = [50, 35, 15];
export const SOLO_TYPES = ['Solo bot', 'Solo player', 'Solo sweat'];
export const SOLO_BASE_ODDS = [30, 30, 40];

export const READS = {
  Bots: { Bots: 85, 'Normal players': 15 },
  'Normal players': { Bots: 15, 'Normal players': 70, Sweats: 15 },
  Sweats: { 'Normal players': 20, Sweats: 80 },
  'Solo bot': { 'Solo bot': 85, 'Solo player': 15 },
  'Solo player': { 'Solo bot': 15, 'Solo player': 70, 'Solo sweat': 15 },
  'Solo sweat': { 'Solo player': 15, 'Solo sweat': 85 },
};

export const READ_TEXT = {
  Bots: "They're building a staircase to nowhere... these feel like bots.",
  'Normal players': "They're taking cover and trading shots. Feels like normal players.",
  Sweats: 'They threw up a 90s tower in two seconds flat. These are sweats.',
  'Solo bot': 'They keep jumping in place and missing every shot. Definitely a bot.',
  'Solo player': "They're playing it safe behind cover. Seems like a normal player.",
  'Solo sweat': "They're cranking 90s and hitting every shot. A solo-squad sweat.",
};

export const SKINS = {
  'default skins': ['default skin', [30, -10, -20]],
  'Hatsune Miku skins': ['Hatsune Miku skin', [0, 10, -5]],
  'Peely skins': ['Peely skin', [15, 5, -15]],
  'superhero skins': ['superhero skin', [0, 15, -10]],
  'soccer skins': ['soccer skin', [-20, -5, 25]],
  'anime skins': ['anime skin', [-15, 0, 20]],
  'matching skins': ['player in a matching skin', [-20, 0, 20]],
  'mismatched random skins': ['random skin', [0, 10, -5]],
};

export const ACTIVITIES = {
  'dancing in a field': [25, -10, -15],
  'walking in a straight line': [20, -5, -15],
  'looting a house': [0, 10, -5],
  'driving a car around': [0, 10, -5],
  'building a giant fort': [-15, 0, 15],
  'editing walls super fast': [-20, -5, 25],
};

export const SOLO_ACTIVITIES = {
  'crouching in a bush': [25, -5, -20],
  'emoting on a rooftop': [15, 5, -20],
  'fishing by the river': [0, 15, -15],
  'sprinting toward the zone': [0, 10, -10],
  'holding a sniper on the hill': [-15, -5, 20],
  "box-fighting someone who's already down": [-20, -5, 25],
  'carrying a stack of loot from a squad they eliminated': [-20, 0, 20],
};

export const PLACES = [
  'to the north',
  'to the south',
  'to the east',
  'to the west',
  'on the hill',
  'by the river',
  'in the town ahead',
  'near the gas station',
  'on top of a tower',
];

export const GROUP_WORDS = ['a squad of', 'a group of', 'a pack of', 'a trio of', 'a duo of'];
export const SOLO_WORDS = ['a lone', 'a solo', 'a single'];

export const LOOT_TABLE = [
  ['Slurp Juice', 'Epic', 0.05],
  ['Rift-To-Go', 'Legendary', 0.05],
  ['Chug Jug', 'Legendary', 0.01],
  ['Launch Pad', 'Epic', 0.08],
  ['Rocket Launcher', 'Epic', 0.05],
  ['Port-a-Bunker', 'Rare', 0.06],
  ['Bush', 'Rare', 0.1],
  ['Grenade', 'Uncommon', 0.15],
  ['Shield Potion', 'Uncommon', 0.3],
  ['Medkit', 'Common', 0.3],
];

export const RARE_ITEMS = ['Rift-To-Go', 'Chug Jug', 'Launch Pad'];

export const BOSS_LOOT = {
  'Infinity Blade': 1,
  'Mythic Goldfish': 3,
  Kamehameha: 4,
  'Sith Apprentice Lightsaber': 5,
  'Jedi Apprentice Lightsaber': 5,
  Firebending: 5,
  Waterbending: 5,
  Earthbending: 5,
  Airbending: 5,
  "Midas' Drum Gun": 6,
  "TNTina's Boom Bow": 6,
  'Kinetic Blade': 6,
  'Typhoon Blade': 6,
  'Nitro Fists': 6,
  'Shockwave Hammer': 6,
  Kneecapper: 6,
  'Business Turret': 5,
  Jetpack: 5,
  'Port-a-Fort': 5,
  'Chug Jug': 2,
  'Rift-To-Go': 3,
};

export const BOSS_ITEMS = {
  'Mythic Goldfish': { damage: [150, 200], uses: 1, rarity: 'Mythic', text: 'threw the' },
  Kamehameha: { damage: [120, 180], uses: 1, rarity: 'Mythic', text: 'fired a' },
  'Sith Apprentice Lightsaber': {
    damage: [55, 80],
    uses: 4,
    rarity: 'Mythic',
    text: 'slashed with the',
  },
  'Jedi Apprentice Lightsaber': {
    damage: [40, 60],
    uses: 4,
    deflect: 0.4,
    rarity: 'Mythic',
    text: 'slashed with the',
  },
  Firebending: { damage: [50, 75], uses: 3, burn: 20, rarity: 'Mythic', text: 'used' },
  Waterbending: { damage: [30, 45], uses: 4, heal: 25, rarity: 'Mythic', text: 'used' },
  Earthbending: { damage: [35, 50], uses: 3, cover: 1, rarity: 'Mythic', text: 'used' },
  Airbending: { damage: [30, 45], uses: 4, stun: 0.4, rarity: 'Mythic', text: 'used' },
  "Midas' Drum Gun": { damage: [60, 90], uses: 4, rarity: 'Mythic', text: 'used' },
  "TNTina's Boom Bow": {
    damage: [50, 80],
    uses: 4,
    vs_sweats: 1.5,
    rarity: 'Mythic',
    text: 'fired',
  },
  'Kinetic Blade': {
    damage: [40, 60],
    uses: 4,
    escape: 'Dash away',
    rarity: 'Mythic',
    text: 'slashed with the',
  },
  'Typhoon Blade': {
    damage: [45, 65],
    uses: 4,
    deflect: 0.3,
    rarity: 'Mythic',
    text: 'slashed with the',
  },
  'Nitro Fists': { damage: [35, 55], uses: 4, stun: 0.3, rarity: 'Mythic', text: 'punched with' },
  'Shockwave Hammer': {
    damage: [50, 70],
    uses: 3,
    escape: 'Launch away',
    rarity: 'Mythic',
    text: 'smashed with the',
  },
  Kneecapper: { damage: [40, 70], uses: 4, stun: 0.3, rarity: 'Mythic', text: 'swung the' },
  'Business Turret': { uses: 1, turret: 3, rarity: 'Legendary', text: 'deployed a' },
  Jetpack: { uses: 3, escape: 'Fly away', rarity: 'Legendary', text: 'used the' },
  'Port-a-Fort': { uses: 1, cover: 3, rarity: 'Epic', text: 'threw a' },
  'Port-a-Bunker': { uses: 1, cover: 2, rarity: 'Rare', text: 'threw a' },
};

export const TURRET_DAMAGE = [20, 35];
export const INFINITY_BLADE_CHANCE = 0.01;

/** Boss items locked until purchased in the FortHang shop. */
export const TRAIL_SHOP_UNLOCK_ITEMS = {
  'Sith Apprentice Lightsaber': 800,
  'Jedi Apprentice Lightsaber': 800,
  Firebending: 800,
  Waterbending: 800,
  Earthbending: 800,
  Airbending: 800,
  'Infinity Blade': 1200,
  Kamehameha: 800,
  'Mythic Goldfish': 1000,
  'Chug Jug': 1000,
};

export const MULTI_USE = {
  'Infinity Blade': 3,
  ...Object.fromEntries(
    Object.entries(BOSS_ITEMS)
      .filter(([, d]) => (d.uses || 1) > 1)
      .map(([name, d]) => [name, d.uses]),
  ),
};

export const ENV_HEAL = {
  Campfire: [20, 25, 'all'],
  Apples: [20, 10, 'all'],
  Bananas: [10, 15, 'two_lowest'],
  'Fresh water': [10, 20, 'lowest'],
  'Healing barrel': [5, 30, 'all'],
  Nothing: [35, 5, 'all'],
};

export const FIND_TEXT = {
  Campfire: 'You found a campfire and lit it!',
  Apples: 'You found an apple tree. Snack time!',
  Bananas: 'You found some bananas. Peely looks nervous...',
  'Fresh water': 'You found fresh water.',
  'Healing barrel': 'You found a healing barrel! Lucky!',
  Nothing: 'Nothing around, so you just catch your breath.',
};

export const STORM_SCHEDULE = {
  80: [5, 10],
  60: [10, 15],
  40: [15, 25],
  20: [20, 35],
  10: [25, 45],
  5: [35, 60],
};

export const STATUS = {
  0: 'In zone',
  1: 'Edge of zone (!)',
  2: 'IN THE STORM',
  3: 'DEEP STORM',
};

export const SQUAD_EVENT_CHANCE = 0.08;
export const AFK_TURNS = [2, 4];
export const FALL_DAMAGE = [10, 30];
export const AFK_REASONS = [
  'had to go eat dinner',
  'got called away by their mom',
  'went to grab a snack',
  'had their controller die',
  'had to take out the trash',
];
export const FALL_REASONS = [
  'jumped off a house',
  'jumped off a hill',
  'missed a jump between rooftops',
  'fell off a bridge',
  'tried to slide down a cliff',
];

/** Death flavor lines. `{name}` is replaced with the fallen skin name. */
export const DEATH_BLURBS = {
  squad: [
    '{name} got third-partied while reloading.',
    '{name} tried to build, panicked, and built a single floor tile.',
    '{name} peeked at the wrong time and got beamed.',
    '{name} held his ground bravely. The other squad held theirs better.',
    '{name} was surrounded on three sides and ran out of walls.',
  ],
  sweats: [
    '{name} got boxed in and edited out of existence.',
    '{name} never saw it coming. Neither did the tower he was standing on.',
    '{name} lost a build fight so fast it looked like a cutscene.',
  ],
  solo: [
    "{name} got clutched on by a solo who's probably telling his friends about it right now.",
    'A lone player crouch-walked up behind {name} and ended him.',
    '{name} lost a 1v1 to someone who was definitely playing on a controller.',
  ],
  boss: [
    '{name} tried to take the vault and the boss said no.',
    "{name} walked into the boss's room with full confidence and left with none.",
  ],
  sniper: [
    '{name} stood still for one second too long.',
    '{name} was hit from so far away the shooter was basically in another zone.',
    '{name} never even heard the shot.',
  ],
  storm: [
    '{name} thought he could make it. He could not make it.',
    '{name} stayed for one more chest.',
    '{name} ran out of time, out of heals, and out of zone.',
    '{name} was last seen running toward the circle. The circle won.',
  ],
  fall: [
    "{name} forgot he wasn't on a launch pad.",
    "{name} jumped off the tower to look cool. It didn't go well.",
  ],
  oregon: [
    '{name} has died of dysentery. Nobody knows how.',
    '{name} has died of exhaustion. He should have rested at that campfire.',
  ],
};

export const OREGON_DEATH_CHANCE = 0.05;
