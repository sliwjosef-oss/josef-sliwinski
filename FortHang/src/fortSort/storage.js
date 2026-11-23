const RANK_KEY = 'fort-sort-progress-v1';
const BRACKET_KEY = 'fort-sort-bracket-v1';
const SIM_BRACKET_KEY = 'fort-sort-sim-bracket-v1';
const MODE_KEY = 'fort-sort-mode-v1';
const ARCHIVE_KEY = 'fort-sort-archive-v1';
const SELECTED_KEY = 'fort-sort-selected-v1';

const VALID_MODES = new Set(['rank', 'bracket', 'simulate', 'betting']);

function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function loadSortMode() {
  const mode = localStorage.getItem(MODE_KEY);
  return VALID_MODES.has(mode) ? mode : 'rank';
}

export function saveSortMode(mode) {
  localStorage.setItem(MODE_KEY, VALID_MODES.has(mode) ? mode : 'rank');
}

export function loadSelectedIds() {
  const saved = readJson(SELECTED_KEY);
  return Array.isArray(saved) ? saved : [];
}

export function saveSelectedIds(ids) {
  writeJson(SELECTED_KEY, ids);
}

export function loadRankProgress() {
  const saved = readJson(RANK_KEY);
  if (!saved || !Array.isArray(saved.order)) return null;
  const decisions = Array.isArray(saved.decisions)
    ? saved.decisions
    : [...String(saved.decisions ?? '')].map((bit) => bit === '1');
  return { order: saved.order, decisions };
}

export function saveRankProgress(progress) {
  writeJson(RANK_KEY, {
    order: progress.order,
    decisions: progress.decisions.map((win) => (win ? '1' : '0')).join(''),
    savedAt: Date.now(),
  });
}

export function clearRankProgress() {
  localStorage.removeItem(RANK_KEY);
}

function normalizeBracketProgress(saved, simulated) {
  if (!saved || !Array.isArray(saved.entrants) || !Array.isArray(saved.history)) return null;
  return {
    entrants: saved.entrants,
    history: saved.history,
    version: saved.version ?? 4,
    archiveId: saved.archiveId ?? null,
    simulated: !!simulated || !!saved.simulated || !!saved.betting,
    betting: !!saved.betting,
    starBetIds: Array.isArray(saved.starBetIds) ? saved.starBetIds : [],
    boostBetIds: Array.isArray(saved.boostBetIds) ? saved.boostBetIds : [],
    pointsEarned: Number(saved.pointsEarned) || 0,
    championBonusPaid: !!saved.championBonusPaid,
    xpAwarded: !!saved.xpAwarded,
    rolls: Array.isArray(saved.rolls) ? saved.rolls : [],
  };
}

export function loadBracketProgress() {
  return normalizeBracketProgress(readJson(BRACKET_KEY), false);
}

export function saveBracketProgress(tournament) {
  writeJson(BRACKET_KEY, {
    entrants: tournament.entrants,
    history: tournament.history,
    version: tournament.version ?? 4,
    archiveId: tournament.archiveId ?? null,
    rolls: tournament.rolls ?? [],
    savedAt: Date.now(),
  });
}

export function clearBracketProgress() {
  localStorage.removeItem(BRACKET_KEY);
}

export function loadSimBracketProgress() {
  return normalizeBracketProgress(readJson(SIM_BRACKET_KEY), true);
}

export function saveSimBracketProgress(tournament) {
  writeJson(SIM_BRACKET_KEY, {
    entrants: tournament.entrants,
    history: tournament.history,
    version: tournament.version ?? 4,
    archiveId: tournament.archiveId ?? null,
    rolls: tournament.rolls ?? [],
    simulated: true,
    betting: !!tournament.betting,
    starBetIds: tournament.starBetIds ?? [],
    boostBetIds: tournament.boostBetIds ?? [],
    pointsEarned: tournament.pointsEarned ?? 0,
    championBonusPaid: !!tournament.championBonusPaid,
    xpAwarded: !!tournament.xpAwarded,
    savedAt: Date.now(),
  });
}

export function clearSimBracketProgress() {
  localStorage.removeItem(SIM_BRACKET_KEY);
}

export function clearAllFortSortData() {
  localStorage.removeItem(RANK_KEY);
  localStorage.removeItem(BRACKET_KEY);
  localStorage.removeItem(SIM_BRACKET_KEY);
  localStorage.removeItem(MODE_KEY);
  localStorage.removeItem(ARCHIVE_KEY);
  localStorage.removeItem(SELECTED_KEY);
}

export function loadArchive() {
  const saved = readJson(ARCHIVE_KEY);
  return Array.isArray(saved) ? saved : [];
}

export function saveArchive(entries) {
  writeJson(ARCHIVE_KEY, entries.slice(0, 40));
}

export function newArchiveId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `tour-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
