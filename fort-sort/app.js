import { estimateRemaining, looseName, normalizeName, parsePastedNames, replay, shuffle } from './sorter.js?v=8';
import { BYE, createBracket, pageLabel, resolveBracket, roundLabel } from './bracket.js?v=8';
import { MY_SKINS } from './preset.js?v=8';

const STORAGE_KEY = 'fort-sort-progress-v1';
const BRACKET_KEY = 'fort-sort-bracket-v1';
const DRAFT_KEY = 'fort-sort-draft-v1';
const MODE_KEY = 'fort-sort-mode-v1';
const FORT_HANG_PATH = '../fort-hang';

// Mirrors getGameOutfits in FortHang/src/utils/outfits.js so "every skin" matches the game.
const EXCLUDED_NAMES = new Set([
  'Recruit', 'TBD', 'Set_01_LA_SG', 'Set_01_OA', 'Set_01_OA_SG', 'Set_01_PA', 'Set_01_TA_SG',
  'PERF OPTIMIZED', 'Marauder', 'Marauder Heavy', 'Doombot Agent', 'Marauder Elite', 'null', 'Random', 'Default',
]);

const MODE_DESCRIPTIONS = {
  rank: 'Ranking mode: pick between two skins until every skin has a place from favorite to least favorite.',
  bracket:
    'Bracket mode: skins play a double-elimination tournament. Losing once drops a skin to the losers bracket; losing twice knocks it out. Big brackets are split into Round 1 Pools, Round 2 Pools if needed, Top 64, and Top 8.',
};

const $ = (id) => document.getElementById(id);

const outfitsById = new Map();
const exactNames = new Map();
const looseNames = new Map();
let gameOutfits = [];
let pendingIds = [];
let mode = 'rank';
let progress = null;
let tournament = null;
let board = null;
let pageIndex = 0;
let followCurrentPage = true;
let pendingJumpMatchId = null;
let html2canvasPromise = null;

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

function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function loadProgress() {
  const saved = readJson(STORAGE_KEY);
  if (!saved || !Array.isArray(saved.order)) return null;
  const decisions = Array.isArray(saved.decisions)
    ? saved.decisions
    : [...String(saved.decisions ?? '')].map((bit) => bit === '1');
  return { order: saved.order, decisions };
}

function saveProgress() {
  const decisions = progress.decisions.map((win) => (win ? '1' : '0')).join('');
  writeStorage(STORAGE_KEY, JSON.stringify({ order: progress.order, decisions, savedAt: Date.now() }));
}

function loadTournament() {
  const saved = readJson(BRACKET_KEY);
  if (!saved || !Array.isArray(saved.entrants) || !Array.isArray(saved.history)) return null;
  // Keep each save on the bracket wiring it was started with (v1/v2/v3 drop rules differ).
  return makeTournament(saved.entrants, saved.history, saved.version ?? 1);
}

function makeTournament(entrants, history, version = 3) {
  return { entrants, history, version, bracket: createBracket(entrants, version) };
}

function saveTournament() {
  writeStorage(
    BRACKET_KEY,
    JSON.stringify({
      entrants: tournament.entrants,
      history: tournament.history,
      version: tournament.version ?? 3,
      savedAt: Date.now(),
    }),
  );
}

function tournamentState() {
  return resolveBracket(tournament.bracket, Object.fromEntries(tournament.history));
}

function iconSrc(outfit) {
  const icon = outfit.icon || `/skin-icons/${outfit.number}.png`;
  return icon.startsWith('/') ? `${FORT_HANG_PATH}${icon}` : icon;
}

