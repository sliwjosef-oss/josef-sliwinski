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
  FALL_DAMAGE,
  FALL_REASONS,
  FIGHT_SNIPER,
  FIND_TEXT,
  GROUP_WORDS,
  INFINITY_BLADE_CHANCE,
  LOOT_AMBUSH,
  LOOT_TABLE,
  MAX_ITEMS,
  MULTI_USE,
  PHASES,
  PLACES,
  RARE_ITEMS,
  RARE_REWARD,
  READ_TEXT,
  READS,
  REST_STORM,
  SAFE_ROUTE_AMBUSH,
  SKINS,
  SOLO_ACTIVITIES,
  SOLO_BASE_ODDS,
  SOLO_TYPES,
  SOLO_WORDS,
  SQUAD_BASE_ODDS,
  SQUAD_EVENT_CHANCE,
  SQUAD_TYPES,
  START_PLAYERS,
  STATUS,
  STORM_DAMAGE_MULT,
  STORM_SCHEDULE,
  TRAIL_SHOP_UNLOCK_ITEMS,
  TURRET_DAMAGE,
  WEAPONS,
} from './constants';

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
 *   sidekickName: string,
 *   unlockedBossItems?: string[] | Set<string>,
 *   log: (line: string) => void,
 *   choose: (options: string[]) => Promise<string>,
 * }} opts
 */
