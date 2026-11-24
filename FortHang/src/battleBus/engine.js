import {
  ACTIVITIES,
  AFK_REASONS,
  AFK_TURNS,
  BOOK_IT_AMBUSH,
  BOSS_FIGHT_AMBUSH,
  BOSS_ITEMS,
  BOSS_LOOT,
  CHASE,
  DAMAGE_ITEMS,
  ENEMY_DAMAGE_MULT,
  ENEMY_HP_MULT,
  ENEMY_SKILL,
  ENEMY_TEAMS,
  ENV_HEAL,
  DEATH_BLURBS,
  FALL_DAMAGE,
  FALL_REASONS,
  OREGON_DEATH_CHANCE,
  FIGHT_SNIPER,
  FIND_TEXT,
  GROUP_WORDS,
  LOOT_AMBUSH,
  LOOT_TABLE,
  MAX_ITEMS,
  PIRATE_SHOP_TOKEN_BONUS,
  PIRATE_SHOP_TOKEN_CHANCE,
  MULTI_USE,
  PHASES,
  PLACES,
  RARE_ITEMS,
  RARE_REWARD,
  READ_TEXT,
  READS,
  REST_STORM,
  SAFE_ROUTE_AMBUSH,
  SOLO_ACTIVITIES,
  SOLO_WORDS,
  SQUAD_EVENT_CHANCE,
  STATUS,
  STORM_DAMAGE_MULT,
  STORM_SCHEDULE,
  TRAIL_SHOP_UNLOCK_ITEMS,
  TURRET_DAMAGE,
  WEAPONS,
} from './constants';
import {
  BOSS_SERIES_KEYS,
  getFortniteGgIconUrls,
  getFortniteGgWeaponPage,
  groupOutfitsBySeriesKey,
  pickOutfitsFromSeries,
} from './visuals';
import {
  aliveCount,
  buildLobby,
  countLobbyAlive,
  groupEnemyType,
  killLobbyMembers,
  livingSquads,
  pickSquadForSize,
  soloEnemyType,
  takeAliveMembers,
} from './lobby';

function rand() {
  return Math.random();
}
function randInt(lo, hi) {
  return lo + Math.floor(rand() * (hi - lo + 1));
}
function pick(arr) {
  return arr[Math.floor(rand() * arr.length)];
}
function weighted(entries) {
  const total = entries.reduce((sum, [, w]) => sum + Math.max(0, w), 0);
  let roll = rand() * total;
  for (const [value, weight] of entries) {
    roll -= Math.max(0, weight);
    if (roll <= 0) return value;
  }
  return entries[entries.length - 1][0];
}

/**
 * @param {{
 *   partyNames: string[],
 *   sidekickName?: string | null,
 *   outfits?: object[],
 *   partyOutfits?: object[],
 *   startingHpByName?: Record<string, number>,
 *   fightResistByName?: Record<string, number>,
 *   stormResistByName?: Record<string, number>,
 *   stormResist?: number,
 *   fightResist?: number,
 *   unlockedBossItems?: string[] | Set<string>,
 *   unlockedEvents?: string[] | Set<string>,
 *   discoveredSkinIds?: string[] | Set<string>,
 *   forFun?: boolean,
 *   log: (line: string) => void,
 *   clearLog?: () => void,
 *   choose: (options: string[]) => Promise<string>,
 *   onSquadUpdate?: (update: {
 *     members: Array<{
 *       name: string,
 *       sidekick: boolean,
 *       hp: number,
 *       maxHp: number,
 *       shield: number,
 *       alive: boolean,
 *       afkTurns: number,
 *     }>,
 *     playersLeft: number,
 *   }) => void,
 *   onEventVisual?: (visual: object | null) => void,
 * }} opts
 */