function renderIcon(outfit) {
  const img = document.createElement('img');
  img.src = iconSrc(outfit);
  img.alt = '';
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

function showView(...names) {
  for (const view of ['import', 'compare', 'results', 'champion', 'bracket']) {
    $(`${view}-view`).hidden = !names.includes(view);
  }
  $('restart-button').hidden = names.includes('import');
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
  updateStartButton();
}

function updateStartButton() {
  const count = pendingIds.length;
  $('start-button').hidden = count < 2;
  $('start-button').textContent =
    mode === 'rank' ? `Start sorting ${count} skins` : `Start bracket with ${count} skins`;
}

function loadPreset(names) {
  $('import-text').value = names.join('\n');
  writeStorage(DRAFT_KEY, $('import-text').value);
  checkPastedNames();
}

function start() {
  if (mode === 'rank') {
    progress = { order: shuffle(pendingIds), decisions: [] };
    saveProgress();
  } else {
    tournament = makeTournament(shuffle(pendingIds), []);
    board = null;
    pageIndex = 0;
    followCurrentPage = true;
    saveTournament();
  }
  $('resume-note').hidden = true;
  render();
}

function choose(firstWins) {
  if (mode === 'rank') {
    progress.decisions.push(firstWins);
    saveProgress();
  } else {
    const { current } = tournamentState();
    if (!current) return;
    tournament.history.push([current.id, firstWins ? 0 : 1]);
    saveTournament();
    followCurrentPage = true;
  }
  $('resume-note').hidden = true;
  render();
}

function undo() {
  if (mode === 'rank') {
    if (!progress?.decisions.length) return;
    progress.decisions.pop();
    saveProgress();
  } else {
    if (!tournament?.history.length) return;
    tournament.history.pop();
    saveTournament();
    followCurrentPage = true;
  }
  render();
}

function fillCard(card, outfit, onPick) {
  const name = document.createElement('p');
  name.className = 'skin-name';
  name.textContent = outfit.name;
  const meta = document.createElement('p');
  meta.className = 'skin-meta';
  meta.textContent = seasonLabel(outfit);
  card.replaceChildren(renderIcon(outfit), name, meta);
  if (onPick) card.onclick = onPick;
}

function setProgress(done, remaining, detail) {
  $('progress-fill').style.width = `${(done / Math.max(1, done + remaining)) * 100}%`;
  $('progress-text').textContent = `${done} picks made · about ${remaining} left · ${detail} · saved on this device`;
}

function renderRankCompare(state) {
  const total = progress.order.length;
  const done = progress.decisions.length;
  setProgress(done, estimateRemaining(state, total), `${state.index} of ${total} skins placed`);
  $('match-label').hidden = true;
  $('jump-button').hidden = true;

  const challenger = outfitsById.get(state.challenger);
  const opponent = outfitsById.get(state.opponent);
  const challengerOnLeft = (state.index + state.lo + state.hi) % 2 === 0;
  fillCard($('left-card'), challengerOnLeft ? challenger : opponent, () => choose(challengerOnLeft));
  fillCard($('right-card'), challengerOnLeft ? opponent : challenger, () => choose(!challengerOnLeft));
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

function goToPage(index, { follow = false } = {}) {
  pageIndex = index;
  followCurrentPage = follow;
  board = null;
  render();
}

function jumpToMatch(matchId) {
  if (!tournament || !matchId) return;
  followCurrentPage = false;
  pendingJumpMatchId = matchId;
  const target = tournament.bracket.pageOf.get(matchId);
  if (target != null && target !== pageIndex) goToPage(target);
  else render();
}

function finishPendingJump() {
  const matchId = pendingJumpMatchId;
  if (!matchId || !board) return;
  pendingJumpMatchId = null;
  const box = board.boxes.get(matchId);
  if (!box) return;
  box.classList.add('is-jump-target');
  box.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  window.setTimeout(() => box.classList.remove('is-jump-target'), 1600);
}

function feedButton(text, matchId, className = 'feed-link') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = text;
  button.title = text;
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    jumpToMatch(matchId);
  });
  return button;
}

