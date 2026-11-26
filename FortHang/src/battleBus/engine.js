import {
  ACTIVITIES,
  AFK_REASONS,
  AFK_TURNS,
  BOOK_IT_AMBUSH,
  BOSS_FIGHT_AMBUSH,
  BOSS_ITEMS,
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
  MAX_ITEMS,
  PIRATE_SHOP_TOKEN_BONUS,
  PIRATE_SHOP_TOKEN_CHANCE,
  MULTI_USE,
  PHASES,
  PLACES,
  LEEKCAPPER_CHANCE,
  READ_HINT,
  READ_TEXT,
  READS,
  REST_STORM,
  SOLO_ACTIVITIES,
  SOLO_WORDS,
  SQUAD_EVENT_CHANCE,
  STATUS,
  STORM_DAMAGE_MULT,
  STORM_SCHEDULE,
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
import { itemRarity, LOOT_ITEMS, lootTableForEnemy, rollLootDrop } from './loot';
import {
  applySniperShot,
  BOOGIE_ROUNDS,
  CHUG_SPLASH_HP,
  enemySkipsPanic,
  rollBoogieDancers,
} from './combatRules';
import {
  aliveCount,
  aliveMembers,
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
 *   sidekickOutfit?: object | null,
 *   outfits?: object[],
 *   partyOutfits?: object[],
 *   startingHpByName?: Record<string, number>,
 *   fightResistByName?: Record<string, number>,
 *   damageMultByName?: Record<string, number>,
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
  sidekickOutfit = null,
  outfits = [],
  partyOutfits = [],
  startingHpByName = {},
  fightResistByName = {},
  damageMultByName = {},
  stormResistByName = {},
  stormResist = 0,
  fightResist = 0,
  unlockedBossItems = [],
  unlockedEvents = [],
  discoveredSkinIds = [],
  forFun = false,
  startingInventory = null,
  log,
  clearLog,
  choose,
  onSquadUpdate,
  onEventVisual,
  onCodexUpdate,
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
  if (sidekickOutfit?.name) partyByName.set(sidekickOutfit.name, sidekickOutfit);
  const startHpFor = (name) => {
    const value = Number(startingHpByName[name]);
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 100;
  };
  const damageMultFor = (name) => {
    const value = Number(damageMultByName[name]);
    return Number.isFinite(value) && value > 0 ? value : 1;
  };
  const formatDamageMult = (value) => (value >= 2 ? '2x' : `${Number(value).toFixed(1)}x`);
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
  const facingName = (enemy) => {
    const outfits = lastEncounterOutfits.slice(0, String(enemy).startsWith('Solo') ? 1 : 4);
    const skinNames = outfits.map((outfit) => outfit?.name).filter(Boolean);
    if (enemy === 'Boss') return skinNames[0] ? `Boss (${skinNames[0]})` : 'Boss';
    if (!skinNames.length) return 'Enemy';
    if (skinNames.length === 1) return skinNames[0];
    return `${skinNames[0]}'s squad`;
  };
  const encounterMembers = () => lastEncounterRef?.members || [];
  const encounterChunks = (enemy) => {
    if (enemy === 'Boss') return 1;
    const count = encounterMembers().length;
    return Math.max(1, count || (String(enemy).startsWith('Solo') ? 1 : 4));
  };
  const emitEnemyStatus = (enemy, hp, maxHp, { hpHidden = false } = {}) => {
    const typeHidden = enemy !== 'Boss' && Boolean(READS[enemy]);
    const who = typeHidden || enemy === 'Boss' ? facingName(enemy) : enemy;
    const members = encounterMembers();
    emitVisual({
      kind: 'enemy',
      caption: hpHidden ? `Spotted: ${who}` : `Fight vs ${who}`,
      enemyLabel: who,
      enemyType: enemy,
      typeHidden,
      readHint: typeHidden ? S.lastRead || '' : '',
      hp: Math.max(0, hp),
      maxHp,
      chunks: encounterChunks(enemy),
      hpHidden: Boolean(hpHidden),
      dancingRounds: S.boogieRounds || 0,
      outfits: lastEncounterOutfits.slice(0, String(enemy).startsWith('Solo') ? 1 : 4),
      members: members.map((member) => ({
        id: member.outfit?.id,
        name: member.outfit?.name || '???',
        alive: Boolean(member.alive),
        outfit: member.outfit,
      })),
    });
  };

  const S = {
    squad: Object.fromEntries(
      names.map((n) => {
        const maxHp = startHpFor(n);
        return [n, { hp: maxHp, maxHp, shield: 0 }];
      }),
    ),
    inventory: startingInventory ? { ...startingInventory } : { Medkit: 1 },
    itemUses: {},
    boogieRounds: 0,
    dancers: new Set(),
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
    killers: {},
    fallen: [],
    lastRead: '',
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
          dancingRounds: member && S.dancers.has(name) && S.boogieRounds > 0 ? S.boogieRounds : 0,
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
    publishCodex();
  };
  const rarityOf = (item) => itemRarity(item);

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
    publishCodex();
  };

  const publishCodex = () => {
    onCodexUpdate?.({
      items: Object.entries(S.inventory).map(([name, count]) => ({
        name,
        count,
        usesLeft: usesLeftFor(name),
        iconUrls: getFortniteGgIconUrls(name),
      })),
      squads: lobby
        .filter((squad) => squad.members.some((member) => member.seen || !member.alive))
        .map((squad) => ({
          id: squad.id,
          theme: squad.theme || '',
          members: squad.members
            .filter((member) => member.seen || !member.alive)
            .map((member) => ({
              id: member.outfit?.id,
              name: member.outfit?.name || '???',
              alive: Boolean(member.alive),
              outfit: member.outfit,
              placement: member.placement || null,
              death: member.death
                ? {
                    kind: member.death.kind,
                    killerId: member.death.killerId || '',
                    killerName: member.death.killerName || '',
                  }
                : null,
            })),
        })),
    });
  };
  publishCodex();

  const showFoundItem = (item, caption) => {
    const rarity = rarityOf(item);
    if (rarity === 'Common' || rarity === 'Uncommon') return;
    emitVisual({
      kind: 'item',
      caption,
      itemName: item,
      rarity,
      iconUrls: getFortniteGgIconUrls(item),
      weaponPage: getFortniteGgWeaponPage(item),
    });
  };

  const give = (item) => {
    if (item === 'Kneecapper' && rand() < LEEKCAPPER_CHANCE) item = 'Leekcapper';
    if (MULTI_USE[item] && has(item)) {
      S.itemUses[item] = MULTI_USE[item];
      log(`* Found another ${item} — uses refilled!`);
      showFoundItem(item, `Refilled ${item}`);
      publishCodex();
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
    showFoundItem(item, `Found ${item}`);
    publishCodex();
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

  const grantLoot = (tableName, { isChest = false } = {}) => {
    const item = rollLootDrop(tableName, { unlocked, isChest, rand });
    if (!item) {
      log('Nothing special in this one.');
      return null;
    }
    give(item);
    return item;
  };

  const mythicBossEntries = () =>
    Object.entries(LOOT_ITEMS)
      .filter(
        ([name, item]) =>
          item.rarity === 'Mythic' &&
          item.pools.includes('boss') &&
          (!item.shop || unlocked.has(name)),
      )
      .map(([name]) => [name, 1]);

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

  const isPvpCause = (cause) =>
    cause === 'sweats' ||
    cause === 'a solo player' ||
    cause === 'an enemy squad' ||
    cause === 'the boss';

  const pickEnemyKillerOutfit = () => {
    const living = encounterMembers().filter((member) => member.alive && member.outfit);
    if (living.length) return pick(living).outfit;
    const any = encounterMembers().find((member) => member.outfit)?.outfit;
    return any || lastEncounterOutfits.find((outfit) => outfit?.id) || null;
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
    if (isPvpCause(cause)) {
      const killer = pickEnemyKillerOutfit();
      if (killer) S.killers[name] = killer;
    }
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
    const s = S.squad[name];
    const outcome = applySniperShot(s, S.inventory);
    if (outcome === 'blocked') {
      log('A sniper round whizzes past. Your Bush kept you hidden! (Bush used)');
      showInventory();
      return;
    }
    S.lastHit[name] = 'a sniper';
    if (outcome === 'shield') {
      log(`A sniper shot ${name}! Their shield shattered, but they're alive.`);
    } else {
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
      const killerOutfit = isPvpCause(cause) ? S.killers[name] || pickEnemyKillerOutfit() : null;
      if (killerOutfit) S.killers[name] = killerOutfit;
      log(`*** ${blurb} ***`);
      log(`(${name} was eliminated by ${cause}. They can't be revived.)`);
      const victimOutfit =
        partyByName.get(name) || (name === sidekick && sidekickOutfit ? sidekickOutfit : null);
      showMemberEvent(name, blurb, {
        kind: 'death',
        crossedOut: true,
        outfits: [killerOutfit, victimOutfit].filter(Boolean),
        killerOutfit: killerOutfit || null,
        victimOutfit: victimOutfit || null,
      });
      emitSquad();
      await choose(['Continue']);
      S.fallen.push({ name, cause, blurb, playersLeft: S.playersLeft, killerOutfit });
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
    publishCodex();
  };
  const partyKillerOutfit = () => {
    const living = Object.keys(S.squad)
      .map((name) => partyByName.get(name))
      .filter((outfit) => outfit?.id);
    const fallback = [...partyByName.values()].filter((outfit) => outfit?.id);
    return pick(living.length ? living : fallback) || null;
  };
  const killedByOutfit = (outfit) => ({
    kind: 'killed',
    killerId: outfit?.id || '',
    killerName: outfit?.name || '',
  });
  const recordDeath = (member, death) => {
    if (!member?.alive) return false;
    member.placement = Object.keys(S.squad).length + countLobbyAlive(lobby);
    member.alive = false;
    member.death = death || { kind: 'fall' };
    return true;
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
    killLobbyMembers(lobby, n, {
      preferSquadId,
      playersLeft: S.playersLeft,
      killerOutfit: fromFight ? partyKillerOutfit() : null,
      offscreen: !fromFight,
    });
    syncPlayersLeft();
  };

  const enemyMaxHp = (enemy) => Math.floor(ENEMY_TEAMS[enemy].hp * ENEMY_HP_MULT);

  const setEncounter = (squad, members) => {
    lastEncounterRef = { squadId: squad.id, members };
    lastEncounterOutfits = members.map((member) => member.outfit);
    for (const member of members) member.seen = true;
    publishCodex();
  };

  const encounterSquad = () =>
    lastEncounterRef ? lobby.find((squad) => squad.id === lastEncounterRef.squadId) || null : null;

  const clearSquadWound = (squad = encounterSquad()) => {
    if (!squad) return;
    delete squad.woundedHp;
    delete squad.woundedMaxHp;
  };

  const saveSquadWound = (hp, maxHp) => {
    const squad = encounterSquad();
    if (!squad) return;
    const living = encounterMembers().filter((member) => member.alive).length;
    if (living <= 0 || hp <= 0) {
      clearSquadWound(squad);
      return;
    }
    squad.woundedHp = Math.max(0, Math.floor(hp));
    squad.woundedMaxHp = Math.max(1, Math.floor(maxHp));
  };

  const startHpForEncounter = (enemy) => {
    const maxHp = enemyMaxHp(enemy);
    if (enemy === 'Boss') return maxHp;
    const squad = encounterSquad();
    if (squad && Number.isFinite(squad.woundedHp) && squad.woundedHp < maxHp) {
      return Math.max(1, Math.min(maxHp, Math.floor(squad.woundedHp)));
    }
    return maxHp;
  };

  const groupWordFor = (count) => {
    if (count <= 1) return pick(SOLO_WORDS);
    if (count === 2) return 'a duo of';
    if (count === 3) return 'a trio of';
    const full = GROUP_WORDS.filter((word) => !word.includes('duo') && !word.includes('trio'));
    return pick(full.length ? full : ['a squad of']);
  };

  const rivalsLeft = () => countLobbyAlive(lobby);

  const describeFromLobby = (wantSize) => {
    if (rivalsLeft() <= 0) {
      lastEncounterRef = null;
      lastEncounterOutfits = [];
      return null;
    }
    const squad = pickSquadForSize(lobby, wantSize) || pickSquadForSize(lobby, 1);
    if (!squad || aliveCount(squad) <= 0) {
      lastEncounterRef = null;
      lastEncounterOutfits = [];
      return null;
    }
    const size = Math.min(wantSize, aliveCount(squad));
    const members = takeAliveMembers(squad, Math.max(1, size));
    if (!members.length) {
      lastEncounterRef = null;
      lastEncounterOutfits = [];
      return null;
    }
    setEncounter(squad, members);
    const activity =
      members.length === 1
        ? pick(Object.keys(SOLO_ACTIVITIES))
        : pick(Object.keys(ACTIVITIES));
    const enemy =
      members.length === 1 ? soloEnemyType(squad.type) : groupEnemyType(squad.type);
    const themeBit = squad.theme
      ? members.length === 1
        ? squad.theme.replace(/ skins$/, ' skin')
        : squad.theme
      : members.length === 1
        ? 'player'
        : 'players';
    const text = `${groupWordFor(members.length)} ${themeBit} ${activity} ${pick(PLACES)}`;
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
      const fallback = describeSquad();
      if (!fallback) return null;
      const [text, enemy] = fallback;
      return [text, enemy, enemy, null, null, null, null];
    }
    const shuffled = [...opts].sort(() => rand() - 0.5);
    const squadA = shuffled[0];
    const squadB = shuffled[1];
    const membersA = aliveMembers(squadA);
    const membersB = aliveMembers(squadB);
    lastEncounterRef = { squadId: squadA.id, members: membersA };
    lastEncounterOutfits = membersA.map((member) => member.outfit);
    const named = (squad, fallback) => (squad.theme ? `a squad of ${squad.theme}` : fallback);
    const leftName = named(squadA, 'One squad').replace(/^a/, 'A');
    const rightName = named(squadB, 'another squad');
    const text = `You hear gunfire ${pick(PLACES)}. ${leftName} is fighting ${rightName}.`;
    return [text, groupEnemyType(squadA.type), groupEnemyType(squadB.type), squadA, squadB, membersA, membersB];
  };

  const readEnemy = (enemy) => {
    const feel = READS[enemy];
    if (!feel) {
      S.lastRead = '';
      return;
    }
    const guess = weighted(Object.entries(feel));
    S.lastRead = READ_HINT[guess] || '';
    log(`Read: ${READ_TEXT[guess]}`);
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
      if (S.dancers.has(m) && S.boogieRounds > 0) {
        log(`${m} is dancing and can't shoot!`);
        continue;
      }
      if (rand() < WEAPONS[weapon].miss) {
        log(`${m} used ${aOrAn(weapon)} ${weapon} and missed!`);
        continue;
      }
      const dmg = Math.floor(randInt(lo, hi) * mult * damageMultFor(m));
      total += dmg;
      log(`${m} used ${aOrAn(weapon)} ${weapon} and dealt ${dmg} damage.`);
    }
    return total;
  };

  const enemyAttacks = async (enemy, bonus = 0) => {
    if (S.boogieRounds > 0) {
      S.boogieRounds -= 1;
      if (S.boogieRounds > 0) {
        log(`They're dancing and can't attack! (${S.boogieRounds} round(s) left)`);
      } else {
        S.dancers = new Set();
        log('The music stops. The enemy is back in the fight.');
      }
      emitSquad();
      return;
    }
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

  const isSweat = (enemy) => enemy === 'Sweats' || enemy === 'Solo sweat';

  const killNoun = (enemy) => {
    if (enemy === 'Bots' || enemy === 'Solo bot') return 'bot';
    if (isSweat(enemy)) return 'sweat';
    return 'player';
  };

  const reward = (enemy) => {
    const team = ENEMY_TEAMS[enemy];
    if (enemy === 'Boss') {
      S.kills.boss += 1;
      log('You beat the boss and claimed its vault!');
      for (const s of Object.values(S.squad)) s.shield = Math.min(100, s.shield + 50);
      log('+50 shield to everyone');
      grantLoot('boss');
    } else {
      if (String(enemy).startsWith('Solo')) S.kills.solo += 1;
      else S.kills.squad += 1;
      let killed = 0;
      if (lastEncounterRef?.members?.length) {
        for (const member of lastEncounterRef.members) {
          if (member.alive) {
            recordDeath(member, killedByOutfit(partyKillerOutfit()));
            killed += 1;
            log(`You killed a ${killNoun(enemy)}.`);
          }
        }
        clearSquadWound();
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
    const lootTable = enemy === 'Boss' ? 'bots' : lootTableForEnemy(enemy);
    for (let i = 0; i < team.loot; i += 1) grantLoot(lootTable);
  };

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
      let rolled = randInt(...d.damage);
      if (isSweat(enemy) && d.vs_sweats) {
        rolled *= d.vs_sweats;
        log("It's extra effective against sweats!");
      }
      dmg = Math.floor(rolled * damageMultFor(user));
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
      member.hp = Math.min(member.maxHp, member.hp + 100);
      log(
        before >= member.maxHp
          ? `${target} uses a Medkit, but was already at full HP.`
          : `${target} uses a Medkit! +${member.hp - before} HP`,
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

  const HEAL_ITEMS = ['Medkit', 'Shield Potion', 'Slurp Juice', 'Chug Jug', 'Chug Splash'];

  const splashSquad = () => {
    for (const name of Object.keys(S.squad)) {
      const member = S.squad[name];
      const beforeHp = member.hp;
      const beforeShield = member.shield ?? 0;
      let remaining = CHUG_SPLASH_HP;
      const hpRoom = Math.max(0, member.maxHp - member.hp);
      const hpGain = Math.min(remaining, hpRoom);
      member.hp += hpGain;
      remaining -= hpGain;
      const shieldRoom = Math.max(0, 100 - (member.shield ?? 0));
      const shieldGain = Math.min(remaining, shieldRoom);
      member.shield = (member.shield ?? 0) + shieldGain;
      const gainedHp = member.hp - beforeHp;
      const gainedShield = member.shield - beforeShield;
      if (gainedHp > 0 && gainedShield > 0) {
        log(`${name} +${gainedHp} HP and +${gainedShield} shield from the Chug Splash.`);
      } else if (gainedHp > 0) {
        log(`${name} +${gainedHp} HP from the Chug Splash.`);
      } else if (gainedShield > 0) {
        log(`${name} +${gainedShield} shield from the Chug Splash.`);
      } else {
        log(`${name} is already at full HP and shield.`);
      }
    }
    emitSquad();
  };

  const throwBoogie = (enemy) => {
    const dancers = rollBoogieDancers(Object.keys(S.squad), rand);
    S.boogieRounds = BOOGIE_ROUNDS;
    S.dancers = new Set(dancers);
    log(`You throw a Boogie Bomb! The enemy can't stop dancing. (${BOOGIE_ROUNDS} rounds)`);
    for (const name of dancers) log(`Uh oh, ${name} caught the groove too!`);
    emitSquad();
  };

  const useItemInFight = async (enemy) => {
    const order = [
      ...Object.keys(BOSS_ITEMS),
      'Grenade',
      'Clinger',
      'Boogie Bomb',
      'Chug Splash',
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
    if (pickItem === 'Chug Splash') {
      useItem(pickItem);
      log('Chug Splash! Everyone gets a splash of health.');
      splashSquad();
      return ['used', 0];
    }
    if (pickItem === 'Boogie Bomb') {
      useItem(pickItem);
      throwBoogie(enemy);
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
      const dmg = Math.floor(randInt(...DAMAGE_ITEMS[pickItem]) * damageMultFor(user));
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
        saveSquadWound(hp, enemyMaxHp(enemy));
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
          saveSquadWound(hp, enemyMaxHp(enemy));
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
        saveSquadWound(hp, enemyMaxHp(enemy));
        useItem('Launch Pad');
        log('You launch into the sky and leave them behind!');
        return 'fled';
      }
      if (pickOpt.startsWith('Use Rift-To-Go')) {
        saveSquadWound(hp, enemyMaxHp(enemy));
        useItem('Rift-To-Go');
        S.stormDistance = 0;
        log('You rift away to the safe zone!');
        return 'fled';
      }
    }
    return 'lost';
  };

  const bossThirdParty = async () => {
    const described = describeSquad();
    if (!described) return 'won';
    const [text, squadEnemy] = described;
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
    let hp = Math.max(0, Math.min(maxHp, Math.floor(enemyHp)));
    S.fortRounds = 0;
    S.boogieRounds = 0;
    S.dancers = new Set();
    S.enemyStunned = false;
    S.turretRounds = 0;
    S.burnDamage = 0;
    if (showRead) readEnemy(enemy);
    dropEncounterChunks(hp, maxHp, enemy);
    emitEnemyStatus(enemy, hp, maxHp, { hidden: Boolean(showRead && READS[enemy]) });
    let bossAmbushed = false;
    while (Object.keys(S.squad).length && hp > 0) {
      const name = READS[enemy] ? `${facingName(enemy)} · Type: ???` : enemy;
      const alive = encounterMembers().filter((member) => member.alive).length;
      const chunks = encounterChunks(enemy);
      log(`--- FIGHT vs ${name} ---`);
      log(
        chunks > 1
          ? `ENEMY HP ${hp}/${maxHp} · ${alive}/${chunks} still up`
          : `ENEMY HP ${hp}/${maxHp}`,
      );
      emitEnemyStatus(enemy, hp, maxHp, { hidden: name.includes('Type: ???') });
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
        hp = Math.max(0, hp - dealt);
        dropEncounterChunks(hp, maxHp, enemy);
      } else if (pickOpt === 'Use item') {
        const [result, itemDmg] = await useItemInFight(enemy);
        if (result === 'win') {
          hp = 0;
          dropEncounterChunks(hp, maxHp, enemy);
          break;
        }
        if (result === 'escaped') {
          saveSquadWound(hp, maxHp);
          return 'escaped';
        }
        if (result === 'cancel') continue;
        const dealt = itemDmg + squadAttack(enemy, 'AR', 1);
        log(`Total: ${dealt} damage.`);
        hp = Math.max(0, hp - dealt);
        dropEncounterChunks(hp, maxHp, enemy);
      } else {
        saveSquadWound(hp, maxHp);
        return fleeChase(enemy, hp, 0.1, fleeBonus);
      }
      hp = Math.max(0, hp - ongoingDamage(enemy));
      dropEncounterChunks(hp, maxHp, enemy);
      emitEnemyStatus(enemy, hp, maxHp);
      if (hp <= 0) break;
      log(
        chunks > 1
          ? `ENEMY HP ${hp}/${maxHp} · ${encounterMembers().filter((member) => member.alive).length}/${chunks} still up`
          : `ENEMY HP ${hp}/${maxHp}`,
      );
      if (
        !enemySkipsPanic(S.boogieRounds) &&
        (enemy === 'Solo bot' || enemy === 'Solo player') &&
        rand() < 0.25
      ) {
        saveSquadWound(hp, maxHp);
        log('They panic and escape! No loot this time.');
        return 'escaped';
      }
      await enemyAttacks(enemy);
      emitEnemyStatus(enemy, hp, maxHp);
      if (
        enemy === 'Boss' &&
        Object.keys(S.squad).length &&
        !bossAmbushed &&
        rand() < BOSS_FIGHT_AMBUSH + S.damage / 1500
      ) {
        bossAmbushed = true;
        if ((await bossThirdParty()) !== 'won') return Object.keys(S.squad).length ? 'fled' : 'lost';
        log('With the other squad gone, you turn back to the boss!');
        emitEnemyStatus(enemy, hp, maxHp);
      }
    }
    if (Object.keys(S.squad).length && hp <= 0) {
      emitEnemyStatus(enemy, 0, maxHp);
      reward(enemy);
      return 'won';
    }
    return 'lost';
  };

  /** Ambushes always bring the whole living lobby squad, not a random subset. */
  const expandAmbushToFullSquad = (text, enemy) => {
    const squad = encounterSquad();
    if (!squad || enemy === 'Boss') return { text, enemy };
    const full = aliveMembers(squad);
    if (full.length <= 1) {
      if (full.length === 1) setEncounter(squad, full);
      return {
        text,
        enemy: full.length === 1 ? soloEnemyType(squad.type) : enemy,
      };
    }
    setEncounter(squad, full);
    const themeBit = squad.theme || 'players';
    return {
      text: `${groupWordFor(full.length)} ${themeBit}`,
      enemy: groupEnemyType(squad.type),
    };
  };

  const engage = async (text, enemy, ambushOdds) => {
    S.lastRead = '';
    let fleeBonus = 0;
    let odds = ambushOdds;
    let fightEnemy = enemy;
    let fightText = text;
    let maxHp = enemyMaxHp(fightEnemy);
    let startHp = startHpForEncounter(fightEnemy);
    emitEnemyStatus(fightEnemy, startHp, maxHp, { hidden: true, hpHidden: true });
    if (has('Bush')) {
      useItem('Bush');
      odds = Math.min(odds, inFinalCircle() ? 0.55 : 0.2);
      fleeBonus = 0.2;
      log("(You're wearing a Bush — harder to spot, easier to slip away.)");
    }
    if (rand() < odds) {
      ({ text: fightText, enemy: fightEnemy } = expandAmbushToFullSquad(text, enemy));
      maxHp = enemyMaxHp(fightEnemy);
      startHp = startHpForEncounter(fightEnemy);
      emitEnemyStatus(fightEnemy, startHp, maxHp, { hidden: true, hpHidden: true });
      log(`!! AMBUSH! Out of nowhere, ${fightText} — and they open fire!`);
      await enemyAttacks(fightEnemy);
      if (!Object.keys(S.squad).length) return;
      const pickOpt = await choose(['Fight back', 'Flee']);
      if (pickOpt === 'Flee') await fleeChase(fightEnemy, startHp, 0, fleeBonus);
      else await combat(fightEnemy, startHp, true, fleeBonus);
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
      ({ text: fightText, enemy: fightEnemy } = expandAmbushToFullSquad(text, enemy));
      maxHp = enemyMaxHp(fightEnemy);
      startHp = startHpForEncounter(fightEnemy);
      await fleeChase(fightEnemy, startHp, 0, fleeBonus);
      return;
    }
    log('You open fire first!');
    const dealt = squadAttack(fightEnemy);
    log(`Total: ${dealt} damage.`);
    const hpLeft = Math.max(0, startHp - dealt);
    dropEncounterChunks(hpLeft, maxHp, fightEnemy);
    if (hpLeft <= 0) {
      emitEnemyStatus(fightEnemy, 0, maxHp);
      reward(fightEnemy);
      return;
    }
    await combat(fightEnemy, hpLeft, true, fleeBonus);
  };

  const aliveFromHp = (hp, maxHp, count) => {
    if (hp <= 0 || count <= 0 || maxHp <= 0) return 0;
    const chunk = maxHp / count;
    return Math.min(count, Math.ceil((hp - 1e-6) / chunk));
  };

  const dropEncounterChunks = (hp, maxHp, enemy) => {
    if (enemy === 'Boss' || !lastEncounterRef?.members?.length) return 0;
    const members = lastEncounterRef.members;
    const should = aliveFromHp(hp, maxHp, members.length);
    const living = members.filter((member) => member.alive);
    let died = 0;
    while (living.length > should) {
      const victim = living.pop();
      recordDeath(victim, killedByOutfit(partyKillerOutfit()));
      died += 1;
      log(`You killed a ${killNoun(enemy)}.`);
    }
    if (died) {
      if (!members.some((member) => member.alive)) clearSquadWound();
      syncPlayersLeft();
      publishCodex();
    }
    return died;
  };

  const sideLabel = (side) => {
    if (side.squad?.theme) return side.squad.theme;
    const face = side.members.find((member) => member.alive) || side.members[0];
    const name = encounterLabel(face?.outfit, 'Squad');
    return name === '???' || name === 'Squad' ? 'Squad' : `${name}'s squad`;
  };

  const emitThirdParty = (left, right) => {
    const pack = (side) => ({
      key: side.key,
      label: sideLabel(side),
      enemyType: side.enemy,
      typeHidden: Boolean(READS[side.enemy]),
      readHint: READS[side.enemy] ? side.read || '' : '',
      hp: Math.max(0, Math.round(side.hp)),
      maxHp: side.maxHp,
      chunks: side.members.length,
      dancingRounds: side.dance || 0,
      members: side.members.map((member) => ({
        id: member.outfit?.id,
        name: member.outfit?.name || '???',
        alive: Boolean(member.alive),
        outfit: member.outfit,
      })),
    });
    emitVisual({
      kind: 'third-party',
      caption: 'Two squads are fighting',
      sides: [pack(left), pack(right)],
    });
  };

  const dropChunks = (side, { byYou = false, attacker = null } = {}) => {
    const should = aliveFromHp(side.hp, side.maxHp, side.members.length);
    const living = side.members.filter((member) => member.alive);
    let died = 0;
    while (living.length > should) {
      const victim = living.pop();
      let death;
      if (byYou) {
        death = killedByOutfit(partyKillerOutfit());
      } else {
        const pool = (attacker?.members || []).filter((member) => member.alive && member !== victim);
        const choice = pool.length
          ? pick(pool)
          : (attacker?.members || []).find((member) => member !== victim);
        death = choice ? killedByOutfit(choice.outfit) : { kind: 'fall' };
      }
      victim.seen = true;
      recordDeath(victim, death);
      died += 1;
      log(
        byYou
          ? `You killed a ${killNoun(side.enemy)}.`
          : `The other squad killed a ${killNoun(side.enemy)}.`,
      );
    }
    if (died) {
      syncPlayersLeft();
      publishCodex();
    }
    return died;
  };

  const wipeLoot = (side) => {
    if (side.looted || side.hp > 0) return;
    side.looted = true;
    const team = ENEMY_TEAMS[side.enemy];
    if (String(side.enemy).startsWith('Solo')) S.kills.solo += 1;
    else S.kills.squad += 1;
    log(`You eliminated the ${side.enemy}! That squad is out.`);
    const lootTable = lootTableForEnemy(side.enemy);
    for (let i = 0; i < team.loot; i += 1) grantLoot(lootTable);
  };

  const makeFightSide = (key, squad, members, enemy) => {
    for (const member of members) member.seen = true;
    readEnemy(enemy);
    const maxHp = enemyMaxHp(enemy);
    return {
      key,
      squad,
      members,
      enemy,
      maxHp,
      hp: maxHp,
      dance: 0,
      looted: false,
      read: S.lastRead,
    };
  };

  const strikeOtherSquad = (attacker, defender) => {
    const team = ENEMY_TEAMS[attacker.enemy];
    const [, hitChance] = ENEMY_SKILL[attacker.enemy];
    const shots = Math.max(1, team.hits || 1);
    for (let i = 0; i < shots; i += 1) {
      if (defender.hp <= 0) return;
      if (rand() < hitChance) {
        const dmg = Math.floor(randInt(...team.dmg) * ENEMY_DAMAGE_MULT);
        defender.hp = Math.max(0, defender.hp - dmg);
        log(`${sideLabel(attacker)} hits the other squad for ${dmg}.`);
        dropChunks(defender, { attacker });
        if (defender.hp <= 0) log(`${sideLabel(attacker)} wiped that squad out.`);
      } else {
        log(`${sideLabel(attacker)} shot at the other squad and missed!`);
      }
    }
  };

  const combatBoth = async (left, right) => {
    S.fortRounds = 0;
    S.boogieRounds = 0;
    S.dancers = new Set();
    S.enemyStunned = false;
    S.turretRounds = 0;
    S.burnDamage = 0;
    log('You crash the fight! Pick a side each round.');
    emitThirdParty(left, right);
    let focus = left.hp > 0 ? left : right;
    while (Object.keys(S.squad).length && (left.hp > 0 || right.hp > 0)) {
      const options = [];
      if (left.hp > 0) options.push('Attack left squad');
      if (right.hp > 0) options.push('Attack right squad');
      options.push('Use item', 'Flee');
      const pickOpt = await choose(options);
      if (pickOpt === 'Flee') {
        const foe = left.hp > 0 ? left : right;
        await fleeChase(foe.enemy, foe.hp, 0.1, 0);
        return;
      }
      if (pickOpt === 'Use item') {
        const living = [left, right].filter((side) => side.hp > 0);
        if (living.length > 1) {
          const which = await choose(['Use it on the left squad', 'Use it on the right squad', 'Back']);
          if (which === 'Back') continue;
          focus = which.includes('left') ? left : right;
        } else {
          focus = living[0];
        }
        const [result, itemDmg] = await useItemInFight(focus.enemy);
        if (result === 'cancel') continue;
        if (result === 'escaped') return;
        if (result === 'win') {
          focus.hp = 0;
          dropChunks(focus, { byYou: true });
          wipeLoot(focus);
        } else {
          if (S.boogieRounds > 0) focus.dance = S.boogieRounds;
          const dealt = itemDmg + squadAttack(focus.enemy, 'AR', 1);
          if (dealt > 0) log(`Total: ${dealt} damage.`);
          focus.hp = Math.max(0, focus.hp - dealt);
          dropChunks(focus, { byYou: true });
          if (focus.hp <= 0) wipeLoot(focus);
        }
      } else {
        focus = pickOpt.startsWith('Attack left') ? left : right;
        const weaponPick = await choose([
          'Shoot (AR - steady)',
          'Shoot (SMG - in between)',
          'Shoot (Shotgun - big hits, can miss)',
          'Back',
        ]);
        if (weaponPick === 'Back') continue;
        const weapon = weaponPick.includes('AR') ? 'AR' : weaponPick.includes('SMG') ? 'SMG' : 'Shotgun';
        const dealt = squadAttack(focus.enemy, weapon);
        log(`Total: ${dealt} damage.`);
        focus.hp = Math.max(0, focus.hp - dealt);
        dropChunks(focus, { byYou: true });
        if (focus.hp <= 0) wipeLoot(focus);
      }
      const extra = ongoingDamage(focus.enemy);
      if (extra > 0 && focus.hp > 0) {
        focus.hp = Math.max(0, focus.hp - extra);
        dropChunks(focus, { byYou: true });
        if (focus.hp <= 0) wipeLoot(focus);
      }
      emitThirdParty(left, right);
      if (!Object.keys(S.squad).length) return;
      if (left.hp <= 0 && right.hp <= 0) break;

      const savedBoogie = S.boogieRounds;
      S.boogieRounds = 0;
      for (const side of [left, right]) {
        if (side.hp <= 0 || !Object.keys(S.squad).length) continue;
        const other = side === left ? right : left;
        if (side.dance > 0) {
          side.dance -= 1;
          log(
            side.dance > 0
              ? `${sideLabel(side)} is dancing and can't attack! (${side.dance} round(s) left)`
              : `${sideLabel(side)} stops dancing.`,
          );
          continue;
        }
        if (other.hp > 0 && rand() < 0.5) {
          log(`${sideLabel(side)} turns their guns on the other squad!`);
          strikeOtherSquad(side, other);
        } else {
          log(`${sideLabel(side)} shoots at you!`);
          await enemyAttacks(side.enemy);
        }
      }
      S.boogieRounds = savedBoogie;
      if (S.boogieRounds > 0) {
        S.boogieRounds -= 1;
        if (S.boogieRounds <= 0) S.dancers = new Set();
      }
      emitThirdParty(left, right);
    }
  };

  const thirdParty = async (text, enemyA, enemyB, squadA, squadB, membersA, membersB) => {
    log(text);
    const both = squadA && squadB && membersA?.length && membersB?.length;
    let left = null;
    let right = null;
    if (both) {
      left = makeFightSide('left', squadA, membersA, enemyA);
      right = makeFightSide('right', squadB, membersB, enemyB);
      publishCodex();
      emitThirdParty(left, right);
    }
    const pickOpt = await choose(['Third-party them', 'Wait it out', 'Avoid']);
    if (pickOpt === 'Third-party them') {
      if (left && right) {
        await combatBoth(left, right);
        return;
      }
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
      if (left && right && rand() < 0.3) {
        left.hp = Math.floor(left.maxHp * (0.45 + rand() * 0.25));
        right.hp = Math.floor(right.maxHp * (0.45 + rand() * 0.25));
        dropChunks(left, { attacker: right });
        dropChunks(right, { attacker: left });
        emitThirdParty(left, right);
        log('They both spotted you watching the fight! Both squads turn their guns on you!');
        await combatBoth(left, right);
        return;
      }
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
        const loserMembers = aWins ? membersB : membersA;
        const doomed = loserMembers?.length ? loserMembers : loserSquad?.members || [];
        for (const member of doomed) {
          if (member.alive) {
            const pool = (winnerMembers || []).filter((entry) => entry.alive);
            const killer = pool.length ? pick(pool) : winnerMembers?.[0];
            member.seen = true;
            recordDeath(member, killer ? killedByOutfit(killer.outfit) : { kind: 'fall' });
          }
        }
        syncPlayersLeft();
        publishCodex();
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
    if (rivalsLeft() <= 0) return;
    const finalCircle = inFinalCircle();
    const odds = finalCircle ? Math.max(ambushOdds, 0.9) : ambushOdds;
    const roll = rand();
    const soloChance = finalCircle ? 0.45 : 0.2;
    const thirdPartyChance = finalCircle ? 0.05 : 0.15;
    if (roll < thirdPartyChance) {
      const fight = describeSquadFight();
      if (!fight) return;
      const [text, a, b, squadA, squadB, membersA, membersB] = fight;
      await thirdParty(text, a, b, squadA, squadB, membersA, membersB);
    } else if (roll < thirdPartyChance + soloChance) {
      const described = describeSolo();
      if (!described) return;
      const [text, enemy] = described;
      await engage(text, enemy, odds);
    } else {
      const described = describeSquad();
      if (!described) return;
      const [text, enemy] = described;
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
      grantLoot('bots');
    } else {
      const described = describeSolo();
      if (!described) {
        log('Whatever was in the bush is gone.');
        return;
      }
      const [text, enemy] = described;
      const label = encounterLabel(lastEncounterOutfits[0], 'a solo');
      log(`Someone (${label}) was camping the bush!`);
      await engage(text, enemy, 1);
    }
  };

  const eventTeamingOffer = async () => {
    if (rivalsLeft() <= 0) return;
    if (inFinalCircle()) {
      await playerEncounter();
      return;
    }
    const described = describeSolo();
    if (!described) return;
    const [text, enemy] = described;
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
      grantLoot('players');
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
    const described = describeSquad();
    if (!described) {
      log('Nobody else is left to ram.');
      return;
    }
    const [text, enemy] = described;
    const maxHp = enemyMaxHp(enemy);
    const carDmg = randInt(180, 280);
    log(`You plow into ${text} for ${carDmg} damage!`);
    const hpLeft = Math.max(0, maxHp - carDmg);
    dropEncounterChunks(hpLeft, maxHp, enemy);
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
    if (rand() < 0.5 && rivalsLeft() > 0) {
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

  const fishingPool = (rarities) =>
    Object.entries(LOOT_ITEMS)
      .filter(
        ([name, item]) =>
          item.pools.includes('loot') &&
          rarities.includes(item.rarity) &&
          (!item.shop || unlocked.has(name)),
      )
      .map(([name]) => name);
  const fishingCommonPool = () => fishingPool(['Common', 'Uncommon']);
  const fishingEpicPool = () => fishingPool(['Epic']);

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
      if (rivalsLeft() <= 0) {
        log('While you were fishing, everyone else got wiped.');
        return;
      }
    }
  };

  const vendingPool = (rarities) =>
    Object.entries(LOOT_ITEMS)
      .filter(
        ([name, item]) =>
          rarities.includes(item.rarity) &&
          (item.pools.includes('loot') || item.pools.includes('boss')) &&
          (!item.shop || unlocked.has(name)),
      )
      .map(([name]) => name);

  const eventVendingMachine = async () => {
    const epicPool = vendingPool(['Epic']);
    const legendaryMythic = vendingPool(['Legendary', 'Mythic']);
    const stocked = [...new Set([...epicPool, ...legendaryMythic])];
    if (!stocked.length) {
      log('A vending machine hums nearby, but it has nothing stocked for you yet.');
      return false;
    }
    const owned = Object.keys(S.inventory);
    if (!owned.length) {
      log('A vending machine hums nearby, but you have nothing to trade.');
      return false;
    }
    log(
      'A vending machine appears! Trade one item for Epic, Legendary, or Mythic loot.',
    );
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
    const preferHigh = rand() < 0.2;
    const primary = preferHigh ? legendaryMythic : epicPool;
    const fallback = preferHigh ? epicPool : legendaryMythic;
    const pool = primary.length ? primary : fallback.length ? fallback : stocked;
    give(pick(pool));
    return true;
  };

  const randomEvent = async () => {
    if (rivalsLeft() <= 0) return;
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
      grantLoot('players');
      grantLoot('players');
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
    grantLoot('bots', { isChest: true });
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
    if (pickItem === 'Chug Splash') {
      useItem(pickItem);
      log('Chug Splash! +20 HP to everyone still standing.');
      splashSquad();
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
    if (eventUnlocks.has('vendingMachine') && rand() < 0.05) {
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
      const bookAmbush = inFinalCircle() ? 1 : Math.min(1, chance(BOOK_IT_AMBUSH));
      if (rand() < bookAmbush) {
        if (has('Launch Pad')) {
          useItem('Launch Pad');
          log('Someone spots you — but you hit a Launch Pad and fly right over them!');
        } else {
          log(
            inFinalCircle()
              ? 'The final circle is wide open. Someone was waiting for you!'
              : 'You were spotted running in the open!',
          );
          await playerEncounter(inFinalCircle() ? 0.9 : 0.6);
        }
      }
    } else {
      S.stormDistance = Math.max(0, S.stormDistance - 1);
      S.stormMult = 1;
      log(`You move carefully along the trees. Now: ${STATUS[S.stormDistance]}`);
      log('The cover keeps other squads from spotting you.');
      const dmg = Math.floor(S.stormDamage[0] * STORM_DAMAGE_MULT);
      if (dmg > 0) {
        log(`The Storm still rolls over the long way. -${dmg} HP to everyone (shields don't help)`);
        for (const m of Object.keys(S.squad)) stormHit(m, dmg);
        await removeEliminated();
      } else {
        log('The Storm is not close enough to hurt you yet.');
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
    const mult = damageMultFor(name);
    if (mult > 1) log(`${name} deals ${formatDamageMult(mult)} damage (skin level).`);
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
  const declareVictory = () => {
    won = true;
    syncPlayersLeft();
    log('='.repeat(40));
    log('VICTORY ROYALE!');
    log('='.repeat(40));
    log(`Only your squad is left — ${Object.keys(S.squad).length} players remaining, all yours!`);
    log(`Survivors: ${Object.keys(S.squad).join(', ')}`);
  };
  const squadAlive = () => Object.keys(S.squad).length > 0;
  const shouldWin = () => squadAlive() && rivalsLeft() <= 0;

  while (true) {
    if (!squadAlive()) {
      const placement = S.playersLeft + 1;
      log(`Your squad was eliminated. You placed #${placement}.`);
      break;
    }
    if (shouldWin()) {
      declareVictory();
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
      } else if (squadAlive()) {
        log('The vault finally opens! Guaranteed rare loot.');
        grantLoot('sweats');
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

      if (shouldWin()) {
        declareVictory();
        break;
      }

      const eventChance = phase.eventChance + S.damage / 1500;
      const endgameEvent = inFinalCircle() ? Math.max(eventChance, 0.85) : eventChance;
      if (squadAlive() && rivalsLeft() > 0 && rand() < endgameEvent) {
        await randomEvent();
      }
      if (shouldWin()) {
        declareVictory();
        break;
      }
    }
    if (squadAlive() && rivalsLeft() > 0 && rand() < SQUAD_EVENT_CHANCE) {
      squadEvent();
      await removeEliminated();
    }
    if (squadAlive() && rivalsLeft() > 0) {
      eliminateOthers(elims);
      stormShrinkCheck();
      stormTick();
      await removeEliminated();
      afkTick();
    } else if (squadAlive()) {
      stormShrinkCheck();
      stormTick();
      await removeEliminated();
      afkTick();
    }
    if (shouldWin()) {
      declareVictory();
      break;
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
