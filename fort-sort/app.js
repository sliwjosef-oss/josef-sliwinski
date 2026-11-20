import { estimateRemaining, looseName, normalizeName, parsePastedNames, replay, shuffle } from './sorter.js?v=3';
import { MY_SKINS } from './preset.js?v=3';

const STORAGE_KEY = 'fort-sort-progress-v1';
const DRAFT_KEY = 'fort-sort-draft-v1';
const FORT_HANG_PATH = '../fort-hang';

// Mirrors getGameOutfits in FortHang/src/utils/outfits.js so "every skin" matches the game.
const EXCLUDED_NAMES = new Set([
  'Recruit', 'TBD', 'Set_01_LA_SG', 'Set_01_OA', 'Set_01_OA_SG', 'Set_01_PA', 'Set_01_TA_SG',
  'PERF OPTIMIZED', 'Marauder', 'Marauder Heavy', 'Doombot Agent', 'Marauder Elite', 'null', 'Random', 'Default',
]);

const $ = (id) => document.getElementById(id);

const outfitsById = new Map();
const exactNames = new Map();
const looseNames = new Map();
let gameOutfits = [];
let pendingIds = [];
let progress = null;

function isDuplicateVariant(id) {
  return /_NPC|_LOD(?![A-Za-z])|CINE|ForSwitch|TBD_Athena/i.test(id);
}

function isGameOutfit(outfit) {
  const season = String(outfit.season ?? '').trim();
  return (
    outfit.name?.trim() &&
    !EXCLUDED_NAMES.has(outfit.name) &&
    season &&
    season.toUpperCase() !== 'TBD' &&
    !isDuplicateVariant(outfit.id)
  );
}

function addedTime(outfit) {
  return outfit.added ? Date.parse(outfit.added) : Number.MAX_SAFE_INTEGER;
}

function buildCatalogue(outfits) {
  const byName = new Map();
  for (const outfit of outfits) {
    if (!isGameOutfit(outfit)) continue;
    const existing = byName.get(outfit.name);
    if (!existing || addedTime(outfit) < addedTime(existing)) byName.set(outfit.name, outfit);
  }
  gameOutfits = [...byName.values()];

  for (const outfit of gameOutfits) {
    outfitsById.set(outfit.id, outfit);
    const exact = normalizeName(outfit.name);
    if (!exactNames.has(exact)) exactNames.set(exact, outfit);
    const loose = looseName(outfit.name);
    if (loose && !looseNames.has(loose)) looseNames.set(loose, outfit);
  }
}

function findOutfit(name) {
  return exactNames.get(normalizeName(name)) ?? looseNames.get(looseName(name)) ?? null;
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value);
    $('save-warning').hidden = true;
  } catch {
    $('save-warning').hidden = false;
  }
}

function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || !Array.isArray(saved.order)) return null;
    const decisions = Array.isArray(saved.decisions)
      ? saved.decisions
      : [...String(saved.decisions ?? '')].map((bit) => bit === '1');
    return { order: saved.order, decisions };
  } catch {
    return null;
  }
}

function saveProgress() {
  const decisions = progress.decisions.map((win) => (win ? '1' : '0')).join('');
  writeStorage(STORAGE_KEY, JSON.stringify({ order: progress.order, decisions, savedAt: Date.now() }));
}

function iconSrc(outfit) {
  const icon = outfit.icon || `/skin-icons/${outfit.number}.png`;
  return icon.startsWith('/') ? `${FORT_HANG_PATH}${icon}` : icon;
}

function renderIcon(outfit) {
  const img = document.createElement('img');
  img.src = iconSrc(outfit);
  img.alt = outfit.name;
  img.loading = 'lazy';
  img.addEventListener('error', () => {
    const placeholder = document.createElement('div');
    placeholder.className = 'icon-placeholder';
    placeholder.textContent = outfit.name.trim().charAt(0).toUpperCase();
    img.replaceWith(placeholder);
  });
  return img;
}

function seasonLabel(outfit) {
  return outfit.chapter && outfit.season ? `Chapter ${outfit.chapter} · Season ${outfit.season}` : '';
}

function showView(name) {
  for (const view of ['import', 'compare', 'results']) {
    $(`${view}-view`).hidden = view !== name;
  }
  $('restart-button').hidden = name === 'import';
}

function checkPastedNames() {
  const names = parsePastedNames($('import-text').value);
  const ids = [];
  const seenIds = new Set();
  const unmatched = [];
  for (const name of names) {
    const outfit = findOutfit(name);
    if (!outfit) {
      unmatched.push(name);
    } else if (!seenIds.has(outfit.id)) {
      seenIds.add(outfit.id);
      ids.push(outfit.id);
    }
  }
  pendingIds = ids;

  $('import-summary').textContent = `${ids.length} skins matched${unmatched.length ? `, ${unmatched.length} not found` : ''}.`;
  $('unmatched-box').hidden = unmatched.length === 0;
  $('unmatched-list').replaceChildren(
    ...unmatched.map((name) => Object.assign(document.createElement('li'), { textContent: name })),
  );
  $('start-button').hidden = ids.length < 2;
  $('start-button').textContent = `Start sorting ${ids.length} skins`;
}

function loadPreset(names) {
  $('import-text').value = names.join('\n');
  writeStorage(DRAFT_KEY, $('import-text').value);
  checkPastedNames();
}

function startSorting() {
  progress = { order: shuffle(pendingIds), decisions: [] };
  saveProgress();
  render();
}

function choose(challengerWins) {
  progress.decisions.push(challengerWins);
  saveProgress();
  $('resume-note').hidden = true;
  render();
}