function renderPageNav(bracket, currentMatchId) {
  const nav = $('bracket-nav');
  if (bracket.pages.length < 2) {
    nav.hidden = true;
    nav.replaceChildren();
    return;
  }
  nav.hidden = false;

  const phases = [];
  for (const [index, page] of bracket.pages.entries()) {
    const last = phases[phases.length - 1];
    if (last?.phase === page.phase) last.pages.push({ index, page });
    else phases.push({ phase: page.phase, pages: [{ index, page }] });
  }

  const phaseBar = document.createElement('div');
  phaseBar.className = 'page-tabs';
  const currentPhase = bracket.pages[pageIndex].phase;
  for (const group of phases) {
    const button = document.createElement('button');
    button.className = 'page-tab';
    button.classList.toggle('is-active', group.phase === currentPhase);
    button.textContent = group.phase;
    if (group.pages.some(({ index }) => bracket.pageOf.get(currentMatchId) === index)) {
      button.classList.add('has-current');
    }
    button.addEventListener('click', () => goToPage(group.pages[0].index));
    phaseBar.append(button);
  }

  const children = [phaseBar];
  const activeGroup = phases.find((group) => group.phase === currentPhase);
  if (activeGroup?.pages.length > 1) {
    const poolBar = document.createElement('div');
    poolBar.className = 'page-tabs pool-tabs';
    for (const { index, page } of activeGroup.pages) {
      const button = document.createElement('button');
      button.className = 'page-tab';
      button.classList.toggle('is-active', index === pageIndex);
      if (bracket.pageOf.get(currentMatchId) === index) button.classList.add('has-current');
      button.textContent = page.pool;
      button.addEventListener('click', () => goToPage(index));
      poolBar.append(button);
    }
    children.push(poolBar);
  }

  const title = Object.assign(document.createElement('p'), {
    className: 'page-title',
    textContent: pageLabel(bracket.pages[pageIndex]),
  });
  children.push(title);

  const connections = renderConnectionShortcuts(bracket, pageIndex);
  if (connections) children.push(connections);

  nav.replaceChildren(...children);
}

function renderConnectionShortcuts(bracket, index) {
  const outs = bracket.feeds.filter((feed) => feed.fromPage === index);
  const ins = bracket.feeds.filter((feed) => feed.toPage === index);
  if (!outs.length && !ins.length) return null;

  const bar = document.createElement('div');
  bar.className = 'connection-bar';

  const addGroup = (label, items, pickMatch) => {
    if (!items.length) return;
    const group = document.createElement('div');
    group.className = 'connection-group';
    group.append(Object.assign(document.createElement('span'), { className: 'connection-label', textContent: label }));
    for (const item of items) {
      group.append(feedButton(item.label, pickMatch(item.feed), 'feed-link connection-chip'));
    }
    bar.append(group);
  };

  const uniqueBy = (feeds, keyFn, labelFn) => {
    const seen = new Map();
    for (const feed of feeds) {
      const key = keyFn(feed);
      if (!seen.has(key)) seen.set(key, { key, label: labelFn(feed), feed });
    }
    return [...seen.values()];
  };

  addGroup(
    'Advances to',
    uniqueBy(outs, (feed) => feed.toPage, (feed) => `→ ${feed.toLabel}`),
    (feed) => feed.toMatchId,
  );
  addGroup(
    'Feeds in from',
    uniqueBy(ins, (feed) => feed.fromPage, (feed) => `← ${feed.fromLabel}`),
    (feed) => feed.fromMatchId,
  );

  return bar;
}