export async function playTrailMatch({
  partyNames,
  sidekickName,
  outfits = [],
  partyOutfits = [],
  startingHpByName = {},
  fightResistByName = {},
  stormResistByName = {},
  stormResist = 0,
  fightResist = 0,
  unlockedBossItems = [],
  unlockedEvents = [],
  discoveredSkinIds = [],
  forFun = false,
  log,
  clearLog,
  choose,
  onSquadUpdate,
  onEventVisual,
}) {
  const unlocked = new Set(unlockedBossItems);
  const eventUnlocks = new Set(unlockedEvents);
  const discoveredIds = new Set(discoveredSkinIds);
  const isRanked = !forFun;
  const encounterLabel = (outfit, fallback = '???') => {
    if (!outfit) return fallback;
    if (outfit.id && discoveredIds.has(outfit.id)) return outfit.name;
    return '???';
  };
  const sidekick = sidekickName || null;
  const names = sidekick
    ? [...partyNames.slice(0, 4), sidekick]
    : [...partyNames.slice(0, 4)];
  // `outfits` is the full game catalogue; encounter picks ignore hangman discovery.
  const bySeries = groupOutfitsBySeriesKey(outfits);
  const partyByName = new Map(
    [...partyOutfits, ...outfits.filter((o) => names.includes(o.name))].map((o) => [o.name, o]),
  );
  const startHpFor = (name) => {
    const value = Number(startingHpByName[name]);
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 100;
  };
  // 95 NPCs → 23 squads of 4 + one remnant squad of 3; skins unique vs party + each other.
  const LOBBY_NPCS = 95;
  const lobby = buildLobby({
    outfits,
    excludeNames: names,
    excludeIds: [
      ...partyOutfits.map((o) => o?.id).filter(Boolean),
      ...outfits.filter((o) => names.includes(o.name)).map((o) => o.id),
    ],
    count: LOBBY_NPCS,
  });
  let lastEncounterOutfits = [];
  /** @type {{ squadId: number, members: Array<{ outfit: object, alive: boolean }> } | null} */
  let lastEncounterRef = null;

  const emitVisual = (visual) => {
    onEventVisual?.(visual);
  };
  const showMemberEvent = (name, caption, extra = {}) => {
    emitVisual({
      kind: 'member',
      caption,
      memberName: name,
      outfits: partyByName.get(name) ? [partyByName.get(name)] : [],
      ...extra,
    });
  };
  const emitEnemyStatus = (enemy, hp, maxHp, { hidden = false, hpHidden = false } = {}) => {
    const label = hidden ? '???' : enemy === 'Boss' ? 'Boss' : enemy;
    emitVisual({
      kind: 'enemy',
      caption: hpHidden ? `Spotted: ${label}` : `Fight vs ${label}`,
      enemyLabel: label,
      enemyType: enemy,
      hp: Math.max(0, hp),
      maxHp,
      hpHidden: Boolean(hpHidden),
      outfits: lastEncounterOutfits.slice(0, enemy.startsWith('Solo') ? 1 : 4),
    });
  };

  const S = {
    squad: Object.fromEntries(
      names.map((n) => {
        const maxHp = startHpFor(n);
        return [n, { hp: maxHp, maxHp, shield: 0 }];
      }),
    ),
    inventory: { Medkit: 1 },
    itemUses: {},
    fortRounds: 0,
    enemyStunned: false,
    turretRounds: 0,
    burnDamage: 0,
    kills: { squad: 0, solo: 0, boss: 0 },
    playersLeft: names.length + countLobbyAlive(lobby),
    damage: 0,
    stormDistance: 0,
    stormDamage: [0, 0],
    stormMult: 1,
    nextShrinks: Object.keys(STORM_SCHEDULE)
      .map(Number)
      .sort((a, b) => b - a),
    campfireTurns: 0,
    vaultTurns: 0,
    bonusWeebucks: 0,
    turn: 1,
    afk: {},
    lastHit: {},
    fallen: [],
  };

  const emitSquad = () => {
    if (!onSquadUpdate) return;
    onSquadUpdate({
      members: names.map((name) => {
        const member = S.squad[name];
        return {
          name,
          sidekick: name === sidekick,
          hp: member ? member.hp : 0,
          maxHp: member ? member.maxHp : startHpFor(name),
          shield: member ? member.shield : 0,
          alive: Boolean(member),
          afkTurns: S.afk[name] || 0,
        };
      }),
      playersLeft: S.playersLeft,
    });
  };

  const phaseIndex = () => {
    for (let i = 0; i < PHASES.length; i += 1) {
      if (S.playersLeft >= PHASES[i].start) return i;
    }
    return PHASES.length - 1;
  };
  const chance = (table) => table[phaseIndex()] + S.damage / 1500;
  const activeMembers = () => Object.keys(S.squad).filter((m) => !S.afk[m]);
  const has = (item) => (S.inventory[item] || 0) > 0;
  const useItem = (item) => {
    S.inventory[item] -= 1;
    if (S.inventory[item] <= 0) delete S.inventory[item];
  };
  const rarityOf = (item) => BOSS_ITEMS[item]?.rarity || LOOT_TABLE.find((row) => row[0] === item)?.[1] || 'Common';

  const showSquad = () => {
    emitSquad();
    for (const name of Object.keys(S.squad)) {
      if (!S.afk[name]) continue;
      const label = name === sidekick ? `${name}*` : name;
      log(`${label} is AFK · back in ${S.afk[name]}`);
    }
  };
  const usesLeftFor = (item) => {
    if (!MULTI_USE[item]) return null;
    const left = Number(S.itemUses[item]);
    return Number.isFinite(left) ? left : MULTI_USE[item];
  };

  const showInventory = () => {
    const parts = Object.entries(S.inventory).map(([item, n]) => {
      let label = `${item} x${n}`;
      const left = usesLeftFor(item);
      if (left != null) label += ` (${left} use${left === 1 ? '' : 's'} left)`;
      return label;
    });
    log(parts.length ? `Items: ${parts.join(', ')}` : 'Items: (none)');
  };

  const give = (item) => {
    if (MULTI_USE[item] && has(item)) {
      S.itemUses[item] = MULTI_USE[item];
      log(`* Found another ${item} — uses refilled!`);
      emitVisual({
        kind: 'item',
        caption: `Refilled ${item}`,
        itemName: item,
        rarity: rarityOf(item),
        iconUrls: getFortniteGgIconUrls(item),
        weaponPage: getFortniteGgWeaponPage(item),
      });
      return;
    }
    const count = Object.values(S.inventory).reduce((a, b) => a + b, 0);
    if (count >= MAX_ITEMS) {
      log(`You found a ${item}, but your inventory is full!`);
      return;
    }
    S.inventory[item] = (S.inventory[item] || 0) + 1;
    if (MULTI_USE[item]) S.itemUses[item] = MULTI_USE[item];
    log(`* Found: ${item} (${rarityOf(item)})!`);
    emitVisual({
      kind: 'item',
      caption: `Found ${item}`,
      itemName: item,
      rarity: rarityOf(item),
      iconUrls: getFortniteGgIconUrls(item),
      weaponPage: getFortniteGgWeaponPage(item),
    });
  };

  const useMulti = (item) => {
    const maxUses = MULTI_USE[item] || BOSS_ITEMS[item]?.uses || 1;
    if (!Number.isFinite(Number(S.itemUses[item]))) {
      S.itemUses[item] = maxUses;
    }
    S.itemUses[item] = Math.max(0, Number(S.itemUses[item]) - 1);
    const left = S.itemUses[item];
    if (left <= 0) {
      useItem(item);
      delete S.itemUses[item];
      log(`The ${item} breaks!`);
    } else {
      log(`${item}: ${left} use${left === 1 ? '' : 's'} left.`);
    }
    return left;
  };

  const rollLoot = () => {
    const oddsOf = (name) => LOOT_TABLE.find((row) => row[0] === name)?.[2] ?? 0;
    if (unlocked.has('Chug Jug') && rand() < oddsOf('Chug Jug')) {
      give('Chug Jug');
      return;
    }
    if (rand() < oddsOf('Slurp Juice')) {
      give('Slurp Juice');
      return;
    }
    for (const [item, , odds] of LOOT_TABLE) {
      if (item === 'Chug Jug' || item === 'Slurp Juice') continue;
      if (rand() < odds) {
        give(item);
        return;
      }
    }
    log('Nothing special in this one.');
  };

  const bossLootPool = () =>
    Object.fromEntries(
      Object.entries(BOSS_LOOT).filter(
        ([item]) => !(item in TRAIL_SHOP_UNLOCK_ITEMS) || unlocked.has(item),
      ),
    );

  const giveRare = (fromBoss = false) => {
    if (fromBoss) {
      const pool = bossLootPool();
      const entries = Object.entries(pool);
      if (!entries.length) return;
      give(weighted(entries));
      return;
    }
    give(pick(RARE_ITEMS.filter((item) => item !== 'Chug Jug' || unlocked.has('Chug Jug'))));
  };

  const isMythicBossItem = (item) =>
    item === 'Infinity Blade' || BOSS_ITEMS[item]?.rarity === 'Mythic';

  const mythicBossEntries = () =>
    Object.entries(bossLootPool()).filter(([item]) => isMythicBossItem(item));

  const giveMythicBoss = () => {
    const entries = mythicBossEntries();
    if (!entries.length) {
      log('No Mythic boss loot is unlocked yet.');
      return false;
    }
    give(weighted(entries));
    return true;
  };

  const causeOf = (enemy) => {
    if (enemy === 'Boss') return 'the boss';
    if (enemy === 'Sweats' || enemy === 'Solo sweat') return 'sweats';
    if (String(enemy).startsWith('Solo')) return 'a solo player';
    return 'an enemy squad';
  };

  const deathBlurbKey = (cause) => {
    if (cause === 'the Storm') return 'storm';
    if (cause === 'a sniper') return 'sniper';
    if (cause === 'the boss') return 'boss';
    if (cause === 'sweats') return 'sweats';
    if (cause === 'a solo player') return 'solo';
    if (cause === 'fall damage') return 'fall';
    return 'squad';
  };

  const deathBlurb = (name, cause) => {
    const pool =
      rand() < OREGON_DEATH_CHANCE
        ? DEATH_BLURBS.oregon
        : DEATH_BLURBS[deathBlurbKey(cause)] || DEATH_BLURBS.squad;
    return pick(pool).replaceAll('{name}', name);
  };

  const applyResist = (amount, resist) => {
    const factor = Math.max(0, Math.min(0.95, Number(resist) || 0));
    return Math.max(1, Math.floor(amount * (1 - factor)));
  };

  const fightDamage = (name, amount, cause = 'an enemy') => {
    S.lastHit[name] = cause;
    const s = S.squad[name];
    const personal = Number(fightResistByName[name]) || 0;
    const reduced = applyResist(amount, fightResist + personal);
    const absorbed = Math.min(s.shield, reduced);
    s.shield -= absorbed;
    s.hp -= reduced - absorbed;
    S.damage += Math.floor((reduced - absorbed) / 4);
    if (absorbed && s.shield === 0) log(`${name}'s shield broke!`);
    const note = reduced < amount ? ` (resisted to ${reduced})` : '';
    log(`${name} took ${reduced} damage (${absorbed} shield, ${reduced - absorbed} HP)${note}`);
    emitSquad();
  };

  const stormHit = (name, amount) => {
    S.lastHit[name] = 'the Storm';
    const personal = Number(stormResistByName[name]) || 0;
    const reduced = applyResist(amount, stormResist + personal);
    S.squad[name].hp -= reduced;
    S.damage += Math.floor(reduced / 4);
    emitSquad();
  };

  const sniperHit = (name) => {
    S.lastHit[name] = 'a sniper';
    const s = S.squad[name];
    if (s.shield > 0) {
      s.shield = 0;
      log(`A sniper shot ${name}! Their shield shattered, but they're alive.`);
    } else {
      s.hp = 0;
      log(`A sniper eliminated ${name} instantly — no shield to stop it!`);
    }
    emitSquad();
  };

  const removeEliminated = async () => {
    const dead = Object.keys(S.squad).filter((n) => S.squad[n].hp <= 0);
    if (!dead.length) return false;
    for (const name of dead) {
      const cause = S.lastHit[name] || 'the island';
      const blurb = deathBlurb(name, cause);
      log(`*** ${blurb} ***`);
      log(`(${name} was eliminated by ${cause}. They can't be revived.)`);
      showMemberEvent(name, blurb, {
        kind: 'death',
        crossedOut: true,
      });
      emitSquad();
      await choose(['Continue']);
      S.fallen.push({ name, cause, blurb, playersLeft: S.playersLeft });
      delete S.squad[name];
      delete S.afk[name];
      syncPlayersLeft();
    }
    return true;
  };

  const ENDGAME_LOCK = 10;
  let endgameNoted = false;
  const noteEndgame = () => {
    if (endgameNoted || S.playersLeft > ENDGAME_LOCK) return;
    endgameNoted = true;
    log(
      'Only 10 players left. From here, the others only go down if you attack them — or they ambush you. Ambushes are much more common now.',
    );
  };
  const inFinalCircle = () => S.playersLeft <= ENDGAME_LOCK;
  const syncPlayersLeft = () => {
    S.playersLeft = Object.keys(S.squad).length + countLobbyAlive(lobby);
    noteEndgame();
    emitSquad();
  };
  const eliminateOthers = (n, { fromFight = false, preferSquadId = null } = {}) => {
    if (!fromFight && S.playersLeft <= ENDGAME_LOCK) return;
    const alive = Object.keys(S.squad).length;
    const lobbyAlive = countLobbyAlive(lobby);
    if (!fromFight) {
      const maxKill = Math.max(0, lobbyAlive - Math.max(0, ENDGAME_LOCK - alive));
      n = Math.min(n, maxKill);
    }
    if (n <= 0) {
      syncPlayersLeft();
      return;
    }
    killLobbyMembers(lobby, n, { preferSquadId });
    syncPlayersLeft();
  };

  const enemyMaxHp = (enemy) => Math.floor(ENEMY_TEAMS[enemy].hp * ENEMY_HP_MULT);

  const setEncounter = (squad, members) => {
    lastEncounterRef = { squadId: squad.id, members };
    lastEncounterOutfits = members.map((member) => member.outfit);
  };

  const groupWordFor = (count) => {
    if (count <= 1) return pick(SOLO_WORDS);
    if (count === 2) return 'a duo of';
    if (count === 3) return 'a trio of';
    const full = GROUP_WORDS.filter((word) => !word.includes('duo') && !word.includes('trio'));
    return pick(full.length ? full : ['a squad of']);
  };

  const describeFromLobby = (wantSize) => {
    const squad = pickSquadForSize(lobby, wantSize) || pickSquadForSize(lobby, 1);
    if (!squad) {
      lastEncounterRef = null;
      lastEncounterOutfits = [];
      return ['a stray player', 'Solo player'];
    }
    const size = Math.min(wantSize, aliveCount(squad));
    const members = takeAliveMembers(squad, Math.max(1, size));
    setEncounter(squad, members);
    const activity =
      members.length === 1
        ? pick(Object.keys(SOLO_ACTIVITIES))
        : pick(Object.keys(ACTIVITIES));
    const enemy =
      members.length === 1 ? soloEnemyType(squad.type) : groupEnemyType(squad.type);
    const text = `${groupWordFor(members.length)} ${
      members.length === 1 ? 'player' : 'players'
    } ${activity} ${pick(PLACES)}`;
    emitVisual({
      kind: 'skins',
      caption: text,
      outfits: lastEncounterOutfits,
    });
    return [text, enemy];
  };

  const describeSquad = () => {
    const want = weighted([
      [4, 45],
      [3, 30],
      [2, 25],
    ]);
    return describeFromLobby(want);
  };

  const describeSolo = () => describeFromLobby(1);

  const describeSquadFight = () => {
    const opts = livingSquads(lobby, 2);
    if (opts.length < 2) {
      const [text, enemy] = describeSquad();
      return [text, enemy, enemy, null, null, null, null];
    }
    const shuffled = [...opts].sort(() => rand() - 0.5);
    const squadA = shuffled[0];
    const squadB = shuffled[1];
    const membersA = takeAliveMembers(squadA, 2);
    const membersB = takeAliveMembers(squadB, 2);
    lastEncounterRef = { squadId: squadA.id, members: membersA };
    lastEncounterOutfits = membersA.map((member) => member.outfit);
    const skins = [...membersA, ...membersB].map((member) => member.outfit);
    const text = `You hear gunfire ${pick(PLACES)}. Two squads are fighting nearby.`;
    emitVisual({
      kind: 'skins',
      caption: text,
      outfits: skins,
    });
    return [text, groupEnemyType(squadA.type), groupEnemyType(squadB.type), squadA, squadB, membersA, membersB];
  };

  const readEnemy = (enemy) => {
    const feel = READS[enemy];
    if (!feel) return;
    const guess = weighted(Object.entries(feel));
    log(`[READ] ${READ_TEXT[guess]}`);
  };

  const aOrAn = (word) => (/^[aeiou]/i.test(word) ? 'an' : 'a');

  const squadAttack = (enemy, weapon = 'AR', skip = 0) => {
    const [mult] = ENEMY_SKILL[enemy];
    const [lo, hi] = WEAPONS[weapon].damage;
    const shooters = activeMembers().slice(skip);
    for (const m of Object.keys(S.squad)) {
      if (S.afk[m]) log(`${m} is AFK and can't shoot!`);
    }
    let total = 0;
    for (const m of shooters) {
      if (rand() < WEAPONS[weapon].miss) {
        log(`${m} used ${aOrAn(weapon)} ${weapon} and missed!`);
        continue;
      }
      const dmg = Math.floor(randInt(lo, hi) * mult);
      total += dmg;
      log(`${m} used ${aOrAn(weapon)} ${weapon} and dealt ${dmg} damage.`);
    }
    return total;
  };

  const enemyAttacks = async (enemy, bonus = 0) => {
    if (S.enemyStunned) {
      S.enemyStunned = false;
      log("They're stunned and can't attack this round!");
      return;
    }
    if (S.fortRounds > 0) {
      S.fortRounds -= 1;
      log(`Their attack is blocked! (${S.fortRounds} round(s) of cover left)`);
      return;
    }
    const team = ENEMY_TEAMS[enemy];
    const [, hitChance] = ENEMY_SKILL[enemy];
    const who = enemy === 'Boss' ? 'The boss' : 'They';
    const targets = Object.keys(S.squad);
    const sample = [...targets].sort(() => rand() - 0.5).slice(0, Math.min(team.hits, targets.length));
    for (const m of sample) {
      if (rand() < hitChance) {
        const dmg = Math.floor((randInt(...team.dmg) + bonus) * ENEMY_DAMAGE_MULT);
        fightDamage(m, dmg, causeOf(enemy));
      } else {
        log(`${who} shot at ${m} and missed!`);
      }
    }
    await removeEliminated();
  };

  const reward = (enemy) => {
    const team = ENEMY_TEAMS[enemy];
    if (enemy === 'Boss') {
      S.kills.boss += 1;
      log('You beat the boss and claimed its vault!');
      for (const s of Object.values(S.squad)) s.shield = Math.min(100, s.shield + 50);
      log('+50 shield to everyone');
      giveRare(true);
    } else {
      if (String(enemy).startsWith('Solo')) S.kills.solo += 1;
      else S.kills.squad += 1;
      let killed = 0;
      if (lastEncounterRef?.members?.length) {
        for (const member of lastEncounterRef.members) {
          if (member.alive) {
            member.alive = false;
            killed += 1;
          }
        }
        syncPlayersLeft();
      } else {
        eliminateOthers(team.elims, {
          fromFight: true,
          preferSquadId: lastEncounterRef?.squadId,
        });
        killed = team.elims;
      }
      const who = String(enemy).startsWith('Solo') ? 'solo' : 'squad';
      log(`You eliminated the ${enemy}! That ${who} is out: -${killed} player(s).`);
    }
    lastEncounterRef = null;
    for (let i = 0; i < team.loot; i += 1) rollLoot();
    if (enemy !== 'Boss' && rand() < (RARE_REWARD[enemy] || 0)) giveRare(false);
  };

  const isSweat = (enemy) => enemy === 'Sweats' || enemy === 'Solo sweat';

  const useBossItem = async (pickItem, enemy, user) => {
    const d = BOSS_ITEMS[pickItem];
    const single = (d.uses || 1) === 1;
    const spend = () => {
      if (single) useItem(pickItem);
      else useMulti(pickItem);
    };
    if (d.escape) {
      if (d.damage) {
        const how = await choose(['Attack', `${d.escape} (escape the fight)`]);
        if (!how.startsWith('Attack')) {
          log(`${user} ${d.text} ${pickItem} — ${d.escape.toLowerCase()}! The squad escapes!`);
          spend();
          return ['escaped', 0];
        }
      } else {
        log(`${user} ${d.text} ${pickItem} — ${d.escape.toLowerCase()}! The squad escapes!`);
        spend();
        return ['escaped', 0];
      }
    }
    let dmg = 0;
    if (d.damage) {
      dmg = randInt(...d.damage);
      if (isSweat(enemy) && d.vs_sweats) {
        dmg = Math.floor(dmg * d.vs_sweats);
        log("It's extra effective against sweats!");
      }
      log(`${user} ${d.text} ${pickItem} and dealt ${dmg} damage.`);
    } else if (d.turret) {
      S.turretRounds = d.turret;
      log(`${user} ${d.text} ${pickItem}! It will fire on its own for ${d.turret} rounds.`);
    } else if (d.cover) {
      log(`${user} ${d.text} ${pickItem}!`);
    }
    if (d.stun && rand() < d.stun) {
      S.enemyStunned = true;
      log('The enemy is stunned and will miss their next attack!');
    }
    if (d.deflect && rand() < d.deflect) {
      S.fortRounds = Math.max(S.fortRounds, 1);
      log(`${user} gets ready to deflect their next attack!`);
    }
    if (d.cover) {
      S.fortRounds = Math.max(S.fortRounds, d.cover);
      log(`The squad has cover for ${d.cover} round(s).`);
    }
    if (d.heal) {
      const target = Object.keys(S.squad).sort((a, b) => S.squad[a].hp - S.squad[b].hp)[0];
      S.squad[target].hp = Math.min(S.squad[target].maxHp, S.squad[target].hp + d.heal);
      log(`The water heals ${target} +${d.heal} HP.`);
    }
    if (d.burn) {
      S.burnDamage = d.burn;
      log(`The enemy is on fire! (+${d.burn} damage next round)`);
    }
    spend();
    return ['used', dmg];
  };

  const livingMembers = () => Object.keys(S.squad);

  const restoreSquad = () => {
    for (const member of Object.values(S.squad)) {
      member.hp = member.maxHp;
      member.shield = 100;
    }
    emitSquad();
  };

  const healMember = (item, target) => {
    const member = S.squad[target];
    if (!member) return;
    if (item === 'Slurp Juice') {
      member.hp = member.maxHp;
      member.shield = 100;
      log(`${target} drinks a Slurp Juice and is back to full health and shield!`);
    } else if (item === 'Shield Potion') {
      const before = member.shield;
      member.shield = Math.min(100, member.shield + 50);
      log(`${target} uses a Shield Potion! +${member.shield - before} shield`);
    } else if (item === 'Medkit') {
      const before = member.hp;
      member.hp = member.maxHp;
      log(
        before >= member.maxHp
          ? `${target} uses a Medkit, but was already at full HP.`
          : `${target} uses a Medkit! Back to full HP (${member.maxHp}).`,
      );
    }
    emitSquad();
  };

  const chooseMember = async (prompt) => {
    const names = livingMembers();
    if (!names.length) return null;
    log(prompt);
    const pickName = await choose([...names, 'Back']);
    if (pickName === 'Back') return null;
    return pickName;
  };

  const HEAL_ITEMS = ['Medkit', 'Shield Potion', 'Slurp Juice', 'Chug Jug'];

  const useItemInFight = async (enemy) => {
    const order = [
      ...Object.keys(BOSS_ITEMS),
      'Grenade',
      'Rocket Launcher',
      'Shield Potion',
      'Medkit',
      'Slurp Juice',
      'Chug Jug',
      'Infinity Blade',
      'Launch Pad',
      'Rift-To-Go',
    ];
    let usable = order.filter((i) => has(i));
    if (enemy === 'Boss') usable = usable.filter((i) => i !== 'Infinity Blade');
    if (!usable.length) {
      log("You don't have any usable items!");
      return ['cancel', 0];
    }
    if (!activeMembers().length) {
      log("Everyone left is AFK — nobody can use an item!");
      return ['cancel', 0];
    }
    const labelFor = (i) => {
      const left = usesLeftFor(i);
      return left != null ? `${i} (${left} use${left === 1 ? '' : 's'} left)` : i;
    };
    const labels = usable.map(labelFor);
    const pickLabel = await choose([...labels, 'Back']);
    if (pickLabel === 'Back') return ['cancel', 0];
    const pickIdx = labels.indexOf(pickLabel);
    const pickItem =
      pickIdx >= 0 ? usable[pickIdx] : usable.find((i) => i === pickLabel || labelFor(i) === pickLabel);
    if (!pickItem) {
      log("Couldn't tell which item you picked.");
      return ['cancel', 0];
    }
    const user = activeMembers()[0];
    if (pickItem === 'Infinity Blade') {
      log(`The Infinity Blade wipes out the ${enemy} without a scratch!`);
      useMulti('Infinity Blade');
      showInventory();
      return ['win', 0];
    }
    if (BOSS_ITEMS[pickItem]) {
      const result = await useBossItem(pickItem, enemy, user);
      if (MULTI_USE[pickItem] || (BOSS_ITEMS[pickItem].uses || 1) > 1) showInventory();
      return result;
    }
    if (pickItem === 'Launch Pad' || pickItem === 'Rift-To-Go') {
      useItem(pickItem);
      if (pickItem === 'Rift-To-Go') S.stormDistance = 0;
      log(`You used the ${pickItem} and escaped the fight!`);
      return ['escaped', 0];
    }
    if (pickItem === 'Chug Jug') {
      useItem(pickItem);
      restoreSquad();
      log('Chug Jug! Everyone is fully restored!');
      return ['used', 0];
    }
    if (pickItem === 'Medkit' || pickItem === 'Shield Potion' || pickItem === 'Slurp Juice') {
      const target = await chooseMember(`Who should use the ${pickItem}?`);
      if (!target) return ['cancel', 0];
      useItem(pickItem);
      healMember(pickItem, target);
      return ['used', 0];
    }
    useItem(pickItem);
    if (DAMAGE_ITEMS[pickItem]) {
      const dmg = randInt(...DAMAGE_ITEMS[pickItem]);
      log(`${user} used a ${pickItem} and dealt ${dmg} damage. BOOM!`);
      return ['used', dmg];
    }
    log(`You used a ${pickItem}.`);
    return ['used', 0];
  };

  const ongoingDamage = (enemy) => {
    let total = 0;
    if (S.burnDamage) {
      log(`The fire burns them for ${S.burnDamage} damage!`);
      total += S.burnDamage;
      S.burnDamage = 0;
    }
    if (S.turretRounds > 0) {
      const [mult] = ENEMY_SKILL[enemy];
      const dmg = Math.floor(randInt(...TURRET_DAMAGE) * mult);
      S.turretRounds -= 1;
      log(`The Business Turret fires for ${dmg} damage! (${S.turretRounds} round(s) left)`);
      total += dmg;
    }
    return total;
  };

  let fleeChase;
  let combat;

  fleeChase = async (enemy, enemyHp = null, penalty = 0, bonus = 0) => {
    let hp = enemyHp == null ? enemyMaxHp(enemy) : enemyHp;
    let [escape, caught, [clo, chi]] = CHASE[enemy];
    escape = escape - penalty + bonus;
    let rounds = 0;
    while (Object.keys(S.squad).length) {
      rounds += 1;
      const esc = Math.max(0.05, Math.min(1, escape + 0.1 * (rounds - 1)));
      const cau = Math.max(0, Math.min(1 - esc, caught + 0.05 * (rounds - 1)));
      const roll = rand();
      if (roll < esc) {
        log(`You got away after ${rounds} round(s) of running!`);
        return 'fled';
      }
      if (roll < esc + cau) {
        log('They caught up!');
        const dmg = Math.floor(randInt(clo, chi) * ENEMY_DAMAGE_MULT);
        fightDamage(pick(Object.keys(S.squad)), dmg, causeOf(enemy));
      } else {
        log("You're running... they're still on your tail.");
      }
      if (S.stormDistance >= 2 && Object.keys(S.squad).length) {
        const dmg = Math.max(1, Math.floor((S.stormDamage[0] * STORM_DAMAGE_MULT) / 2));
        log(`Running through the Storm hurts! -${dmg} HP each`);
        for (const m of Object.keys(S.squad)) stormHit(m, dmg);
      }
      await removeEliminated();
      if (!Object.keys(S.squad).length) return 'lost';
      log("They're still chasing you. What now?");
      const options = ['Keep running', 'Turn and fight'];
      if (has('Launch Pad')) options.push('Use Launch Pad (guaranteed escape)');
      if (has('Rift-To-Go')) options.push('Use Rift-To-Go (escape + leave the Storm)');
      const escapeItems = Object.keys(BOSS_ITEMS).filter((i) => BOSS_ITEMS[i].escape && has(i));
      for (const i of escapeItems) options.push(`Use ${i} (${BOSS_ITEMS[i].escape.toLowerCase()})`);
      const pickOpt = await choose(options);
      for (const i of escapeItems) {
        if (pickOpt.startsWith(`Use ${i} (`)) {
          log(`You use the ${i} — ${BOSS_ITEMS[i].escape.toLowerCase()}! You got away!`);
          if ((BOSS_ITEMS[i].uses || 1) === 1) useItem(i);
          else useMulti(i);
          return 'fled';
        }
      }
      if (pickOpt === 'Turn and fight') {
        log('You turn around — they were ready and get the first shots in.');
        await enemyAttacks(enemy, 10);
        if (!Object.keys(S.squad).length) return 'lost';
        return combat(enemy, hp, true, bonus);
      }
      if (pickOpt.startsWith('Use Launch Pad')) {
        useItem('Launch Pad');
        log('You launch into the sky and leave them behind!');
        return 'fled';
      }
      if (pickOpt.startsWith('Use Rift-To-Go')) {
        useItem('Rift-To-Go');
        S.stormDistance = 0;
        log('You rift away to the safe zone!');
        return 'fled';
      }
    }
    return 'lost';
  };

  const bossThirdParty = async () => {
    const [text, squadEnemy] = describeSquad();
    log(`!! THIRD PARTY! The noise drew in ${text} — and they open fire!`);
    await enemyAttacks(squadEnemy);
    if (!Object.keys(S.squad).length) return 'lost';
    const pickOpt = await choose(['Fight them off (then finish the boss)', 'Flee (give up the boss loot)']);
    if (pickOpt.startsWith('Flee')) {
      await fleeChase(squadEnemy);
      return 'fled';
    }
    return combat(squadEnemy, enemyMaxHp(squadEnemy), true);
  };

  combat = async (enemy, enemyHp, showRead = false, fleeBonus = 0) => {
    const maxHp = enemyMaxHp(enemy);
    S.fortRounds = 0;
    S.enemyStunned = false;
    S.turretRounds = 0;
    S.burnDamage = 0;
    if (showRead) readEnemy(enemy);
    emitEnemyStatus(enemy, enemyHp, maxHp, { hidden: Boolean(showRead && READS[enemy]) });
    let bossAmbushed = false;
    while (Object.keys(S.squad).length && enemyHp > 0) {
      const name = READS[enemy] ? '???' : enemy;
      log(`--- FIGHT vs ${name} ---`);
      log(`ENEMY HP ${enemyHp}/${maxHp}`);
      emitEnemyStatus(enemy, enemyHp, maxHp, { hidden: name === '???' });
      showSquad();
      showInventory();
      const pickOpt = await choose([
        'Shoot (AR - steady)',
        'Shoot (SMG - in between)',
        'Shoot (Shotgun - big hits, can miss)',
        'Use item',
        'Flee',
      ]);
      if (pickOpt.startsWith('Shoot')) {
        const weapon = pickOpt.includes('AR') ? 'AR' : pickOpt.includes('SMG') ? 'SMG' : 'Shotgun';
        const dealt = squadAttack(enemy, weapon);
        log(`Total: ${dealt} damage.`);
        enemyHp -= dealt;
      } else if (pickOpt === 'Use item') {
        const [result, itemDmg] = await useItemInFight(enemy);
        if (result === 'win') {
          enemyHp = 0;
          break;
        }
        if (result === 'escaped') return 'escaped';
        if (result === 'cancel') continue;
        const dealt = itemDmg + squadAttack(enemy, 'AR', 1);
        log(`Total: ${dealt} damage.`);
        enemyHp -= dealt;
      } else {
        return fleeChase(enemy, enemyHp, 0.1, fleeBonus);
      }
      enemyHp -= ongoingDamage(enemy);
      emitEnemyStatus(enemy, Math.max(0, enemyHp), maxHp);
      if (enemyHp <= 0) break;
      log(`ENEMY HP ${Math.max(0, enemyHp)}/${maxHp}`);
      if ((enemy === 'Solo bot' || enemy === 'Solo player') && rand() < 0.25) {
        log(`The ${enemy.toLowerCase()} panics and escapes! No loot this time.`);
        return 'escaped';
      }
      await enemyAttacks(enemy);
      emitEnemyStatus(enemy, Math.max(0, enemyHp), maxHp);
      if (
        enemy === 'Boss' &&
        Object.keys(S.squad).length &&
        !bossAmbushed &&
        rand() < BOSS_FIGHT_AMBUSH + S.damage / 1500
      ) {
        bossAmbushed = true;
        if ((await bossThirdParty()) !== 'won') return Object.keys(S.squad).length ? 'fled' : 'lost';
        log('With the other squad gone, you turn back to the boss!');
        emitEnemyStatus(enemy, Math.max(0, enemyHp), maxHp);
      }
    }
    if (Object.keys(S.squad).length && enemyHp <= 0) {
      emitEnemyStatus(enemy, 0, maxHp);
      reward(enemy);
      return 'won';
    }
    return 'lost';
  };

  const engage = async (text, enemy, ambushOdds) => {
    let fleeBonus = 0;
    let odds = ambushOdds;
    const maxHp = enemyMaxHp(enemy);
    emitEnemyStatus(enemy, maxHp, maxHp, { hidden: true, hpHidden: true });
    if (has('Bush')) {
      useItem('Bush');
      odds = Math.min(odds, inFinalCircle() ? 0.55 : 0.2);
      fleeBonus = 0.2;
      log("(You're wearing a Bush — harder to spot, easier to slip away.)");
    }
    if (rand() < odds) {
      log(`!! AMBUSH! Out of nowhere, ${text} — and they open fire!`);
      await enemyAttacks(enemy);
      if (!Object.keys(S.squad).length) return;
      const pickOpt = await choose(['Fight back', 'Flee']);
      if (pickOpt === 'Flee') await fleeChase(enemy, null, 0, fleeBonus);
      else await combat(enemy, maxHp, true, fleeBonus);
      return;
    }
    log(`You spot ${text}. They haven't seen you.`);
    const pickOpt = await choose(['Ambush them', 'Sneak away']);
    if (pickOpt === 'Sneak away') {
      if (rand() < 0.85) {
        lastEncounterRef = null;
        log('You slip away unnoticed.');
        return;
      }
      log("They noticed you! They're giving chase!");
      await fleeChase(enemy, null, 0, fleeBonus);
      return;
    }
    log('You open fire first!');
    const dealt = squadAttack(enemy);
    log(`Total: ${dealt} damage.`);
    const hpLeft = enemyMaxHp(enemy) - dealt;
    if (hpLeft <= 0) {
      emitEnemyStatus(enemy, 0, maxHp);
      reward(enemy);
      return;
    }
    await combat(enemy, hpLeft, true, fleeBonus);
  };

  const thirdParty = async (text, enemyA, enemyB, squadA, squadB, membersA, membersB) => {
    log(text);
    const pickOpt = await choose(['Third-party them', 'Wait it out', 'Avoid']);
    if (pickOpt === 'Third-party them') {
      const hpA = Math.floor(enemyMaxHp(enemyA) * (0.5 + rand() * 0.2));
      const hpB = Math.floor(enemyMaxHp(enemyB) * (0.5 + rand() * 0.2));
      log('You crash the fight! Both squads are already hurt.');
      if (squadA && membersA) setEncounter(squadA, membersA);
      if ((await combat(enemyA, hpA, true)) === 'won' && Object.keys(S.squad).length) {
        log('The other squad turns their guns on you!');
        if (squadB && membersB) setEncounter(squadB, membersB);
        await combat(enemyB, hpB, true);
      }
    } else if (pickOpt === 'Wait it out') {
      if (S.playersLeft <= ENDGAME_LOCK) {
        log('You wait... the shooting stops. Both squads pull back. Nobody is eliminated.');
        const useB = rand() < 0.5;
        const target = useB ? enemyB : enemyA;
        if ((await choose(['Attack them', 'Leave'])) === 'Attack them') {
          if (useB && squadB && membersB) setEncounter(squadB, membersB);
          else if (squadA && membersA) setEncounter(squadA, membersA);
          await combat(target, enemyMaxHp(target), true);
        }
      } else {
        const aWins = rand() < 0.5;
        const winner = aWins ? enemyA : enemyB;
        const loserSquad = aWins ? squadB : squadA;
        const winnerSquad = aWins ? squadA : squadB;
        const winnerMembers = aWins ? membersA : membersB;
        if (loserSquad) {
          for (const member of loserSquad.members) {
            if (member.alive) member.alive = false;
          }
          syncPlayersLeft();
        }
        const hp = Math.floor(enemyMaxHp(winner) * (0.3 + rand() * 0.2));
        log('You wait... the shooting stops. One squad is left standing, badly hurt.');
        if ((await choose(['Ambush the winner', 'Leave'])) === 'Ambush the winner') {
          if (winnerSquad && winnerMembers) setEncounter(winnerSquad, winnerMembers);
          await combat(winner, hp, true);
        }
      }
    } else if (rand() < 0.1) {
      log('The winning squad spotted you leaving!');
      await fleeChase(pick([enemyA, enemyB]));
    } else {
      log('You quietly move on.');
    }
  };

  const playerEncounter = async (ambushOdds = 0.35) => {
    const finalCircle = inFinalCircle();
    const odds = finalCircle ? Math.max(ambushOdds, 0.9) : ambushOdds;
    const roll = rand();
    const soloChance = finalCircle ? 0.45 : 0.2;
    const thirdPartyChance = finalCircle ? 0.05 : 0.15;
    if (roll < thirdPartyChance) {
      const [text, a, b, squadA, squadB, membersA, membersB] = describeSquadFight();
      await thirdParty(text, a, b, squadA, squadB, membersA, membersB);
    } else if (roll < thirdPartyChance + soloChance) {
      const [text, enemy] = describeSolo();
      await engage(text, enemy, odds);
    } else {
      const [text, enemy] = describeSquad();
      await engage(text, enemy, odds);
    }
  };

  const bossEncounter = async () => {
    const bossSkins = pickOutfitsFromSeries(bySeries, BOSS_SERIES_KEYS, 1);
    const bossOutfit = bossSkins[0] || null;
    const bossLabel = encounterLabel(bossOutfit, 'a collab skin');
    lastEncounterOutfits = bossOutfit ? [bossOutfit] : [];
    log(`A BOSS (${bossLabel}) is guarding a vault full of loot!`);
    emitVisual({
      kind: 'boss',
      caption: `Boss: ${bossLabel}`,
      outfits: bossOutfit ? [bossOutfit] : [],
    });
    if ((await choose(['Fight the boss', "Back off (bosses don't chase)"])) === 'Fight the boss') {
      await combat('Boss', enemyMaxHp('Boss'));
    } else {
      log('You back away. The boss stays put, and so does its loot.');
    }
  };

  const squadEvent = () => {
    if (rand() < 0.5 && activeMembers().length > 1) {
      const m = pick(activeMembers());
      const turns = randInt(...AFK_TURNS);
      S.afk[m] = turns;
      const line = `[SQUAD] ${m} ${pick(AFK_REASONS)} and went AFK! They can't fight for ${turns} turn(s).`;
      log(line);
      showMemberEvent(m, line);
    } else {
      const m = pick(Object.keys(S.squad));
      const dmg = randInt(...FALL_DAMAGE);
      S.lastHit[m] = 'fall damage';
      S.squad[m].hp -= dmg;
      S.damage += Math.floor(dmg / 4);
      const line = `[SQUAD] ${m} ${pick(FALL_REASONS)} and took ${dmg} fall damage.`;
      log(line);
      showMemberEvent(m, line);
      emitSquad();
    }
  };

  const afkTick = () => {
    for (const m of Object.keys(S.afk)) {
      S.afk[m] -= 1;
      if (S.afk[m] <= 0) {
        delete S.afk[m];
        const line = `[SQUAD] ${m} is back from being AFK!`;
        log(line);
        showMemberEvent(m, line);
      }
    }
  };

  const eventBushNoise = async () => {
    log('You hear a strange noise in a bush nearby.');
    if ((await choose(['Check it', 'Ignore it'])) === 'Ignore it') {
      log('You leave the bush alone and keep moving.');
      return;
    }
    if (rand() < 0.5) {
      log('Something useful was stashed in the bush.');
      rollLoot();
    } else {
      const [text, enemy] = describeSolo();
      const label = encounterLabel(lastEncounterOutfits[0], 'a solo');
      log(`Someone (${label}) was camping the bush!`);
      await engage(text, enemy, 1);
    }
  };

  const eventTeamingOffer = async () => {
    if (inFinalCircle()) {
      await playerEncounter();
      return;
    }
    const [text, enemy] = describeSolo();
    const label = encounterLabel(lastEncounterOutfits[0], 'a solo player');
    log(`A solo player (${label}) waves at you — looks like a teaming offer.`);
    emitVisual({
      kind: 'skins',
      caption: `Solo wave: ${label}`,
      outfits: lastEncounterOutfits,
    });
    const pickOpt = await choose(['Let them pass', 'Eliminate them (free win)']);
    if (pickOpt.startsWith('Eliminate')) {
      log(`You open up on ${label}. Free elim.`);
      reward(enemy);
      return;
    }
    if (rand() < 0.3) {
      log('They betray you! Guns out!');
      await engage(`the solo player (${label}) who just waved`, enemy, 1);
    } else {
      lastEncounterRef = null;
      log('They toss you something and peel off. True teammates... for now.');
      rollLoot();
    }
  };

  const eventLockedVault = async () => {
    log('You find a locked vault. Cracking it will take 2 full turns while the Storm keeps moving.');
    if ((await choose(['Spend 2 turns opening it', 'Leave it'])) === 'Leave it') {
      log('You leave the vault locked.');
      return;
    }
    S.vaultTurns = 2;
    log('You start working the lock. You will not be able to act for the next 2 turns.');
  };

  const eventRiftSky = async () => {
    log('A rift crackles open in the sky above you.');
    if ((await choose(['Jump in', 'Skip it'])) === 'Skip it') {
      log('You leave the rift alone.');
      return;
    }
    if (rand() < 0.5) {
      S.stormDistance = Math.max(0, S.stormDistance - randInt(1, 2));
      log(`The rift drops you closer to the zone! Now: ${STATUS[S.stormDistance]}`);
    } else {
      S.stormDistance = Math.min(3, S.stormDistance + randInt(1, 2));
      log(`Bad rift! You land somewhere dangerous. Now: ${STATUS[S.stormDistance]}`);
    }
  };

  const eventCar = async () => {
    log('You spot a car sitting idle on the road.');
    if ((await choose(['Hop in and drive', 'Pass it'])) === 'Pass it') {
      log('You walk past the car.');
      return;
    }
    S.stormDistance = Math.max(0, S.stormDistance - 1);
    log(`You peel out. The drive puts you farther from the Storm. Now: ${STATUS[S.stormDistance]}`);
    if (rand() < 0.3) {
      log('The car explodes! Everyone takes 100 damage!');
      for (const m of Object.keys(S.squad)) fightDamage(m, 100, 'a car explosion');
      await removeEliminated();
      return;
    }
    log('Perfect timing — you ram the next squad you see!');
    const [text, enemy] = describeSquad();
    const maxHp = enemyMaxHp(enemy);
    const carDmg = randInt(180, 280);
    log(`You plow into ${text} for ${carDmg} damage!`);
    const hpLeft = maxHp - carDmg;
    if (hpLeft <= 0) {
      emitEnemyStatus(enemy, 0, maxHp);
      reward(enemy);
      return;
    }
    log("They're still up — finish the fight!");
    await combat(enemy, hpLeft, true);
  };

  const choiceEvents = [
    eventBushNoise,
    eventTeamingOffer,
    eventLockedVault,
    eventRiftSky,
    eventCar,
  ];

  const eventLegendarySupplyDrop = async () => {
    log('A Legendary Supply Drop streaks across the sky and lands nearby!');
    if ((await choose(['Loot it', 'Leave it'])) === 'Leave it') {
      log('You leave the Legendary drop for someone else.');
      return;
    }
    log('You crack open the Legendary drop...');
    if (rand() < 0.4) {
      log('Ambush! Someone else wanted that drop!');
      await playerEncounter(1);
      if (!Object.keys(S.squad).length) return;
      log('You get back to the drop.');
    }
    log('Two Mythic items spill out!');
    giveMythicBoss();
    giveMythicBoss();
  };

  const eventFloatingIsland = async () => {
    log('A floating island drifts into view overhead.');
    if ((await choose(['Go up there', 'Stay on the ground'])) === 'Stay on the ground') {
      log('You watch the island float away.');
      return;
    }
    log('You ride a rift up to the island...');
    if (rand() < 0.5) {
      log('Sweats were camping the loot!');
      await engage('a squad of sweats waiting on the floating island', 'Sweats', 1);
      if (!Object.keys(S.squad).length) return;
      log('The island loot is yours.');
    } else {
      log('The island is quiet. Easy pickings.');
    }
    log('You grab two Mythic boss-pool items!');
    giveMythicBoss();
    giveMythicBoss();
  };

  const fishingCommonPool = () =>
    LOOT_TABLE.filter(([, rarity]) => rarity === 'Common' || rarity === 'Uncommon').map(
      ([item]) => item,
    );
  const fishingEpicPool = () =>
    LOOT_TABLE.filter(([, rarity]) => rarity === 'Epic')
      .map(([item]) => item)
      .filter((item) => item !== 'Chug Jug' || unlocked.has('Chug Jug'));

  const eventFishingSpot = async () => {
    log('You find a quiet fishing spot. Stay as long as you want — the Storm will keep moving.');
    while (Object.keys(S.squad).length) {
      log(`Storm: ${STATUS[S.stormDistance]} · turn ${S.turn}`);
      showSquad();
      showInventory();
      if ((await choose(['Cast a line', 'Leave the spot'])) === 'Leave the spot') {
        log('You pack up and leave the fishing spot.');
        return;
      }
      const roll = rand();
      if (roll < 0.5) {
        log('Nothing on the line...');
      } else if (roll < 0.75) {
        const pool = fishingCommonPool();
        give(pick(pool));
      } else if (roll < 0.9) {
        const pool = fishingEpicPool();
        if (pool.length) give(pick(pool));
        else log('The line snaps. Nothing epic this cast.');
      } else if (!giveMythicBoss()) {
        log('A big one got away.');
      }
      const phase = PHASES[phaseIndex()];
      eliminateOthers(randInt(...phase.elims));
      stormShrinkCheck();
      stormTick();
      await removeEliminated();
      afkTick();
      S.turn += 1;
      if (!Object.keys(S.squad).length) return;
      if (S.playersLeft - Object.keys(S.squad).length <= 0) {
        log('While you were fishing, everyone else got wiped. Victory Royale!');
        return;
      }
    }
  };

  const eventVendingMachine = async () => {
    const mythics = mythicBossEntries().map(([item]) => item);
    if (!mythics.length) {
      log('A vending machine hums nearby, but it has no Mythics stocked for you yet.');
      return false;
    }
    const owned = Object.keys(S.inventory);
    if (!owned.length) {
      log('A vending machine hums nearby, but you have nothing to trade.');
      return false;
    }
    log('A vending machine appears! Trade one item for a random unlocked Mythic.');
    const labels = owned.map((item) =>
      S.inventory[item] > 1 ? `Trade ${item} x${S.inventory[item]}` : `Trade ${item}`,
    );
    const pickLabel = await choose([...labels, 'Walk away']);
    if (pickLabel === 'Walk away') {
      log('You leave the vending machine.');
      return false;
    }
    const item = owned[labels.indexOf(pickLabel)];
    useItem(item);
    log(`You feed the machine your ${item}...`);
    give(pick(mythics));
    return true;
  };

  const randomEvent = async () => {
    if (eventUnlocks.has('legendarySupplyDrop') && rand() < 0.08) {
      await eventLegendarySupplyDrop();
      return;
    }
    if (eventUnlocks.has('floatingIsland') && rand() < 0.14) {
      await eventFloatingIsland();
      return;
    }
    if (eventUnlocks.has('fishingSpot') && rand() < 0.14) {
      await eventFishingSpot();
      return;
    }
    if (rand() < 0.55) {
      const pool = inFinalCircle()
        ? choiceEvents.filter((event) => event !== eventTeamingOffer)
        : choiceEvents;
      await pick(pool)();
      return;
    }
    const roll = rand();
    if (roll < (inFinalCircle() ? 0.9 : 0.7)) await playerEncounter();
    else if (roll < 0.85) {
      const target = Object.keys(S.squad).sort((a, b) => S.squad[a].shield - S.squad[b].shield)[0];
      S.squad[target].shield = Math.min(100, S.squad[target].shield + 50);
      log(`A supply drop lands nearby! ${target} grabs +50 shield.`);
    } else {
      log('You found a Llama! You smash it open.');
      rollLoot();
      rollLoot();
    }
  };

  const actionFight = async () => {
    log('Your squad goes looking for a fight...');
    if (rand() < chance(FIGHT_SNIPER)) {
      sniperHit(pick(Object.keys(S.squad)));
      await removeEliminated();
      if (!Object.keys(S.squad).length) return;
    }
    await playerEncounter(0.2);
  };

  const actionLoot = async () => {
    const lootAmbush = inFinalCircle() ? Math.max(chance(LOOT_AMBUSH), 0.8) : chance(LOOT_AMBUSH);
    if (rand() < lootAmbush) {
      if (rand() < (inFinalCircle() ? 0.05 : 0.25)) await bossEncounter();
      else await playerEncounter(1);
      return;
    }
    log('You loot a chest.');
    if (rand() < 0.1) {
      give('Shield Potion');
      give('Shield Potion');
    } else if (rand() < 0.5) {
      give('Shield Potion');
    }
    rollLoot();
    if (
      isRanked &&
      eventUnlocks.has('pirateShopToken') &&
      rand() < PIRATE_SHOP_TOKEN_CHANCE
    ) {
      S.bonusWeebucks += PIRATE_SHOP_TOKEN_BONUS;
      log(
        `Pirate Shop Access Token! +${PIRATE_SHOP_TOKEN_BONUS} weebucks will be added to your end-of-run payout.`,
      );
    }
  };

  const healTargets = (mode) => {
    const byHp = Object.keys(S.squad).sort((a, b) => S.squad[a].hp - S.squad[b].hp);
    if (mode === 'lowest') return byHp.slice(0, 1);
    if (mode === 'two_lowest') return byHp.slice(0, 2);
    return Object.keys(S.squad);
  };

  const restStormRisk = () => {
    if (S.stormDistance === 1 && rand() < chance(REST_STORM)) {
      S.stormDistance = 2;
      S.campfireTurns = 0;
      log('The Storm rolled in while you rested! Any fire goes out.');
    }
  };

  const useHealingItem = async () => {
    const owned = HEAL_ITEMS.filter((item) => has(item));
    if (!owned.length) {
      log("You don't have any healing items.");
      return false;
    }
    const labels = owned.map((item) => (S.inventory[item] > 1 ? `${item} x${S.inventory[item]}` : item));
    const pickLabel = await choose([...labels, 'Back']);
    if (pickLabel === 'Back') return false;
    const pickItem = owned[labels.indexOf(pickLabel)];
    if (pickItem === 'Chug Jug') {
      useItem(pickItem);
      restoreSquad();
      log('Chug Jug! Everyone is fully restored!');
      return true;
    }
    const target = await chooseMember(`Who should use the ${pickItem}?`);
    if (!target) return false;
    useItem(pickItem);
    healMember(pickItem, target);
    return true;
  };

  const searchForHeals = async () => {
    let find;
    if (S.campfireTurns > 0) {
      find = 'Campfire';
      log('You keep resting by the campfire.');
    } else if (eventUnlocks.has('slurpBarrel') && rand() < 0.01) {
      log('You find a Slurp Barrel! Everyone slurps up to full health.');
      for (const m of Object.keys(S.squad)) {
        S.squad[m].hp = S.squad[m].maxHp;
        log(`${m} is back to full HP.`);
      }
      emitSquad();
      return;
    } else {
      const table = { ...ENV_HEAL };
      const weights = Object.fromEntries(Object.entries(table).map(([k, v]) => [k, v[0]]));
      if (S.stormDistance === 1) {
        for (const item of ['Campfire', 'Healing barrel']) {
          const lost = Math.floor(weights[item] / 2);
          weights[item] -= lost;
          weights.Nothing += lost;
        }
      } else if (S.stormDistance >= 2) {
        Object.keys(weights).forEach((k) => {
          if (k !== 'Apples' && k !== 'Nothing') delete weights[k];
        });
      }
      find = weighted(Object.entries(weights));
      log(FIND_TEXT[find]);
      if (find === 'Campfire') S.campfireTurns = 2;
    }
    const [, amount, mode] = ENV_HEAL[find];
    for (const m of healTargets(mode)) {
      S.squad[m].hp = Math.min(S.squad[m].maxHp, S.squad[m].hp + amount);
      log(`${m} +${amount} HP`);
    }
    if (find === 'Campfire') S.campfireTurns -= 1;
    emitSquad();
  };

  const actionRest = async () => {
    if (eventUnlocks.has('vendingMachine') && rand() < 0.28) {
      const traded = await eventVendingMachine();
      if (traded) {
        restStormRisk();
        return;
      }
    }
    log('You stop to rest. Use something you are carrying, or search for heals.');
    while (true) {
      const pickOpt = await choose(['Use a healing item', 'Search for heals']);
      if (pickOpt === 'Use a healing item') {
        const used = await useHealingItem();
        if (!used) continue;
      } else {
        await searchForHeals();
      }
      restStormRisk();
      return;
    }
  };

  const actionRotate = async () => {
    const dmgNow = S.stormDistance <= 2 ? S.stormDamage[0] : S.stormDamage[1];
    log(`How do you want to rotate? (Storm damage right now: ${dmgNow}/turn)`);
    const pickOpt = await choose(['Book it', 'Safer route']);
    if (pickOpt === 'Book it') {
      S.stormDistance = Math.max(0, S.stormDistance - 2);
      S.stormMult = 0.5;
      log(`Your squad sprints for the zone! Now: ${STATUS[S.stormDistance]}`);
      const bookAmbush = inFinalCircle() ? Math.max(chance(BOOK_IT_AMBUSH), 0.9) : chance(BOOK_IT_AMBUSH);
      if (rand() < bookAmbush) {
        if (has('Launch Pad')) {
          useItem('Launch Pad');
          log('Someone spots you — but you hit a Launch Pad and fly right over them!');
        } else {
          log('You were spotted running in the open!');
          await playerEncounter(0.6);
        }
      }
    } else {
      S.stormDistance = Math.max(0, S.stormDistance - 1);
      S.stormMult = 1;
      log(`You move carefully along the trees. Now: ${STATUS[S.stormDistance]}`);
      const safeAmbush = inFinalCircle() ? Math.max(chance(SAFE_ROUTE_AMBUSH), 0.65) : chance(SAFE_ROUTE_AMBUSH);
      if (rand() < safeAmbush) {
        if (rand() < (inFinalCircle() ? 0.05 : 0.25)) await bossEncounter();
        else if (inFinalCircle()) await playerEncounter(0.9);
        else await engage('a pack of bots wandering through the trees', 'Bots', 0.2);
      }
    }
  };

  const stormWarning = () => {
    if (S.nextShrinks.length && S.playersLeft - S.nextShrinks[0] <= 5) {
      log(`The Storm will shrink at ${S.nextShrinks[0]} players!`);
    }
  };

  const stormShrinkCheck = () => {
    while (S.nextShrinks.length && S.playersLeft <= S.nextShrinks[0]) {
      const threshold = S.nextShrinks.shift();
      S.stormDamage = STORM_SCHEDULE[threshold];
      S.stormDistance = Math.min(3, S.stormDistance + 1);
      log(`>>> THE STORM IS SHRINKING! You are now: ${STATUS[S.stormDistance]}`);
    }
  };

  const stormTick = () => {
    if (S.stormDistance < 2 || !Object.keys(S.squad).length) return;
    if (has('Rift-To-Go')) {
      useItem('Rift-To-Go');
      S.stormDistance = 0;
      log('You use a Rift-To-Go and land safely inside the zone!');
    } else {
      const base = S.stormDistance === 2 ? S.stormDamage[0] : S.stormDamage[1];
      const dmg = Math.floor(base * S.stormMult * STORM_DAMAGE_MULT);
      log(`Storm damage! -${dmg} HP to everyone (shields don't help)`);
      for (const m of Object.keys(S.squad)) stormHit(m, dmg);
    }
    S.stormMult = 1;
  };

  log('='.repeat(40));
  log('BATTLE BUS TRAIL');
  log(`Survive the island. Outlast ${LOBBY_NPCS} other players. Win.`);
  log('='.repeat(40));
  log(
    sidekick
      ? `Your squad: ${partyNames.join(', ')} + sidekick ${sidekick} (*)`
      : `Your squad: ${partyNames.join(', ')} (no sidekick)`,
  );
  for (const name of partyNames) {
    const bonus = startHpFor(name) - 100;
    if (bonus > 0) log(`${name} starts with ${startHpFor(name)} HP (+${bonus} from skin level).`);
  }
  log('You jump from the Battle Bus...');
  const typeTally = { Sweats: 0, 'Normal players': 0, Bots: 0 };
  for (const squad of lobby) {
    typeTally[squad.type] = (typeTally[squad.type] || 0) + 1;
  }
  log(
    `${countLobbyAlive(lobby)} other players filled the lobby across ${lobby.length} squads (${typeTally.Sweats} sweat, ${typeTally['Normal players']} player, ${typeTally.Bots} bot) — mostly fours, with one squad of three.`,
  );
  syncPlayersLeft();

  let won = false;
  while (true) {
    if (!Object.keys(S.squad).length) {
      const placement = S.playersLeft + 1;
      log(`Your squad was eliminated. You placed #${placement}.`);
      break;
    }
    if (S.playersLeft - Object.keys(S.squad).length <= 0) {
      won = true;
      log('='.repeat(40));
      log('VICTORY ROYALE!');
      log('='.repeat(40));
      log(`Only your squad is left — ${Object.keys(S.squad).length} players remaining, all yours!`);
      log(`Survivors: ${Object.keys(S.squad).join(', ')}`);
      break;
    }

    const phase = PHASES[phaseIndex()];
    log(`=== ${S.playersLeft} PLAYERS REMAINING — ${phase.name} (turn ${S.turn}) ===`);
    log(`Storm: ${STATUS[S.stormDistance]}`);
    stormWarning();
    showSquad();
    showInventory();

    let elims = randInt(...phase.elims);
    if (S.vaultTurns > 0) {
      S.vaultTurns -= 1;
      if (S.vaultTurns > 0) {
        log(`Still cracking the vault... (${S.vaultTurns} turn(s) left). The Storm keeps moving.`);
      } else if (Object.keys(S.squad).length) {
        log('The vault finally opens! Guaranteed rare loot.');
        giveRare(false);
      }
    } else {
      const pickOpt = await choose(['Fight', 'Loot', 'Rest', 'Rotate']);
      if (pickOpt === 'Fight') await actionFight();
      else if (pickOpt === 'Loot') await actionLoot();
      else if (pickOpt === 'Rest') {
        await actionRest();
        elims = Math.max(1, elims - 1);
      } else {
        await actionRotate();
        elims = Math.max(1, elims - 2);
      }

      const eventChance = phase.eventChance + S.damage / 1500;
      const endgameEvent = inFinalCircle() ? Math.max(eventChance, 0.85) : eventChance;
      if (Object.keys(S.squad).length && rand() < endgameEvent) {
        await randomEvent();
      }
    }
    if (Object.keys(S.squad).length && rand() < SQUAD_EVENT_CHANCE) {
      squadEvent();
      await removeEliminated();
    }
    if (Object.keys(S.squad).length) {
      eliminateOthers(elims);
      stormShrinkCheck();
      stormTick();
      await removeEliminated();
      afkTick();
    }
    S.turn += 1;
  }

  if (S.fallen.length) {
    log('');
    log('Fallen squad members:');
    for (const entry of S.fallen) {
      log(
        `- ${entry.blurb || `${entry.name}: eliminated by ${entry.cause}`} (${entry.playersLeft} players left)`,
      );
    }
  }

  const survivors = Object.keys(S.squad);
  const placement = won ? 1 : S.playersLeft + 1;
  return {
    won,
    placement,
    survivors,
    fallen: S.fallen,
    partyNames: [...partyNames],
    sidekickName: sidekick,
    bonusWeebucks: S.bonusWeebucks || 0,
  };
}