function undo() {
  if (!progress?.decisions.length) return;
  progress.decisions.pop();
  saveProgress();
  render();
}

function fillCard(card, outfit, challengerWins) {
  const name = document.createElement('p');
  name.className = 'skin-name';
  name.textContent = outfit.name;
  const meta = document.createElement('p');
  meta.className = 'skin-meta';
  meta.textContent = seasonLabel(outfit);
  card.replaceChildren(renderIcon(outfit), name, meta);
  card.onclick = () => choose(challengerWins);
}

function renderCompare(state) {
  const total = progress.order.length;
  const done = progress.decisions.length;
  const remaining = estimateRemaining(state, total);
  const percent = (done / (done + remaining)) * 100;
  $('progress-fill').style.width = `${percent}%`;
  $('progress-text').textContent =
    `${done} picks made · about ${remaining} left · ${state.index} of ${total} skins placed · saved on this device`;

  const challenger = outfitsById.get(state.challenger);
  const opponent = outfitsById.get(state.opponent);
  const challengerOnLeft = (state.index + state.lo + state.hi) % 2 === 0;
  fillCard($('left-card'), challengerOnLeft ? challenger : opponent, challengerOnLeft);
  fillCard($('right-card'), challengerOnLeft ? opponent : challenger, !challengerOnLeft);
  $('undo-button').disabled = done === 0;
}

function rankingLines(sorted) {
  return sorted.map((id, rank) => `${rank + 1}. ${outfitsById.get(id)?.name.trim() ?? id}`);
}

function renderResults(state) {
  const items = state.sorted.map((id, rank) => {
    const outfit = outfitsById.get(id);
    const item = document.createElement('li');
    const rankLabel = Object.assign(document.createElement('span'), { className: 'rank', textContent: rank + 1 });
    const name = Object.assign(document.createElement('span'), { textContent: outfit?.name ?? id });
    item.append(rankLabel, outfit ? renderIcon(outfit) : '', name);
    return item;
  });
  $('results-list').replaceChildren(...items);
  $('results-undo-button').disabled = progress.decisions.length === 0;

  $('copy-button').onclick = async () => {
    await navigator.clipboard.writeText(rankingLines(state.sorted).join('\n'));
    $('copy-status').textContent = 'Copied!';
  };
  $('download-button').onclick = () => {
    const blob = new Blob([rankingLines(state.sorted).join('\r\n')], { type: 'text/plain' });
    const link = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: 'skin-ranking.txt',
    });
    link.click();
    URL.revokeObjectURL(link.href);
  };
}

function render() {
  if (!progress) {
    showView('import');
    return;
  }
  const state = replay(progress.order, progress.decisions);
  if (state.done) {
    if (state.used < progress.decisions.length) progress.decisions.length = state.used;
    showView('results');
    renderResults(state);
  } else {
    showView('compare');
    renderCompare(state);
  }
}

function wireEvents() {
  $('check-button').addEventListener('click', checkPastedNames);
  $('preset-button').addEventListener('click', () => loadPreset(MY_SKINS));
  $('all-preset-button').addEventListener('click', () => loadPreset(gameOutfits.map((outfit) => outfit.name.trim())));
  $('import-text').addEventListener('input', () => writeStorage(DRAFT_KEY, $('import-text').value));
  $('start-button').addEventListener('click', startSorting);
  $('undo-button').addEventListener('click', undo);
  $('results-undo-button').addEventListener('click', undo);
  $('restart-button').addEventListener('click', () => {
    if (!confirm('Start over? This erases all your picks.')) return;
    localStorage.removeItem(STORAGE_KEY);
    progress = null;
    $('copy-status').textContent = '';
    $('resume-note').hidden = true;
    render();
    if ($('import-text').value.trim()) checkPastedNames();
  });

  document.addEventListener('keydown', (event) => {
    if ($('compare-view').hidden) return;
    if (event.key === 'ArrowLeft') $('left-card').click();
    else if (event.key === 'ArrowRight') $('right-card').click();
    else if (event.key === 'Backspace') undo();
    else return;
    event.preventDefault();
  });
}

function setImportEnabled(enabled) {
  for (const id of ['check-button', 'preset-button', 'all-preset-button']) $(id).disabled = !enabled;
}

async function init() {
  wireEvents();
  setImportEnabled(false);
  $('import-summary').textContent = 'Loading skins…';
  showView('import');

  try {
    const response = await fetch(`${FORT_HANG_PATH}/outfits.json`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    buildCatalogue(await response.json());
  } catch (error) {
    $('import-summary').textContent = '';
    $('load-error').hidden = false;
    $('load-error').textContent = `Could not load the skin catalogue: ${error.message}`;
    return;
  }

  setImportEnabled(true);
  $('import-summary').textContent = '';
  $('preset-button').textContent = `Load Josef's skins (${MY_SKINS.length})`;
  $('all-preset-button').textContent = `Load every skin (${gameOutfits.length.toLocaleString()})`;
  $('import-text').value = localStorage.getItem(DRAFT_KEY) ?? '';

  const saved = loadProgress();
  if (saved && saved.order.every((id) => outfitsById.has(id))) {
    progress = saved;
    if (saved.decisions.length) {
      $('resume-note').hidden = false;
      $('resume-note').textContent = `Welcome back! Picking up where you left off (${saved.decisions.length} picks saved).`;
    }
  } else if (saved) {
    $('load-error').hidden = false;
    $('load-error').textContent =
      'Your saved sort uses skins that are no longer in the catalogue, so it could not be resumed. It is still saved until you start a new sort.';
  }

  render();
  if (!progress && $('import-text').value.trim()) checkPastedNames();
}

init();