function buildBoard(bracket, index) {
  const rows = new Map();
  const boxes = new Map();
  const page = bracket.pages[index];

  const matchBox = (match) => {
    const box = document.createElement('div');
    box.className = 'bracket-match';
    const matchRows = [0, 1].map((slot) => {
      const row = document.createElement('div');
      row.className = 'bracket-row';
      const inbound = bracket.inbound.get(`${match.id}:${slot}`);
      if (inbound) {
        row.dataset.inboundFrom = inbound.fromMatchId;
        row.dataset.inboundLabel = inbound.fromLabel;
      }
      row.addEventListener('click', () => {
        if (box.classList.contains('is-current')) choose(slot === 0);
      });
      box.append(row);
      return row;
    });

    const outbound = bracket.outbound.get(match.id) ?? [];
    if (outbound.length) {
      const links = document.createElement('div');
      links.className = 'feed-out';
      for (const feed of outbound) {
        links.append(feedButton(`→ ${feed.toLabel}`, feed.toMatchId));
      }
      box.append(links);
    }

    rows.set(match.id, matchRows);
    boxes.set(match.id, box);
    return box;
  };

  const section = (title, rounds) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'bracket-section';
    const heading = Object.assign(document.createElement('h3'), { textContent: title });
    const columns = document.createElement('div');
    columns.className = 'bracket-rounds';
    for (const round of rounds) {
      if (!round.length) continue;
      const column = document.createElement('div');
      column.className = 'bracket-round';
      const label = Object.assign(document.createElement('h4'), { textContent: roundLabel(bracket, round[0]) });
      const list = document.createElement('div');
      list.className = 'bracket-matches';
      list.append(...round.map(matchBox));
      column.append(label, list);
      columns.append(column);
    }
    wrapper.append(heading, columns);
    return wrapper;
  };

  $('bracket-board').replaceChildren(
    ...page.sections.map(({ title, rounds }) => section(title, rounds)),
  );
  return { rows, boxes, pageIndex: index };
}

function fillRow(row, participant) {
  const inboundFrom = row.dataset.inboundFrom || '';
  const inboundLabel = row.dataset.inboundLabel || '';
  const key = `${participant ?? '__tbd__'}|${inboundFrom}`;
  if (row.dataset.participant === key) return;
  row.dataset.participant = key;
  row.classList.toggle('is-tbd', participant === null);
  row.classList.toggle('is-bye', participant === BYE);
  row.classList.toggle('has-inbound', Boolean(inboundFrom));

  const children = [];
  if (inboundFrom) {
    children.push(feedButton(`← ${inboundLabel}`, inboundFrom, 'feed-link feed-in'));
  }

  if (participant === null) {
    if (!inboundFrom) children.push(Object.assign(document.createElement('span'), { textContent: 'TBD' }));
    row.replaceChildren(...children);
    return;
  }
  if (participant === BYE) {
    children.push(Object.assign(document.createElement('span'), { textContent: 'BYE' }));
    row.replaceChildren(...children);
    return;
  }

  const outfit = outfitsById.get(participant);
  const name = Object.assign(document.createElement('span'), { textContent: outfit?.name ?? participant });
  row.title = outfit?.name ?? '';
  if (outfit) children.push(renderIcon(outfit));
  children.push(name);
  row.replaceChildren(...children);
}

function updateBoard(state) {
  for (const [id, rows] of board.rows) {
    const outcome = state.outcomes.get(id);
    const box = board.boxes.get(id);
    const [first, second] = rows;
    fillRow(first, outcome.participants[0]);
    fillRow(second, outcome.participants[1]);
    const decided = outcome.winnerSlot != null;
    first.classList.toggle('is-winner', decided && outcome.winnerSlot === 0);
    first.classList.toggle('is-loser', decided && outcome.winnerSlot === 1);
    second.classList.toggle('is-winner', decided && outcome.winnerSlot === 1);
    second.classList.toggle('is-loser', decided && outcome.winnerSlot === 0);
    box.classList.toggle('is-current', state.current?.id === id);
    box.classList.toggle('is-auto', outcome.auto);
    box.classList.toggle('is-skipped', outcome.skipped);
  }
}

function realMatchesLeft(state) {
  // Every skin except the champion loses exactly twice, so a bracket needs 2N - 2 picks, plus one for a reset.
  const played = tournament.history.length;
  const resetPending = state.outcomes.get('GF1').winnerSlot === 1 && state.outcomes.get('GF2').winnerSlot == null;
  return 2 * tournament.entrants.length - 2 - played + (resetPending ? 1 : 0);
}

function safeFileName(text) {
  return text.replace(/[^\w.-]+/g, '-').replace(/^-|-$/g, '') || 'fortsort';
}

function downloadBlob(blob, filename) {
  const link = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob),
    download: filename,
  });
  link.click();
  URL.revokeObjectURL(link.href);
}

