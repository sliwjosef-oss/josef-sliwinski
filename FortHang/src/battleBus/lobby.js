import { SQUAD_BASE_ODDS, SQUAD_TYPES, START_PLAYERS } from './constants';
import { SQUAD_VISUAL_POOLS } from './visuals';
import { getCatalogueSeriesKey } from '../utils/seriesSort';

function rand() {
  return Math.random();
}

function shuffle(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
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

function rollSquadType() {
  return weighted(SQUAD_TYPES.map((type, i) => [type, SQUAD_BASE_ODDS[i]]));
}

/**
 * Build the island lobby: unique skins, squads of 4, remainder as a smaller squad.
 * @param {{ outfits: object[], excludeNames?: Set<string>|string[], excludeIds?: Set<string>|string[], count: number }} opts
 */
export function buildLobby({ outfits = [], excludeNames = [], excludeIds = [], count }) {
  const blockedNames = new Set(
    excludeNames instanceof Set ? [...excludeNames] : excludeNames.filter(Boolean),
  );
  const blockedIds = new Set(
    excludeIds instanceof Set ? [...excludeIds] : excludeIds.filter(Boolean),
  );
  const pool = shuffle(
    outfits.filter(
      (outfit) =>
        outfit?.id &&
        outfit?.name &&
        !blockedNames.has(outfit.name) &&
        !blockedIds.has(outfit.id),
    ),
  );
  const need = Math.max(0, Math.floor(Number(count) || 0));
  const used = new Set();
  const bySeries = new Map();
  for (const outfit of pool) {
    const key = getCatalogueSeriesKey(outfit);
    if (!bySeries.has(key)) bySeries.set(key, []);
    bySeries.get(key).push(outfit);
  }

  const availableFor = (theme) => {
    const list = [];
    for (const key of theme.series || []) {
      for (const outfit of bySeries.get(key) || []) {
        if (!used.has(outfit.id)) list.push(outfit);
      }
    }
    return list;
  };

  const takeMembers = (size) => {
    const themed = shuffle(SQUAD_VISUAL_POOLS)
      .map((theme) => ({ theme, outfits: shuffle(availableFor(theme)) }))
      .filter((entry) => entry.outfits.length >= size);
    if (themed.length) {
      const choice = themed[0];
      const members = choice.outfits.slice(0, size);
      members.forEach((outfit) => used.add(outfit.id));
      return { theme: choice.theme.groupLabel, members };
    }
    const loose = shuffle(pool.filter((outfit) => !used.has(outfit.id)));
    if (loose.length < size) return null;
    const members = loose.slice(0, size);
    members.forEach((outfit) => used.add(outfit.id));
    return { theme: null, members };
  };

  const squads = [];
  let id = 0;
  let placed = 0;
  while (placed + 4 <= need) {
    const picked = takeMembers(4);
    if (!picked) break;
    squads.push({
      id: id++,
      type: rollSquadType(),
      theme: picked.theme,
      members: picked.members.map((outfit) => ({ outfit, alive: true, seen: false })),
    });
    placed += picked.members.length;
  }
  const rest = Math.min(need - placed, pool.filter((outfit) => !used.has(outfit.id)).length);
  if (rest > 0) {
    const picked = takeMembers(rest);
    if (picked) {
      squads.push({
        id: id++,
        type: rollSquadType(),
        theme: picked.theme,
        members: picked.members.map((outfit) => ({ outfit, alive: true, seen: false })),
      });
    }
  }
  return squads;
}

export function aliveMembers(squad) {
  return (squad?.members || []).filter((member) => member.alive);
}

export function aliveCount(squad) {
  return aliveMembers(squad).length;
}

export function countLobbyAlive(lobby = []) {
  return lobby.reduce((sum, squad) => sum + aliveCount(squad), 0);
}

export function livingSquads(lobby = [], minAlive = 1) {
  return lobby.filter((squad) => aliveCount(squad) >= minAlive);
}

export function soloEnemyType(squadType) {
  if (squadType === 'Bots') return 'Solo bot';
  if (squadType === 'Sweats') return 'Solo sweat';
  return 'Solo player';
}

export function groupEnemyType(squadType) {
  return squadType;
}

const ENDGAME_PLAYERS = 10;

/** Bots die off-screen early. Sweats almost never do until the lobby is thin. */
export function elimTypeWeight(type, playersLeft) {
  const left = Number(playersLeft);
  const span = Math.max(1, START_PLAYERS - ENDGAME_PLAYERS);
  const early = Number.isFinite(left) ? Math.min(1, Math.max(0, (left - ENDGAME_PLAYERS) / span)) : 1;
  if (type === 'Bots') return 1 + early * 8;
  if (type === 'Sweats') return 0.08 + (1 - early) * 0.92;
  return 0.85 + early * 0.35;
}

/** Higher weight once a squad has already lost someone, and for bots while the lobby is full. */
export function deathWeight(squad, member, playersLeft) {
  if (!member?.alive) return 0;
  const fallen = (squad.members || []).filter((entry) => !entry.alive).length;
  return (1 + fallen * 3) * elimTypeWeight(squad?.type, playersLeft);
}

const OFFSCREEN_FALL_CHANCE = 0.2;

function killerFromMember(member) {
  return {
    kind: 'killed',
    killerId: member?.outfit?.id || '',
    killerName: member?.outfit?.name || '',
  };
}

/** Off-screen: bots fall to players or sweats. Players and sweats fall to sweats. Some die in the storm. */
export function offscreenCause(lobby, squad, victim, stormChance = OFFSCREEN_FALL_CHANCE) {
  if (rand() < stormChance) return { kind: 'fall' };
  const types = squad?.type === 'Bots' ? ['Normal players', 'Sweats'] : ['Sweats'];
  const pool = [];
  for (const other of lobby) {
    if (!types.includes(other.type)) continue;
    for (const candidate of aliveMembers(other)) {
      if (candidate !== victim) pool.push(candidate);
    }
  }
  if (!pool.length) return { kind: 'fall' };
  return killerFromMember(pick(pool));
}

function applyDeath(member, placement, death) {
  member.alive = false;
  member.placement = placement;
  member.death = death;
}

/**
 * Kill up to `n` living lobby members. Prefer wounded squads.
 * Off-screen deaths name a killer skin. A passed killerOutfit means the player squad did it.
 */
export function killLobbyMembers(
  lobby,
  n,
  {
    preferSquadId = null,
    playersLeft = null,
    killerOutfit = null,
    offscreen = true,
    stormDeathChance = OFFSCREEN_FALL_CHANCE,
  } = {},
) {
  const killed = [];
  let remaining = Math.max(0, Math.floor(Number(n) || 0));
  let place = Number.isFinite(Number(playersLeft)) ? Number(playersLeft) : null;

  const causeFor = (squad, target) => {
    if (!offscreen) {
      return {
        kind: 'killed',
        killerId: killerOutfit?.id || '',
        killerName: killerOutfit?.name || '',
      };
    }
    return offscreenCause(lobby, squad, target, stormDeathChance);
  };

  const killOneFrom = (squad) => {
    const living = aliveMembers(squad);
    if (!living.length) return null;
    const weights = living.map((member) => [member, deathWeight(squad, member, place ?? playersLeft)]);
    const target = weighted(weights);
    const placement = place != null ? place : countLobbyAlive(lobby);
    if (place != null) place -= 1;
    applyDeath(target, placement, causeFor(squad, target));
    killed.push({ squad, member: target });
    return target;
  };

  if (preferSquadId != null) {
    const preferred = lobby.find((squad) => squad.id === preferSquadId);
    while (remaining > 0 && preferred && aliveCount(preferred) > 0) {
      killOneFrom(preferred);
      remaining -= 1;
    }
  }

  while (remaining > 0) {
    const candidates = [];
    for (const squad of lobby) {
      for (const member of aliveMembers(squad)) {
        candidates.push([member, deathWeight(squad, member, place ?? playersLeft), squad]);
      }
    }
    if (!candidates.length) break;
    const total = candidates.reduce((sum, [, w]) => sum + w, 0);
    let roll = rand() * total;
    let chosen = candidates[candidates.length - 1];
    for (const entry of candidates) {
      roll -= entry[1];
      if (roll <= 0) {
        chosen = entry;
        break;
      }
    }
    const [, , squad] = chosen;
    killOneFrom(squad);
    remaining -= 1;
  }

  return killed;
}

export function pickSquadForSize(lobby, size) {
  const exact = livingSquads(lobby, size);
  if (exact.length) return pick(exact);
  // Fall back to any living squad (caller trims).
  const any = livingSquads(lobby, 1);
  return any.length ? pick(any) : null;
}

export function takeAliveMembers(squad, count) {
  return shuffle(aliveMembers(squad)).slice(0, Math.max(0, count));
}