export async function playTrailMatch({
  partyNames,
  sidekickName,
  unlockedBossItems = [],
  log,
  choose,
}) {
  const unlocked = new Set(unlockedBossItems);
  const names = [...partyNames.slice(0, 4), sidekickName];
  const sidekick = sidekickName;

  const S = {
    squad: Object.fromEntries(names.map((n) => [n, { hp: 100, shield: 0 }])),
    inventory: { Medkit: 1 },
    itemUses: {},
    fortRounds: 0,
    enemyStunned: false,
    turretRounds: 0,
    burnDamage: 0,
    kills: { squad: 0, solo: 0, boss: 0 },
    playersLeft: START_PLAYERS,
    damage: 0,
    stormDistance: 0,
    stormDamage: [0, 0],
    stormMult: 1,
    nextShrinks: Object.keys(STORM_SCHEDULE)
      .map(Number)
      .sort((a, b) => b - a),
    campfireTurns: 0,
    turn: 1,
    afk: {},
    lastHit: {},
    fallen: [],
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
    for (const [name, s] of Object.entries(S.squad)) {
      const label = name === sidekick ? `${name}*` : name;
      const afk = S.afk[name] ? ` (AFK · back in ${S.afk[name]})` : '';
      log(`${label}  HP ${s.hp}  SHIELD ${s.shield}${afk}`);
    }
  };
  const showInventory = () => {
    const parts = Object.entries(S.inventory).map(([item, n]) => {
      let label = `${item} x${n}`;
      if (MULTI_USE[item]) label += ` (${S.itemUses[item] || 0} uses)`;
      return label;
    });
    log(parts.length ? `Items: ${parts.join(', ')}` : 'Items: (none)');
  };

  const give = (item) => {
    if (MULTI_USE[item] && has(item)) {
      S.itemUses[item] = MULTI_USE[item];
      log(`* Found another ${item} — uses refilled!`);
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
  };

  const useMulti = (item) => {
    S.itemUses[item] -= 1;
    const left = S.itemUses[item];
    if (left <= 0) {
      useItem(item);
      delete S.itemUses[item];
      log(`The ${item} breaks!`);
    }
    return left;
  };

  const rollLoot = () => {
    for (const [item, , odds] of LOOT_TABLE) {
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
        ([item]) =>
          item !== 'Infinity Blade' &&
          (!(item in TRAIL_SHOP_UNLOCK_ITEMS) || unlocked.has(item)),
      ),
    );

  const giveRare = (fromBoss = false) => {
    if (fromBoss) {
      if (rand() < INFINITY_BLADE_CHANCE) {
        log('The boss drops something glowing... could it be?!');
        give('Infinity Blade');
        return;
      }
      const pool = bossLootPool();
      const entries = Object.entries(pool);
      if (!entries.length) return;
      give(weighted(entries));
      return;
    }
    give(pick(RARE_ITEMS));
  };

  const causeOf = (enemy) => {
    if (enemy === 'Boss') return 'the boss';
    if (String(enemy).startsWith('Solo')) return 'a solo player';
    return 'an enemy squad';
  };

  const fightDamage = (name, amount, cause = 'an enemy') => {
    S.lastHit[name] = cause;
    const s = S.squad[name];
    const absorbed = Math.min(s.shield, amount);
    s.shield -= absorbed;
    s.hp -= amount - absorbed;
    S.damage += Math.floor((amount - absorbed) / 4);
    if (absorbed && s.shield === 0) log(`${name}'s shield broke!`);
    log(`${name} took ${amount} damage (${absorbed} shield, ${amount - absorbed} HP)`);
  };

  const stormHit = (name, amount) => {
    S.lastHit[name] = 'the Storm';
    S.squad[name].hp -= amount;
    S.damage += Math.floor(amount / 4);
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
  };

  const removeEliminated = () => {
    for (const name of Object.keys(S.squad).filter((n) => S.squad[n].hp <= 0)) {
      const cause = S.lastHit[name] || 'the island';
      log(`*** ${name} has been eliminated by ${cause}. They can't be revived. ***`);
      S.fallen.push({ name, cause, playersLeft: S.playersLeft });
      delete S.squad[name];
      delete S.afk[name];
      S.playersLeft -= 1;
    }
  };

  const eliminateOthers = (n) => {
    S.playersLeft = Math.max(Object.keys(S.squad).length, S.playersLeft - n);
  };

  const enemyMaxHp = (enemy) => Math.floor(ENEMY_TEAMS[enemy].hp * ENEMY_HP_MULT);

  const rollType = (types, base, ...shifts) => {
    let odds = [...base];
    for (const shift of shifts) odds = odds.map((o, i) => o + (shift[i] || 0));
    return weighted(types.map((t, i) => [t, Math.max(3, odds[i])]));
  };

  const describeSquad = () => {
    const skin = pick(Object.keys(SKINS));
    const activity = pick(Object.keys(ACTIVITIES));
    const text = `${pick(GROUP_WORDS)} ${skin} ${activity} ${pick(PLACES)}`;
    return [text, rollType(SQUAD_TYPES, SQUAD_BASE_ODDS, SKINS[skin][1], ACTIVITIES[activity])];
  };

  const describeSolo = () => {
    const skin = pick(Object.keys(SKINS));
    const [single, shift] = SKINS[skin];
    const activity = pick(Object.keys(SOLO_ACTIVITIES));
    const text = `${pick(SOLO_WORDS)} ${single} ${activity} ${pick(PLACES)}`;
    return [text, rollType(SOLO_TYPES, SOLO_BASE_ODDS, shift, SOLO_ACTIVITIES[activity])];
  };

  const describeSquadFight = () => {
    const [a, b] = [pick(Object.keys(SKINS)), pick(Object.keys(SKINS))];
    const text = `You hear gunfire ${pick(PLACES)}. A squad of ${a} is fighting a group of ${b}.`;
    return [
      text,
      rollType(SQUAD_TYPES, SQUAD_BASE_ODDS, SKINS[a][1]),
      rollType(SQUAD_TYPES, SQUAD_BASE_ODDS, SKINS[b][1]),
    ];
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

  const enemyAttacks = (enemy, bonus = 0) => {
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
    removeEliminated();
  };

  const reward = (enemy) => {
    const team = ENEMY_TEAMS[enemy];
    eliminateOthers(team.elims);
    if (enemy === 'Boss') S.kills.boss += 1;
    else if (String(enemy).startsWith('Solo')) S.kills.solo += 1;
    else S.kills.squad += 1;

    if (enemy === 'Boss') {
      log('You beat the boss and claimed its vault!');
      for (const s of Object.values(S.squad)) s.shield = Math.min(100, s.shield + 50);
      log('+50 shield to everyone');
      giveRare(true);
    } else {
      const who = String(enemy).startsWith('Solo') ? 'solo' : 'squad';
      log(`You eliminated the ${enemy}! That ${who} is out: -${team.elims} player(s).`);
    }
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
      S.squad[target].hp = Math.min(100, S.squad[target].hp + d.heal);
      log(`The water heals ${target} +${d.heal} HP.`);
    }
    if (d.burn) {
      S.burnDamage = d.burn;
      log(`The enemy is on fire! (+${d.burn} damage next round)`);
    }
    spend();
    return ['used', dmg];
  };

  const useItemInFight = async (enemy) => {
    const order = [
      ...Object.keys(BOSS_ITEMS),
      'Grenade',
      'Rocket Launcher',
      'Shield Potion',
      'Medkit',
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
    const labels = usable.map((i) => (S.itemUses[i] ? `${i} (${S.itemUses[i]} uses)` : i));
    const pickLabel = await choose([...labels, 'Back']);
    if (pickLabel === 'Back') return ['cancel', 0];
    const pickItem = usable[labels.indexOf(pickLabel)];
    const user = activeMembers()[0];
    if (pickItem === 'Infinity Blade') {
      log(`The Infinity Blade wipes out the ${enemy} without a scratch!`);
      useMulti('Infinity Blade');
      return ['win', 0];
    }
    if (BOSS_ITEMS[pickItem]) return useBossItem(pickItem, enemy, user);
    if (pickItem === 'Launch Pad' || pickItem === 'Rift-To-Go') {
      useItem(pickItem);
      if (pickItem === 'Rift-To-Go') S.stormDistance = 0;
      log(`You used the ${pickItem} and escaped the fight!`);
      return ['escaped', 0];
    }
    useItem(pickItem);
    if (DAMAGE_ITEMS[pickItem]) {
      const dmg = randInt(...DAMAGE_ITEMS[pickItem]);
      log(`${user} used a ${pickItem} and dealt ${dmg} damage. BOOM!`);
      return ['used', dmg];
    }
    if (pickItem === 'Chug Jug') {
      for (const s of Object.values(S.squad)) {
        s.hp = 100;
        s.shield = 100;
      }
      log('Chug Jug! Everyone is fully restored!');
    } else {
      const stat = pickItem === 'Shield Potion' ? 'shield' : 'hp';
      const target = Object.keys(S.squad).sort((a, b) => S.squad[a][stat] - S.squad[b][stat])[0];
      S.squad[target][stat] = Math.min(100, S.squad[target][stat] + 50);
      log(`${target} used a ${pickItem}! +50 ${stat}`);
    }
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
      removeEliminated();
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
        enemyAttacks(enemy, 10);
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
    enemyAttacks(squadEnemy);
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
    let bossAmbushed = false;
    while (Object.keys(S.squad).length && enemyHp > 0) {
      const name = READS[enemy] ? '???' : enemy;
      log(`--- FIGHT vs ${name} ---`);
      log(`ENEMY HP ${enemyHp}/${maxHp}`);
      showSquad();
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
      if (enemyHp <= 0) break;
      log(`ENEMY HP ${Math.max(0, enemyHp)}/${maxHp}`);
      if ((enemy === 'Solo bot' || enemy === 'Solo player') && rand() < 0.25) {
        log(`The ${enemy.toLowerCase()} panics and escapes! No loot this time.`);
        return 'escaped';
      }
      enemyAttacks(enemy);
      if (
        enemy === 'Boss' &&
        Object.keys(S.squad).length &&
        !bossAmbushed &&
        rand() < BOSS_FIGHT_AMBUSH + S.damage / 1500
      ) {
        bossAmbushed = true;
        if ((await bossThirdParty()) !== 'won') return Object.keys(S.squad).length ? 'fled' : 'lost';
        log('With the other squad gone, you turn back to the boss!');
      }
    }
    if (Object.keys(S.squad).length && enemyHp <= 0) {
      reward(enemy);
      return 'won';
    }
    return 'lost';
  };

  const engage = async (text, enemy, ambushOdds) => {
    let fleeBonus = 0;
    let odds = ambushOdds;
    if (has('Bush')) {
      useItem('Bush');
      odds = Math.min(odds, 0.2);
      fleeBonus = 0.2;
      log("(You're wearing a Bush — harder to spot, easier to slip away.)");
    }
    if (rand() < odds) {
      log(`!! AMBUSH! Out of nowhere, ${text} — and they open fire!`);
      enemyAttacks(enemy);
      if (!Object.keys(S.squad).length) return;
      const pickOpt = await choose(['Fight back', 'Flee']);
      if (pickOpt === 'Flee') await fleeChase(enemy, null, 0, fleeBonus);
      else await combat(enemy, enemyMaxHp(enemy), true, fleeBonus);
      return;
    }
    log(`You spot ${text}. They haven't seen you.`);
    const pickOpt = await choose(['Ambush them', 'Sneak away']);
    if (pickOpt === 'Sneak away') {
      if (rand() < 0.85) {
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
      reward(enemy);
      return;
    }
    await combat(enemy, hpLeft, true, fleeBonus);
  };

  const thirdParty = async (text, enemyA, enemyB) => {
    log(text);
    const pickOpt = await choose(['Third-party them', 'Wait it out', 'Avoid']);
    if (pickOpt === 'Third-party them') {
      const hpA = Math.floor(enemyMaxHp(enemyA) * (0.5 + rand() * 0.2));
      const hpB = Math.floor(enemyMaxHp(enemyB) * (0.5 + rand() * 0.2));
      log('You crash the fight! Both squads are already hurt.');
      if ((await combat(enemyA, hpA, true)) === 'won' && Object.keys(S.squad).length) {
        log('The other squad turns their guns on you!');
        await combat(enemyB, hpB, true);
      }
    } else if (pickOpt === 'Wait it out') {
      const winner = pick([enemyA, enemyB]);
      const hp = Math.floor(enemyMaxHp(winner) * (0.3 + rand() * 0.2));
      log('You wait... the shooting stops. One squad is left standing, badly hurt.');
      if ((await choose(['Ambush the winner', 'Leave'])) === 'Ambush the winner') {
        await combat(winner, hp, true);
      }
    } else if (rand() < 0.1) {
      log('The winning squad spotted you leaving!');
      await fleeChase(pick([enemyA, enemyB]));
    } else {
      log('You quietly move on.');
    }
  };

  const playerEncounter = async (ambushOdds = 0.35) => {
    const roll = rand();
    const soloChance = S.playersLeft < 10 ? 0.4 : 0.2;
    if (roll < 0.15) {
      const [text, a, b] = describeSquadFight();
      await thirdParty(text, a, b);
    } else if (roll < 0.15 + soloChance) {
      const [text, enemy] = describeSolo();
      await engage(text, enemy, ambushOdds);
    } else {
      const [text, enemy] = describeSquad();
      await engage(text, enemy, ambushOdds);
    }
  };

  const bossEncounter = async () => {
    log('A BOSS is guarding a vault full of loot!');
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
      log(`[SQUAD] ${m} ${pick(AFK_REASONS)} and went AFK! They can't fight for ${turns} turn(s).`);
    } else {
      const m = pick(Object.keys(S.squad));
      const dmg = Math.min(randInt(...FALL_DAMAGE), S.squad[m].hp - 1);
      if (dmg <= 0) return;
      S.squad[m].hp -= dmg;
      S.damage += Math.floor(dmg / 4);
      log(`[SQUAD] ${m} ${pick(FALL_REASONS)} and took ${dmg} fall damage.`);
    }
  };

  const afkTick = () => {
    for (const m of Object.keys(S.afk)) {
      S.afk[m] -= 1;
      if (S.afk[m] <= 0) {
        delete S.afk[m];
        log(`[SQUAD] ${m} is back from being AFK!`);
      }
    }
  };

  const randomEvent = async () => {
    const roll = rand();
    if (roll < 0.7) await playerEncounter();
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
      removeEliminated();
      if (!Object.keys(S.squad).length) return;
    }
    await playerEncounter(0.2);
  };

  const actionLoot = async () => {
    if (rand() < chance(LOOT_AMBUSH)) {
      if (rand() < 0.25) await bossEncounter();
      else await playerEncounter(1);
      return;
    }
    log('You loot a chest.');
    if (rand() < 0.1) {
      for (const s of Object.values(S.squad)) s.shield = Math.min(100, s.shield + 50);
      log('Big Shield Potion! +50 shield to the whole squad!');
    } else if (rand() < 0.5) {
      const target = Object.keys(S.squad).sort((a, b) => S.squad[a].shield - S.squad[b].shield)[0];
      S.squad[target].shield = Math.min(100, S.squad[target].shield + 50);
      log(`Shield Potion! ${target} gets +50 shield.`);
    }
    rollLoot();
  };

  const healTargets = (mode) => {
    const byHp = Object.keys(S.squad).sort((a, b) => S.squad[a].hp - S.squad[b].hp);
    if (mode === 'lowest') return byHp.slice(0, 1);
    if (mode === 'two_lowest') return byHp.slice(0, 2);
    return Object.keys(S.squad);
  };

  const actionRest = async () => {
    let find;
    if (S.campfireTurns > 0) {
      find = 'Campfire';
      log('You keep resting by the campfire.');
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
      S.squad[m].hp = Math.min(100, S.squad[m].hp + amount);
      log(`${m} +${amount} HP`);
    }
    if (find === 'Campfire') S.campfireTurns -= 1;
    if (S.stormDistance === 1 && rand() < chance(REST_STORM)) {
      S.stormDistance = 2;
      S.campfireTurns = 0;
      log('The Storm rolled in while you rested! Any fire goes out.');
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
      if (rand() < chance(BOOK_IT_AMBUSH)) {
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
      if (rand() < chance(SAFE_ROUTE_AMBUSH)) {
        await engage('a pack of bots wandering through the trees', 'Bots', 0.2);
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
  log(`Survive the island. Outlast ${START_PLAYERS - names.length} other players. Win.`);
  log('='.repeat(40));
  log(`Your squad: ${partyNames.join(', ')} + sidekick ${sidekick} (*)`);
  log('You jump from the Battle Bus...');

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
    log('');
    log(`=== ${S.playersLeft} PLAYERS REMAINING — ${phase.name} (turn ${S.turn}) ===`);
    log(`Storm: ${STATUS[S.stormDistance]}`);
    stormWarning();
    showSquad();
    showInventory();

    const pickOpt = await choose(['Fight', 'Loot', 'Rest', 'Rotate']);
    let elims = randInt(...phase.elims);
    if (pickOpt === 'Fight') await actionFight();
    else if (pickOpt === 'Loot') await actionLoot();
    else if (pickOpt === 'Rest') {
      await actionRest();
      elims = Math.max(1, elims - 1);
    } else {
      await actionRotate();
      elims = Math.max(1, elims - 2);
    }

    if (Object.keys(S.squad).length && rand() < phase.eventChance + S.damage / 1500) {
      await randomEvent();
    }
    if (Object.keys(S.squad).length && rand() < SQUAD_EVENT_CHANCE) squadEvent();
    if (Object.keys(S.squad).length) {
      eliminateOthers(elims);
      stormShrinkCheck();
      stormTick();
      removeEliminated();
      afkTick();
    }
    S.turn += 1;
  }

  if (S.fallen.length) {
    log('');
    log('Fallen squad members:');
    for (const entry of S.fallen) {
      log(`- ${entry.name}: eliminated by ${entry.cause} (${entry.playersLeft} players left)`);
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
  };
}