function loadHtml2Canvas() {
  if (window.html2canvas) return Promise.resolve(window.html2canvas);
  if (html2canvasPromise) return html2canvasPromise;
  html2canvasPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
    script.onload = () => resolve(window.html2canvas);
    script.onerror = () => reject(new Error('Could not load the image exporter'));
    document.head.append(script);
  });
  return html2canvasPromise;
}

async function downloadBracketPage() {
  if (!tournament) return;
  const status = $('download-status');
  const button = $('download-page-button');
  button.disabled = true;
  status.textContent = 'Preparing PNG…';
  try {
    const boardEl = $('bracket-board');
    const previous = {
      maxHeight: boardEl.style.maxHeight,
      overflow: boardEl.style.overflow,
      height: boardEl.style.height,
      width: boardEl.style.width,
    };
    // Expand the scroll box so the full page is captured, not just the viewport.
    boardEl.style.maxHeight = 'none';
    boardEl.style.overflow = 'visible';
    boardEl.style.height = `${boardEl.scrollHeight}px`;
    boardEl.style.width = `${Math.max(boardEl.scrollWidth, boardEl.clientWidth)}px`;

    const html2canvas = await loadHtml2Canvas();
    const canvas = await html2canvas(boardEl, {
      backgroundColor: '#0b1222',
      scale: 2,
      useCORS: true,
      logging: false,
      width: boardEl.scrollWidth,
      height: boardEl.scrollHeight,
      windowWidth: boardEl.scrollWidth,
      windowHeight: boardEl.scrollHeight,
    });

    Object.assign(boardEl.style, previous);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('PNG export failed');
    const title = pageLabel(tournament.bracket.pages[pageIndex]);
    downloadBlob(blob, `fortsort-${safeFileName(title)}.png`);
    status.textContent = 'Downloaded PNG.';
  } catch (error) {
    $('download-status').textContent = error.message;
  } finally {
    button.disabled = false;
  }
}

function downloadBracketProgress() {
  if (!tournament) return;
  const payload = {
    type: 'fort-sort-bracket',
    version: tournament.version ?? 3,
    entrants: tournament.entrants,
    history: tournament.history,
    savedAt: Date.now(),
  };
  downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), 'fortsort-bracket-progress.json');
  $('download-status').textContent = 'Downloaded progress.';
}

function renderBracket() {
  const state = tournamentState();
  const { bracket } = tournament;
  const currentPage = state.current ? bracket.pageOf.get(state.current.id) : bracket.pages.length - 1;
  if (pageIndex >= bracket.pages.length) pageIndex = currentPage;
  else if (!state.done && followCurrentPage) pageIndex = currentPage;
  if (!board || board.pageIndex !== pageIndex) board = buildBoard(bracket, pageIndex);
  renderPageNav(bracket, state.current?.id);
  updateBoard(state);
  finishPendingJump();

  if (state.done) {
    showView('champion', 'bracket');
    fillCard($('champion-card'), outfitsById.get(state.champion));
    fillCard($('runner-up-card'), outfitsById.get(state.runnerUp));
    $('champion-card').prepend(Object.assign(document.createElement('p'), { className: 'podium-place', textContent: '🏆 Champion' }));
    $('runner-up-card').prepend(Object.assign(document.createElement('p'), { className: 'podium-place', textContent: 'Runner-up' }));
    $('champion-undo-button').disabled = tournament.history.length === 0;
    return;
  }

  showView('compare', 'bracket');
  const match = state.current;
  const [first, second] = state.outcomes.get(match.id).participants;
  const page = bracket.pages[currentPage];
  $('match-label').hidden = false;
  $('match-label').textContent = `${roundLabel(bracket, match)} · ${pageLabel(page)}`;
  $('jump-button').hidden = false;
  setProgress(
    tournament.history.length,
    realMatchesLeft(state),
    `${tournament.entrants.length} skins · ${pageLabel(page)}`,
  );
  fillCard($('left-card'), outfitsById.get(first), () => choose(true));
  fillCard($('right-card'), outfitsById.get(second), () => choose(false));
  $('undo-button').disabled = tournament.history.length === 0;
}

