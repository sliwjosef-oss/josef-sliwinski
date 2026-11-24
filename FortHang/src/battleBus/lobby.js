import { SQUAD_BASE_ODDS, SQUAD_TYPES } from './constants';

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
  const picked = pool.slice(0, Math.min(need, pool.length));
  const squads = [];
  let id = 0;
  let i = 0;
  while (i + 4 <= picked.length) {
    squads.push({
      id: id++,
      type: rollSquadType(),
      members: picked.slice(i, i + 4).map((outfit) => ({ outfit, alive: true })),
    });
    i += 4;
  }
  if (i < picked.length) {
    // Remainder squad (e.g. 95 → one squad of 3).
    squads.push({
      id: id++,
      type: rollSquadType(),
      members: picked.slice(i).map((outfit) => ({ outfit, alive: true })),
    });
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

/** Higher weight once a squad has already lost someone. */
export function deathWeight(squad, member) {
  if (!member?.alive) return 0;
  const fallen = (squad.members || []).filter((entry) => !entry.alive).length;
  return 1 + fallen * 3;
}

/**
 * Kill up to `n` living lobby members. Prefer wounded squads.
 * Optionally prefer a specific squad first (fight rewards).
 */
export function killLobbyMembers(lobby, n, { preferSquadId = null } = {}) {
  const killed = [];
  let remaining = Math.max(0, Math.floor(Number(n) || 0));

  const killOneFrom = (squad) => {
    const living = aliveMembers(squad);
    if (!living.length) return null;
    const weights = living.map((member) => [member, deathWeight(squad, member)]);
    const target = weighted(weights);
    target.alive = false;
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
        candidates.push([member, deathWeight(squad, member), squad]);
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
    const [member] = chosen;
    member.alive = false;
    killed.push({ squad, member });
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
