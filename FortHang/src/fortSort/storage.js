const RANK_KEY = 'fort-sort-progress-v1';
const BRACKET_KEY = 'fort-sort-bracket-v1';
const MODE_KEY = 'fort-sort-mode-v1';
const ARCHIVE_KEY = 'fort-sort-archive-v1';
const SELECTED_KEY = 'fort-sort-selected-v1';

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
  return localStorage.getItem(MODE_KEY) === 'bracket' ? 'bracket' : 'rank';
}

export function saveSortMode(mode) {
  localStorage.setItem(MODE_KEY, mode);
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

export function loadBracketProgress() {
  const saved = readJson(BRACKET_KEY);
  if (!saved || !Array.isArray(saved.entrants) || !Array.isArray(saved.history)) return null;
  return {
    entrants: saved.entrants,
    history: saved.history,
    version: saved.version ?? 4,
    archiveId: saved.archiveId ?? null,
  };
}

export function saveBracketProgress(tournament) {
  writeJson(BRACKET_KEY, {
    entrants: tournament.entrants,
    history: tournament.history,
    version: tournament.version ?? 4,
    archiveId: tournament.archiveId ?? null,
    savedAt: Date.now(),
  });
}

export function clearBracketProgress() {
  localStorage.removeItem(BRACKET_KEY);
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