function renderModeTabs() {
  for (const tab of document.querySelectorAll('.mode-tab')) {
    tab.classList.toggle('is-active', tab.dataset.mode === mode);
  }
  $('mode-description').textContent = MODE_DESCRIPTIONS[mode];
  $('compare-title').textContent = mode === 'rank' ? 'Which skin do you like more?' : 'Which skin advances?';
  updateStartButton();
}

function render() {
  renderModeTabs();
  if (mode === 'bracket') {
    if (tournament) renderBracket();
    else showView('import');
    return;
  }

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
    renderRankCompare(state);
  }
}

function switchMode(nextMode) {
  if (nextMode === mode) return;
  mode = nextMode;
  writeStorage(MODE_KEY, mode);
  $('resume-note').hidden = true;
  render();
}

function wireEvents() {
  $('check-button').addEventListener('click', checkPastedNames);
  $('preset-button').addEventListener('click', () => loadPreset(MY_SKINS));
  $('all-preset-button').addEventListener('click', () => loadPreset(gameOutfits.map((outfit) => outfit.name.trim())));
  $('import-text').addEventListener('input', () => writeStorage(DRAFT_KEY, $('import-text').value));
  $('start-button').addEventListener('click', start);
  for (const id of ['undo-button', 'results-undo-button', 'champion-undo-button']) {
    $(id).addEventListener('click', undo);
  }
  for (const tab of document.querySelectorAll('.mode-tab')) {
    tab.addEventListener('click', () => switchMode(tab.dataset.mode));
  }
  $('jump-button').addEventListener('click', () => {
    const state = tournamentState();
    const target = tournament.bracket.pageOf.get(state.current?.id) ?? pageIndex;
    if (target !== pageIndex) {
      goToPage(target, { follow: true });
      requestAnimationFrame(() => {
        board?.boxes.get(state.current?.id)?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      });
      return;
    }
    followCurrentPage = true;
    board?.boxes.get(state.current?.id)?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  });
  $('download-page-button').addEventListener('click', downloadBracketPage);
  $('download-progress-button').addEventListener('click', downloadBracketProgress);
  $('restart-button').addEventListener('click', () => {
    const what = mode === 'rank' ? 'ranking' : 'bracket';
    if (!confirm(`Start over? This erases all your ${what} picks.`)) return;
    if (mode === 'rank') {
      localStorage.removeItem(STORAGE_KEY);
      progress = null;
    } else {
      localStorage.removeItem(BRACKET_KEY);
      tournament = null;
      board = null;
      pageIndex = 0;
      followCurrentPage = true;
    }
    $('copy-status').textContent = '';
    $('download-status').textContent = '';
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

function showResumeNote(picks) {
  if (!picks) return;
  $('resume-note').hidden = false;
  $('resume-note').textContent = `Welcome back! Picking up where you left off (${picks} picks saved).`;
}

function showStaleSaveError() {
  $('load-error').hidden = false;
  $('load-error').textContent =
    'A saved sort uses skins that are no longer in the catalogue, so it could not be resumed. It stays saved until you start a new one.';
}

async function init() {
  wireEvents();
  mode = localStorage.getItem(MODE_KEY) === 'bracket' ? 'bracket' : 'rank';
  setImportEnabled(false);
  $('import-summary').textContent = 'Loading skins…';
  renderModeTabs();
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

  const savedRanking = loadProgress();
  if (savedRanking?.order.every((id) => outfitsById.has(id))) progress = savedRanking;
  else if (savedRanking) showStaleSaveError();

  const savedBracket = loadTournament();
  if (savedBracket?.entrants.every((id) => outfitsById.has(id))) tournament = savedBracket;
  else if (savedBracket) showStaleSaveError();

  showResumeNote(mode === 'rank' ? progress?.decisions.length : tournament?.history.length);
  render();
  if ($('import-text').value.trim()) checkPastedNames();
}

init();
