import { estimateRemaining, looseName, normalizeName, parsePastedNames, replay, shuffle } from './sorter.js';

const STORAGE_KEY = 'fort-sort-progress-v1';
const EXCLUDED_NAMES = new Set(['default']);

const $ = (id) => document.getElementById(id);

let outfitsById = new Map();
let exactNames = new Map();
let looseNames = new Map();
let pendingIds = [];
let progress = null;

function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.order) && Array.isArray(saved.decisions)) return saved;
  } catch {
    // Corrupt saves fall through to a fresh start.
  }
  return null;
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function buildCatalogue(outfits) {
  for (const outfit of outfits) {
    const exact = normalizeName(outfit.name);
    if (EXCLUDED_NAMES.has(exact)) continue;
    outfitsById.set(outfit.id, outfit);
    if (!exactNames.has(exact)) exactNames.set(exact, outfit);
    const loose = looseName(outfit.name);
    if (loose && !looseNames.has(loose)) looseNames.set(loose, outfit);
  }
}

function findOutfit(name) {
  return exactNames.get(normalizeName(name)) ?? looseNames.get(looseName(name)) ?? null;
}

const FORT_HANG_PATH = '../fort-hang';

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

function startSorting() {
  progress = { order: shuffle(pendingIds), decisions: [] };
  saveProgress();
  render();
}

function choose(challengerWins) {
  progress.decisions.push(challengerWins);
  saveProgress();
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
  card.dataset.challengerWins = String(challengerWins);
}

function renderCompare(state) {
  const total = progress.order.length;
  const done = progress.decisions.length;
  const remaining = estimateRemaining(state, total);
  const percent = (done / (done + remaining)) * 100;
  $('progress-fill').style.width = `${percent}%`;
  $('progress-text').textContent =
    `${done} picks made · about ${remaining} left · ${state.index} of ${total} skins placed`;

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
  $('start-button').addEventListener('click', startSorting);
  $('undo-button').addEventListener('click', undo);
  $('results-undo-button').addEventListener('click', undo);
  $('restart-button').addEventListener('click', () => {
    if (!confirm('Start over? This erases all your picks.')) return;
    localStorage.removeItem(STORAGE_KEY);
    progress = null;
    $('copy-status').textContent = '';
    render();
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

async function init() {
  wireEvents();
  try {
    const response = await fetch(`${FORT_HANG_PATH}/outfits.json`);
    buildCatalogue(await response.json());
  } catch (error) {
    $('load-error').hidden = false;
    $('load-error').textContent = `Could not load the skin catalogue: ${error.message}`;
    return;
  }

  progress = loadProgress();
  if (progress && !progress.order.every((id) => outfitsById.has(id))) progress = null;
  render();
}

init();
