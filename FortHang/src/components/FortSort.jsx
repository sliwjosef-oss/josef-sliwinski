import { useEffect, useMemo, useState } from 'react';
import {
  BYE,
  buildPlayerRun,
  computeStandings,
  createBracket,
  formatPlace,
  matchPhase,
  pageLabel,
  resolveBracket,
  roundLabel,
} from '../fortSort/bracket';
import { estimateRemaining, replay, shuffle } from '../fortSort/sorter';
import {
  clearBracketProgress,
  clearRankProgress,
  clearSimBracketProgress,
  loadArchive,
  loadBracketProgress,
  loadRankProgress,
  loadSelectedIds,
  loadSimBracketProgress,
  loadSortMode,
  newArchiveId,
  saveArchive,
  saveBracketProgress,
  saveRankProgress,
  saveSelectedIds,
  saveSimBracketProgress,
  saveSortMode,
} from '../fortSort/storage';
import {
  getDiceCount,
  hasRound1PoolsPending,
  simulateCurrentRound,
  simulateEntireBracket,
  simulateNextMatch,
  simulateRound1Pools,
} from '../fortSort/simulate';
import {
  BET_WIN_POINTS,
  SUPER_BET_ROUND_BONUS,
  TOURNAMENT_WIN_POINTS,
  addPoints,
  canStartBettingRun,
  getBetWinPointsForPhase,
  getBoostBetBonusDice,
  getDailyBetRunLimit,
  getDailyBetRunsRemaining,
  getLockedBetIds,
  getMaxBoostBets,
  getMaxStarBets,
  getStarBetBonusDice,
  getTournamentWinPoints,
  hasBetSeedingUnlock,
  hasRandomSelectUnlock,
  hasSimulateAllUnlock,
  hasSuperBetExtraLifeUnlock,
  lockBetSkins,
  nextMondayLabel,
  spendBettingRun,
} from '../utils/economy';
import { getOutfitIconFallbackSrc, getOutfitIconSrc } from '../utils/outfits';
import { isSkinGuessed } from '../utils/progress';
import { groupOutfitsBySeason, sortOutfitsByNumber } from '../utils/seasonSort';
import { groupOutfitsBySeries } from '../utils/seriesSort';
import {
  MAX_SKIN_LEVEL,
  awardPlacementXp,
  getMinRollForLevel,
  getSkinLevel,
} from '../utils/skinLevels';
import '../fortSort/FortSort.css';

const SELECT_SORT = {
  NUMBER: 'number',
  SEASON: 'season',
  SERIES: 'series',
};

function buildBonusById(starBetIds, boostBetIds, economy) {
  const starBonus = getStarBetBonusDice(economy);
  const boostBonus = getBoostBetBonusDice(economy);
  const bonus = {};
  for (const id of starBetIds) bonus[id] = starBonus;
  for (const id of boostBetIds) bonus[id] = boostBonus;
  return bonus;
}

/** Super bets = top seeds, then bet skins, then everyone else. */
function seedBettingEntrants(allIds, starBetIds, boostBetIds) {
  const starSet = new Set(starBetIds);
  const boostSet = new Set(boostBetIds);
  const rest = allIds.filter((id) => !starSet.has(id) && !boostSet.has(id));
  return [...shuffle(starBetIds), ...shuffle(boostBetIds), ...shuffle(rest)];
}

function countLosses(bracket, outcomes, skinId) {
  let losses = 0;
  for (const match of bracket.matches) {
    const outcome = outcomes.get(match.id);
    if (!outcome || outcome.winnerSlot == null || outcome.skipped) continue;
    if (outcome.auto && outcome.participants.includes(BYE)) continue;
    if (outcome.loser === skinId) losses += 1;
  }
  return losses;
}

function BettingStatusPanel({ tournament, bracketState, standings, outfitsById }) {
  const [detailId, setDetailId] = useState(null);
  const betIds = useMemo(
    () => [...(tournament.starBetIds ?? []), ...(tournament.boostBetIds ?? [])],
    [tournament.starBetIds, tournament.boostBetIds],
  );
  const starSet = useMemo(() => new Set(tournament.starBetIds ?? []), [tournament.starBetIds]);

  const rows = useMemo(() => {
    return betIds.map((id) => {
      const outfit = outfitsById.get(id);
      const losses = countLosses(tournament.bracket, bracketState.outcomes, id);
      const place = standings?.placeById?.get(id) ?? null;
      const isChampion = bracketState.champion === id;
      const isRunnerUp = bracketState.runnerUp === id;
      const eliminated = losses >= 2 || isRunnerUp || (bracketState.done && !isChampion);
      let statusLabel = 'In winners';
      let lane = 'winners';
      if (isChampion) {
        statusLabel = 'Champion · 1st';
        lane = 'champion';
      } else if (eliminated) {
        statusLabel =
          bracketState.done && place != null
            ? `Eliminated · ${formatPlace(place)}`
            : 'Eliminated';
        lane = 'eliminated';
      } else if (losses >= 1) {
        statusLabel = 'In losers';
        lane = 'losers';
      }
      const hasExtraLife = !!tournament.extraLifeById?.[id];
      return {
        id,
        outfit,
        statusLabel,
        lane,
        isStar: starSet.has(id),
        hasExtraLife,
      };
    });
  }, [
    betIds,
    bracketState,
    outfitsById,
    standings,
    starSet,
    tournament.bracket,
    tournament.extraLifeById,
  ]);

  const detail = detailId
    ? (() => {
        const outfit = outfitsById.get(detailId);
        const run = buildPlayerRun(tournament.bracket, bracketState.outcomes, detailId);
        const rolls = (tournament.rolls ?? []).filter((roll) => roll.participants?.includes(detailId));
        return { outfit, run, rolls };
      })()
    : null;

  if (!betIds.length) return null;

  return (
    <section className="bet-status-panel">
      <h2 className="bet-status-title">Bet skins status</h2>
      <div className="bet-status-grid">
        {rows.map((row) => (
          <button
            key={row.id}
            type="button"
            className={`bet-status-card is-${row.lane} ${row.isStar ? 'is-star' : ''}`}
            onClick={() => setDetailId(row.id)}
          >
            <SkinIcon outfit={row.outfit} />
            <div className="bet-status-text">
              <strong>
                {row.outfit?.name ?? row.id}
                {row.hasExtraLife ? ' 💖' : ''}
              </strong>
              <span>{row.statusLabel}</span>
              <span className="bet-status-tier">
                {row.isStar ? 'Super bet' : 'Bet'}
                {row.hasExtraLife ? ' · extra life' : ''}
              </span>
            </div>
          </button>
        ))}
      </div>

      {detail ? (
        <div className="bet-status-detail" role="dialog" aria-label="Bet skin overview">
          <div className="bet-status-detail-header">
            <h3>{detail.outfit?.name ?? 'Skin'} overview</h3>
            <button type="button" className="ghost-button" onClick={() => setDetailId(null)}>
              Close
            </button>
          </div>
          {detail.run.length === 0 ? (
            <p className="hint">No matches played yet.</p>
          ) : (
            <ul className="bet-status-run">
              {detail.run.map((entry) => (
                <li key={entry.matchId}>
                  <strong>{entry.label}</strong> — {entry.result === 'win' ? 'Won' : 'Lost'} vs{' '}
                  {outfitsById.get(entry.opponentId)?.name ?? '—'}
                </li>
              ))}
            </ul>
          )}
          {detail.rolls.length ? (
            <div className="bet-status-rolls">
              <h4>Dice rolls</h4>
              {detail.rolls.map((roll) => (
                <RollBreakdown key={roll.matchId} roll={roll} outfitsById={outfitsById} />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

const PREVIEW_PLACE_LIMIT = 49;

function SkinIcon({ outfit, className = '' }) {
  if (!outfit) return <div className={`icon-placeholder ${className}`}>?</div>;
  const src = getOutfitIconSrc(outfit);
  return (
    <img
      className={className}
      src={src}
      alt=""
      loading="lazy"
      onError={(event) => {
        const fallback = getOutfitIconFallbackSrc(outfit);
        if (fallback && event.currentTarget.src !== fallback) {
          event.currentTarget.src = fallback;
          return;
        }
        event.currentTarget.replaceWith(
          Object.assign(document.createElement('div'), {
            className: 'icon-placeholder',
            textContent: outfit.name.trim().charAt(0).toUpperCase(),
          }),
        );
      }}
    />
  );
}

function DiceBadge({ outfit, bonus = 0 }) {
  if (!outfit) return null;
  const dice = getDiceCount(outfit) + (Number(bonus) || 0);
  return (
    <p className="skin-dice" title={`${dice} × d100 — keep the highest`}>
      {'★'.repeat(Math.min(dice, 12))}
      <span>
        {dice}d100{bonus ? ` (+${bonus})` : ''}
      </span>
    </p>
  );
}

function SkinCard({ outfit, onPick, placeLabel, showDice = false, bonusDice = 0 }) {
  if (!outfit) return null;
  const className = `skin-card ${placeLabel ? 'podium-card' : ''} ${onPick ? '' : 'is-static'}`;
  const body = (
    <>
      {placeLabel ? <p className="podium-place">{placeLabel}</p> : null}
      <SkinIcon outfit={outfit} />
      <p className="skin-name">{outfit.name}</p>
      {showDice ? <DiceBadge outfit={outfit} bonus={bonusDice} /> : null}
      <p className="skin-meta">
        {outfit.chapter && outfit.season ? `Chapter ${outfit.chapter} · Season ${outfit.season}` : ''}
      </p>
    </>
  );
  if (!onPick) return <div className={className}>{body}</div>;
  return (
    <button type="button" className={className} onClick={onPick}>
      {body}
    </button>
  );
}

function RollBreakdown({ roll, outfitsById }) {
  if (!roll) return null;
  const winner = outfitsById.get(roll.participants[roll.winnerSlot]);
  const saved = roll.extraLifeSavedId ? outfitsById.get(roll.extraLifeSavedId) : null;
  return (
    <div className="sim-roll-panel">
      <p className="sim-roll-title">
        {roll.label}
        {roll.attempts > 1 ? ` · ${roll.attempts} rolls (ties)` : ''}
        {saved ? ` · 💖 ${saved.name} extra life` : ''}
      </p>
      <div className="sim-roll-sides">
        {roll.sides.map((side, index) => {
          const outfit = outfitsById.get(roll.participants[index]);
          const won = roll.winnerSlot === index;
          return (
            <div key={roll.participants[index]} className={`sim-roll-side ${won ? 'is-winner' : ''}`}>
              <strong>{outfit?.name ?? '—'}</strong>
              <span className="sim-roll-dice">
                {side.rolls.map((value, rollIndex) => (
                  <span
                    key={`${roll.participants[index]}-${rollIndex}`}
                    className={`sim-die ${value === side.best ? 'is-best' : ''}`}
                  >
                    {value}
                  </span>
                ))}
              </span>
              <span className="sim-roll-best">Best {side.best}</span>
            </div>
          );
        })}
      </div>
      <p className="sim-roll-winner">{winner?.name ?? '—'} advances</p>
    </div>
  );
}

function SelectScreen({
  discovered,
  catalogue,
  discoveredIds,
  selectedIds,
  setSelectedIds,
  mode,
  setMode,
  starBetIds,
  setStarBetIds,
  boostBetIds,
  setBoostBetIds,
  lockedBetIds,
  economy,
  skinLevels,
  onStart,
  onOpenArchive,
  onOpenShop,
  onBack,
}) {
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const starSet = useMemo(() => new Set(starBetIds), [starBetIds]);
  const boostSet = useMemo(() => new Set(boostBetIds), [boostBetIds]);
  const isBetting = mode === 'betting';
  const betCount = starBetIds.length + boostBetIds.length;
  const [betTier, setBetTier] = useState('star'); // star | boost
  const [selectSort, setSelectSort] = useState(SELECT_SORT.NUMBER);
  const [hideUnowned, setHideUnowned] = useState(true);
  const starBonus = getStarBetBonusDice(economy);
  const boostBonus = getBoostBetBonusDice(economy);
  const maxStarBets = getMaxStarBets(economy);
  const maxBoostBets = getMaxBoostBets(economy);
  const canRandomSelect = hasRandomSelectUnlock(economy);
  const betRunsRemaining = getDailyBetRunsRemaining(economy);
  const betRunsLimit = getDailyBetRunLimit(economy);

  const catalogueSorted = useMemo(() => sortOutfitsByNumber(catalogue), [catalogue]);
  const visibleOutfits = useMemo(() => {
    if (hideUnowned) return discovered;
    return catalogueSorted;
  }, [hideUnowned, discovered, catalogueSorted]);

  const allSelected =
    discovered.length > 0 && selectedIds.length === discovered.length && hideUnowned
      ? true
      : discovered.length > 0 &&
        discovered.every((outfit) => selectedIds.includes(outfit.id)) &&
        selectedIds.length === discovered.length;

  const seasonSections = useMemo(() => groupOutfitsBySeason(visibleOutfits), [visibleOutfits]);
  const seriesSections = useMemo(() => groupOutfitsBySeries(visibleOutfits), [visibleOutfits]);

  const toggle = (id) => {
    if (isBetting) return;
    if (!discoveredIds.has(id)) return;
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const toggleBet = (id) => {
    if (!isBetting || lockedBetIds.has(id) || !discoveredIds.has(id)) return;
    if (starSet.has(id) || boostSet.has(id)) {
      setStarBetIds((current) => current.filter((item) => item !== id));
      setBoostBetIds((current) => current.filter((item) => item !== id));
      return;
    }
    if (betTier === 'star') {
      if (starBetIds.length >= maxStarBets) return;
      setBoostBetIds((current) => current.filter((item) => item !== id));
      setStarBetIds((current) => [...current, id]);
      return;
    }
    if (boostBetIds.length >= maxBoostBets) return;
    setStarBetIds((current) => current.filter((item) => item !== id));
    setBoostBetIds((current) => [...current, id]);
  };

  const selectRandomBets = () => {
    if (!isBetting || !canRandomSelect) return;
    const pool = discovered
      .map((outfit) => outfit.id)
      .filter((id) => !lockedBetIds.has(id));
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const stars = pool.slice(0, Math.min(maxStarBets, pool.length));
    const boosts = pool.slice(stars.length, stars.length + maxBoostBets);
    setStarBetIds(stars);
    setBoostBetIds(boosts);
  };

  const startLabel = (() => {
    if (mode === 'rank') return `Start ranking ${selectedIds.length} skins`;
    if (mode === 'simulate') return `Simulate bracket with ${selectedIds.length} skins`;
    if (mode === 'betting') {
      return `Start betting sim (${discovered.length} skins · ${starBetIds.length} super · ${boostBetIds.length} bets)`;
    }
    return `Start bracket with ${selectedIds.length} skins`;
  })();

  const canStart =
    mode === 'betting'
      ? discovered.length >= 2 && betCount > 0 && betRunsRemaining > 0
      : selectedIds.length >= 2;

  const renderPick = (outfit) => {
    const owned = discoveredIds.has(outfit.id);
    const selected = selectedSet.has(outfit.id);
    const locked = lockedBetIds.has(outfit.id);
    const isStar = starSet.has(outfit.id);
    const isBoost = boostSet.has(outfit.id);
    const bonus = isStar ? starBonus : isBoost ? boostBonus : 0;
    const level = owned ? getSkinLevel(skinLevels, outfit.id) : 0;
    const minRoll = getMinRollForLevel(level);
    return (
      <button
        key={outfit.id}
        type="button"
        className={`catalogue-card fort-sort-pick ${owned ? 'revealed' : 'unowned'} ${
          level >= MAX_SKIN_LEVEL ? 'level-max' : ''
        } ${
          isBetting
            ? `${isStar ? 'is-star-bet' : ''} ${isBoost ? 'is-boost-bet' : ''} ${locked ? 'is-locked' : ''}`
            : selected
              ? 'is-selected'
              : ''
        }`}
        onClick={() => (isBetting ? toggleBet(outfit.id) : toggle(outfit.id))}
        disabled={!owned || (isBetting && locked)}
      >
        <span className="catalogue-number">{outfit.number}.</span>
        <div className="catalogue-image-wrap">
          <SkinIcon outfit={outfit} className="catalogue-image" />
        </div>
        <p className="catalogue-name">{owned ? outfit.name : '???'}</p>
        {owned ? <p className="skin-level-badge">Lv {level}{minRoll > 1 ? ` · min ${minRoll}` : ''}</p> : null}
        {owned && (mode === 'simulate' || mode === 'betting') ? (
          <DiceBadge outfit={outfit} bonus={bonus} />
        ) : null}
        <span className="fort-sort-check" aria-hidden="true">
          {locked ? '🔒' : isStar ? 'SUPER' : isBoost ? 'BET' : selected && !isBetting ? '✓' : ''}
        </span>
      </button>
    );
  };

  const renderPickGrid = (outfits) => (
    <div className="catalogue-grid fort-sort-select-grid">{outfits.map(renderPick)}</div>
  );

  const renderSections = (sections) => (
    <div className="fort-sort-select-sections">
      {sections.map((section) => (
        <section key={section.key} className="fort-sort-select-section">
          <h2 className="fort-sort-section-heading">
            {section.label} ({section.outfits.length})
          </h2>
          {renderPickGrid(section.outfits)}
        </section>
      ))}
    </div>
  );

  return (
    <div className="fort-sort-select">
      <header className="top-bar">
        <h1>FortSort</h1>
        <nav className="mode-tabs" aria-label="Mode">
          <button
            type="button"
            className={`mode-tab ${mode === 'rank' ? 'is-active' : ''}`}
            onClick={() => setMode('rank')}
          >
            Ranking
          </button>
          <button
            type="button"
            className={`mode-tab ${mode === 'bracket' ? 'is-active' : ''}`}
            onClick={() => setMode('bracket')}
          >
            Bracket
          </button>
          <button
            type="button"
            className={`mode-tab ${mode === 'simulate' ? 'is-active' : ''}`}
            onClick={() => setMode('simulate')}
          >
            Simulate
          </button>
          <button
            type="button"
            className={`mode-tab ${mode === 'betting' ? 'is-active' : ''}`}
            onClick={() => setMode('betting')}
          >
            Betting
          </button>
        </nav>
        <button type="button" className="ghost-button" onClick={onOpenShop}>
          Shop
        </button>
        <button type="button" className="ghost-button" onClick={onOpenArchive}>
          Saved
        </button>
        <button type="button" className="ghost-button" onClick={onBack}>
          Back
        </button>
      </header>

      <p className="hint">
        {mode === 'rank'
          ? 'Pick discovered skins, then rank them favorite to least favorite.'
          : mode === 'simulate'
            ? 'Pick discovered skins for a dice-simulated double-elim bracket. Each side rolls Nd100 and keeps the highest — series and star skins set N.'
            : mode === 'betting'
              ? `All discovered skins enter. Pick up to ${maxStarBets} super bet skins (+${starBonus} dice, +${SUPER_BET_ROUND_BONUS} weebuck on every round payout, 2× XP) and up to ${maxBoostBets} bet skins (+${boostBonus} dice). Placement XP: 1st 200 · 2nd–4th 100 · 5th–7th 50 · else 25. Levels raise roll floors (Lv1: no 1–5, Lv3: no 1–10, Lv5: no 1–20). ${hasBetSeedingUnlock(economy) ? 'Your bets are seeded (super bets first, then bets). ' : ''}Base payout is ${BET_WIN_POINTS} weebucks per bet win. Winning the tournament pays ${TOURNAMENT_WIN_POINTS} weebucks. Bets lock until Monday CST (${nextMondayLabel()}).`
              : 'Pick discovered skins, then run a double-elimination bracket.'}{' '}
        Only skins you have discovered in FortHang can enter.
      </p>
      {mode === 'simulate' || mode === 'betting' ? (
        <p className="hint sim-rules">
          Dice: Other 1 · default 2 · DC / Icon / Other Collab / Marvel / Gaming Legends 3 · TV / WWE / Anime /
          Cartoon Legends 4 · star skins (Peter Griffin, Spider-Man, Peely, Son Goku, Naruto Uzumaki, Monkey D.
          Luffy, Homer Simpson, Hatsune Miku, John Cena, Batman (Pen &amp; Ink), Sonic the Hedgehog) 5.
        </p>
      ) : null}
      {isBetting ? (
        <>
          <p className="hint">
            Weebucks: {economy.points} · Betting runs today {betRunsRemaining}/{betRunsLimit} · Super
            bets {starBetIds.length}/{maxStarBets} · Bets {boostBetIds.length}/{maxBoostBets}. Locked
            skins were already bet this week.
          </p>
          {betRunsRemaining <= 0 ? (
            <p className="hint">
              No betting runs left today. Raise the daily cap in the Shop, or wait for the 6:00 AM CST
              reset.
            </p>
          ) : null}
          <div className="import-actions" style={{ marginBottom: 12 }}>
            <button
              type="button"
              className={`mode-tab ${betTier === 'star' ? 'is-active' : ''}`}
              onClick={() => setBetTier('star')}
            >
              Pick super bet +{starBonus} dice
            </button>
            <button
              type="button"
              className={`mode-tab ${betTier === 'boost' ? 'is-active' : ''}`}
              onClick={() => setBetTier('boost')}
            >
              Pick bet +{boostBonus} dice
            </button>
            {canRandomSelect ? (
              <button type="button" className="primary-button" onClick={selectRandomBets}>
                Select random
              </button>
            ) : (
              <button
                type="button"
                className="ghost-button"
                disabled
                title="Unlock in the Shop for 1000 weebucks"
              >
                Select random (locked · 1000)
              </button>
            )}
          </div>
        </>
      ) : null}

      <div className="import-actions" style={{ marginBottom: 12 }}>
        <button type="button" className="primary-button" disabled={!canStart} onClick={onStart}>
          {startLabel}
        </button>
      </div>

      {!isBetting ? (
        <div className="import-actions" style={{ marginBottom: 16 }}>
          <button
            type="button"
            className="primary-button"
            onClick={() => setSelectedIds(discovered.map((outfit) => outfit.id))}
            disabled={discovered.length === 0 || allSelected}
          >
            Select all ({discovered.length})
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() => setSelectedIds([])}
            disabled={selectedIds.length === 0}
          >
            Clear selection
          </button>
          <span className="hint">{selectedIds.length} selected</span>
        </div>
      ) : (
        <div className="import-actions" style={{ marginBottom: 16 }}>
          <button
            type="button"
            className="ghost-button"
            onClick={() => {
              setStarBetIds([]);
              setBoostBetIds([]);
            }}
            disabled={betCount === 0}
          >
            Clear bets
          </button>
          <span className="hint">{discovered.length} skins in bracket</span>
        </div>
      )}

      {catalogue.length > 0 ? (
        <div className="import-actions fort-sort-sort-tabs" role="group" aria-label="Sort skins">
          <button
            type="button"
            className={`mode-tab ${selectSort === SELECT_SORT.NUMBER ? 'is-active' : ''}`}
            onClick={() => setSelectSort(SELECT_SORT.NUMBER)}
          >
            Sort by Number
          </button>
          <button
            type="button"
            className={`mode-tab ${selectSort === SELECT_SORT.SEASON ? 'is-active' : ''}`}
            onClick={() => setSelectSort(SELECT_SORT.SEASON)}
          >
            Sort by Season
          </button>
          <button
            type="button"
            className={`mode-tab ${selectSort === SELECT_SORT.SERIES ? 'is-active' : ''}`}
            onClick={() => setSelectSort(SELECT_SORT.SERIES)}
          >
            Sort by Series
          </button>
          <button
            type="button"
            className={`mode-tab ${hideUnowned ? 'is-active' : ''}`}
            onClick={() => setHideUnowned((current) => !current)}
          >
            {hideUnowned ? 'Hide unowned: On' : 'Hide unowned: Off'}
          </button>
        </div>
      ) : null}

      {discovered.length === 0 && hideUnowned ? (
        <p className="hint">Discover skins in hangman first, then come back to FortSort.</p>
      ) : visibleOutfits.length === 0 ? (
        <p className="hint">No skins to show.</p>
      ) : selectSort === SELECT_SORT.SEASON ? (
        renderSections(seasonSections)
      ) : selectSort === SELECT_SORT.SERIES ? (
        renderSections(seriesSections)
      ) : (
        renderPickGrid(visibleOutfits)
      )}
    </div>
  );
}

export default function FortSort({
  outfits,
  guessedSkinIds,
  economy,
  onEconomyChange,
  skinLevels = {},
  onSkinLevelsChange,
  onBack,
  onOpenShop,
}) {
  const outfitsById = useMemo(() => new Map(outfits.map((outfit) => [outfit.id, outfit])), [outfits]);
  const discovered = useMemo(
    () => sortOutfitsByNumber(outfits.filter((outfit) => isSkinGuessed(guessedSkinIds, outfit))),
    [outfits, guessedSkinIds],
  );
  const discoveredIds = useMemo(() => new Set(discovered.map((outfit) => outfit.id)), [discovered]);
  const lockedBetIds = useMemo(() => getLockedBetIds(economy), [economy]);

  const [mode, setMode] = useState(loadSortMode);
  const [selectedIds, setSelectedIds] = useState(() =>
    loadSelectedIds().filter((id) => discoveredIds.has(id) || discovered.some((outfit) => outfit.id === id)),
  );
  const [starBetIds, setStarBetIds] = useState([]);
  const [boostBetIds, setBoostBetIds] = useState([]);
  const [screen, setScreen] = useState('select'); // select | play | archive
  const [rankProgress, setRankProgress] = useState(null);
  const [tournament, setTournament] = useState(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [followPage, setFollowPage] = useState(true);
  const [archiveReadOnly, setArchiveReadOnly] = useState(false);
  const [showFullResults, setShowFullResults] = useState(false);
  const [playerRunId, setPlayerRunId] = useState(null);
  const [status, setStatus] = useState('');

  const maxStarBets = getMaxStarBets(economy);
  const maxBoostBets = getMaxBoostBets(economy);

  // Keep selection limited to currently discovered skins and owned slot caps.
  useEffect(() => {
    setSelectedIds((current) => {
      const next = current.filter((id) => discoveredIds.has(id));
      if (next.length !== current.length) saveSelectedIds(next);
      return next;
    });
    setStarBetIds((current) =>
      current.filter((id) => discoveredIds.has(id) && !lockedBetIds.has(id)).slice(0, maxStarBets),
    );
    setBoostBetIds((current) =>
      current.filter((id) => discoveredIds.has(id) && !lockedBetIds.has(id)).slice(0, maxBoostBets),
    );
  }, [discoveredIds, lockedBetIds, maxStarBets, maxBoostBets]);

  useEffect(() => {
    saveSortMode(mode);
    if (mode === 'betting') {
      setSelectedIds(discovered.map((outfit) => outfit.id));
    }
  }, [mode, discovered]);

  useEffect(() => {
    if (mode !== 'betting') saveSelectedIds(selectedIds);
  }, [selectedIds, mode]);

  // Resume active runs if their skins are still discovered.
  useEffect(() => {
    const savedRank = loadRankProgress();
    if (savedRank?.order.every((id) => discoveredIds.has(id))) {
      setRankProgress(savedRank);
      if (mode === 'rank') setScreen('play');
    }
    const savedBracket = loadBracketProgress();
    if (savedBracket?.entrants.every((id) => discoveredIds.has(id)) && mode === 'bracket') {
      setTournament({
        ...savedBracket,
        simulated: false,
        bracket: createBracket(savedBracket.entrants, savedBracket.version ?? 4),
      });
      setScreen('play');
    }
    const savedSim = loadSimBracketProgress();
    if (
      savedSim?.entrants.every((id) => discoveredIds.has(id)) &&
      (mode === 'simulate' || mode === 'betting')
    ) {
      setTournament({
        ...savedSim,
        simulated: true,
        bracket: createBracket(savedSim.entrants, savedSim.version ?? 4),
      });
      if (savedSim.betting) setMode('betting');
      setScreen('play');
    }
    // Only on mount / discovery set identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistTournament = (next) => {
    if (next.simulated) saveSimBracketProgress(next);
    else saveBracketProgress(next);
  };

  const rankState = useMemo(
    () => (rankProgress ? replay(rankProgress.order, rankProgress.decisions) : null),
    [rankProgress],
  );

  const bracketState = useMemo(() => {
    if (!tournament) return null;
    return resolveBracket(tournament.bracket, Object.fromEntries(tournament.history));
  }, [tournament]);

  const standings = useMemo(() => {
    if (!tournament || !bracketState) return null;
    return computeStandings(tournament.bracket, bracketState.outcomes, bracketState);
  }, [tournament, bracketState]);

  const lastRoll = tournament?.rolls?.length ? tournament.rolls[tournament.rolls.length - 1] : null;
  const isSimMode = mode === 'simulate' || mode === 'betting' || !!tournament?.simulated;
  const bonusById = useMemo(() => {
    if (!tournament?.betting) return null;
    return buildBonusById(tournament.starBetIds ?? [], tournament.boostBetIds ?? [], economy);
  }, [tournament, economy]);
  const minRollById = useMemo(() => {
    if (!tournament?.betting) return null;
    const map = {};
    for (const id of [...(tournament.starBetIds ?? []), ...(tournament.boostBetIds ?? [])]) {
      map[id] = getMinRollForLevel(getSkinLevel(skinLevels, id));
    }
    return map;
  }, [tournament, skinLevels]);
  const betIdSet = useMemo(() => {
    if (!tournament?.betting) return new Set();
    return new Set([...(tournament.starBetIds ?? []), ...(tournament.boostBetIds ?? [])]);
  }, [tournament]);
  const superBetIdSet = useMemo(() => {
    if (!tournament?.betting) return new Set();
    return new Set(tournament.starBetIds ?? []);
  }, [tournament]);
  const canSimulateAll = hasSimulateAllUnlock(economy);
  const round1Pending =
    tournament?.simulated && tournament.bracket
      ? hasRound1PoolsPending(tournament.bracket, tournament.history)
      : false;

  const start = () => {
    setArchiveReadOnly(false);
    setShowFullResults(false);
    setPlayerRunId(null);
    setStatus('');
    if (mode === 'rank') {
      if (selectedIds.length < 2) return;
      const progress = { order: shuffle(selectedIds), decisions: [] };
      setRankProgress(progress);
      saveRankProgress(progress);
      setTournament(null);
    } else if (mode === 'betting') {
      const entrants = discovered.map((outfit) => outfit.id);
      if (entrants.length < 2) return;
      if (!canStartBettingRun(economy)) {
        setStatus('No betting runs left today.');
        return;
      }
      const stars = starBetIds.filter((id) => discoveredIds.has(id) && !lockedBetIds.has(id));
      const boosts = boostBetIds.filter(
        (id) => discoveredIds.has(id) && !lockedBetIds.has(id) && !stars.includes(id),
      );
      if (stars.length + boosts.length === 0) return;
      const spent = spendBettingRun(economy);
      if (!spent.ok) {
        onEconomyChange(spent.economy);
        setStatus(spent.reason || 'No betting runs left today.');
        return;
      }
      const lockedEconomy = lockBetSkins([...stars, ...boosts], spent.economy);
      onEconomyChange(lockedEconomy);
      const orderedEntrants = hasBetSeedingUnlock(lockedEconomy)
        ? seedBettingEntrants(entrants, stars, boosts)
        : shuffle(entrants);
      const next = {
        entrants: orderedEntrants,
        history: [],
        rolls: [],
        version: 4,
        archiveId: null,
        simulated: true,
        betting: true,
        starBetIds: stars,
        boostBetIds: boosts,
        pointsEarned: 0,
        championBonusPaid: false,
        xpAwarded: false,
        extraLifeById: hasSuperBetExtraLifeUnlock(lockedEconomy)
          ? Object.fromEntries(stars.map((id) => [id, true]))
          : {},
        bracket: null,
      };
      next.bracket = createBracket(next.entrants, 4);
      setTournament(next);
      persistTournament(next);
      setRankProgress(null);
      setPageIndex(0);
      setFollowPage(true);
    } else {
      if (selectedIds.length < 2) return;
      const simulated = mode === 'simulate';
      const next = {
        entrants: shuffle(selectedIds),
        history: [],
        rolls: [],
        version: 4,
        archiveId: null,
        simulated,
        betting: false,
        pointsEarned: 0,
        championBonusPaid: false,
        xpAwarded: false,
        extraLifeById: {},
        bracket: null,
      };
      next.bracket = createBracket(next.entrants, 4);
      setTournament(next);
      persistTournament(next);
      setRankProgress(null);
      setPageIndex(0);
      setFollowPage(true);
    }
    setScreen('play');
  };

  const chooseRank = (challengerWins) => {
    if (!rankProgress || rankState?.done) return;
    const next = { ...rankProgress, decisions: [...rankProgress.decisions, challengerWins] };
    setRankProgress(next);
    saveRankProgress(next);
  };

  const undoRank = () => {
    if (!rankProgress?.decisions.length) return;
    const next = { ...rankProgress, decisions: rankProgress.decisions.slice(0, -1) };
    setRankProgress(next);
    saveRankProgress(next);
  };

  const chooseBracket = (firstWins) => {
    if (!tournament || archiveReadOnly || tournament.simulated || !bracketState?.current) return;
    const next = {
      ...tournament,
      history: [...tournament.history, [bracketState.current.id, firstWins ? 0 : 1]],
    };
    setTournament(next);
    persistTournament(next);
    setFollowPage(true);
  };

  const undoBracket = () => {
    if (!tournament?.history.length || archiveReadOnly) return;
    const next = {
      ...tournament,
      history: tournament.history.slice(0, -1),
      rolls: tournament.rolls?.length ? tournament.rolls.slice(0, -1) : [],
    };
    setTournament(next);
    persistTournament(next);
    setFollowPage(true);
  };

  const applySimResult = (result, nextExtraLifeById = null) => {
    if (!tournament || !result) return;
    let pointsGain = 0;
    let championBonusPaid = !!tournament.championBonusPaid;
    let xpAwarded = !!tournament.xpAwarded;
    const extraLifeById =
      nextExtraLifeById != null
        ? { ...nextExtraLifeById }
        : { ...(tournament.extraLifeById ?? {}) };
    if (tournament.betting) {
      for (const win of result.wins ?? []) {
        const winnerId = typeof win === 'string' ? win : win?.winnerId;
        const matchId = typeof win === 'string' ? null : win?.matchId;
        if (!winnerId || !betIdSet.has(winnerId)) continue;
        const phase = matchId ? matchPhase(tournament.bracket, matchId) : '';
        pointsGain += getBetWinPointsForPhase(phase, economy, {
          superBet: superBetIdSet.has(winnerId),
        });
      }
      const wasDone = !!resolveBracket(tournament.bracket, Object.fromEntries(tournament.history)).done;
      const nextState = resolveBracket(tournament.bracket, Object.fromEntries(result.history));
      if (
        !wasDone &&
        nextState.done &&
        nextState.champion &&
        betIdSet.has(nextState.champion) &&
        !championBonusPaid
      ) {
        pointsGain += getTournamentWinPoints({
          superBet: superBetIdSet.has(nextState.champion),
        });
        championBonusPaid = true;
      }
      if (!wasDone && nextState.done && !xpAwarded) {
        const finalStandings = computeStandings(
          tournament.bracket,
          nextState.outcomes,
          nextState,
        );
        const awards = [...betIdSet].map((id) => ({
          id,
          place: finalStandings.placeById.get(id) ?? 999,
          superBet: superBetIdSet.has(id),
        }));
        const xpResult = awardPlacementXp(skinLevels, awards);
        onSkinLevelsChange?.(xpResult.levels);
        const totalXp = xpResult.gained.reduce((sum, entry) => sum + entry.amount, 0);
        if (totalXp > 0) {
          setStatus(`Betting XP awarded: +${totalXp} across your selected skins.`);
        }
        xpAwarded = true;
      }
    }
    if (pointsGain > 0) onEconomyChange(addPoints(pointsGain, economy));
    const next = {
      ...tournament,
      history: result.history,
      rolls: [...(tournament.rolls ?? []), ...result.rolls],
      pointsEarned: (tournament.pointsEarned ?? 0) + pointsGain,
      championBonusPaid,
      xpAwarded,
      extraLifeById,
    };
    setTournament(next);
    persistTournament(next);
    setFollowPage(true);
  };

  const withExtraLives = () => ({ ...(tournament.extraLifeById ?? {}) });

  const simNextMatch = () => {
    if (!tournament || archiveReadOnly || !tournament.simulated) return;
    const lives = withExtraLives();
    const step = simulateNextMatch(
      tournament.bracket,
      tournament.history,
      outfitsById,
      bonusById,
      minRollById,
      lives,
    );
    if (!step) return;
    applySimResult(
      {
        history: [...tournament.history, [step.matchId, step.winnerSlot]],
        rolls: [step.roll],
        wins: [{ winnerId: step.winnerId, matchId: step.matchId }],
      },
      lives,
    );
  };

  const simNextRound = () => {
    if (!tournament || archiveReadOnly || !tournament.simulated) return;
    const lives = withExtraLives();
    applySimResult(
      simulateCurrentRound(
        tournament.bracket,
        tournament.history,
        outfitsById,
        bonusById,
        minRollById,
        lives,
      ),
      lives,
    );
  };

  const simRound1Pools = () => {
    if (!tournament || archiveReadOnly || !tournament.simulated) return;
    const lives = withExtraLives();
    applySimResult(
      simulateRound1Pools(
        tournament.bracket,
        tournament.history,
        outfitsById,
        bonusById,
        minRollById,
        lives,
      ),
      lives,
    );
  };

  const simAll = () => {
    if (!tournament || archiveReadOnly || !tournament.simulated || !canSimulateAll) return;
    const lives = withExtraLives();
    applySimResult(
      simulateEntireBracket(
        tournament.bracket,
        tournament.history,
        outfitsById,
        bonusById,
        minRollById,
        lives,
      ),
      lives,
    );
  };

  const saveFinishedTournament = (quiet = false) => {
    if (!tournament || !bracketState?.done) return;
    try {
      const id = tournament.archiveId ?? newArchiveId();
      const entry = {
        id,
        savedAt: Date.now(),
        entrants: tournament.entrants,
        history: tournament.history,
        rolls: tournament.rolls ?? [],
        version: tournament.version ?? 4,
        simulated: !!tournament.simulated,
        betting: !!tournament.betting,
        starBetIds: tournament.starBetIds ?? [],
        boostBetIds: tournament.boostBetIds ?? [],
        pointsEarned: tournament.pointsEarned ?? 0,
        championId: bracketState.champion,
        runnerUpId: bracketState.runnerUp,
      };
      const entries = loadArchive().filter((item) => item.id !== id);
      entries.unshift(entry);
      saveArchive(entries);
      const next = { ...tournament, archiveId: id };
      setTournament(next);
      if (!archiveReadOnly) persistTournament(next);
      if (!quiet) setStatus('Saved on this device.');
    } catch (error) {
      if (!quiet) setStatus(`Could not save: ${error.message}`);
    }
  };

  useEffect(() => {
    if (
      screen === 'play' &&
      (mode === 'bracket' || mode === 'simulate' || mode === 'betting') &&
      bracketState?.done &&
      !archiveReadOnly &&
      tournament &&
      !tournament.archiveId
    ) {
      saveFinishedTournament(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bracketState?.done, screen, mode]);

  const startOver = () => {
    if (archiveReadOnly) {
      setArchiveReadOnly(false);
      const saved = isSimMode ? loadSimBracketProgress() : loadBracketProgress();
      if (saved?.entrants.every((id) => discoveredIds.has(id))) {
        setTournament({
          ...saved,
          simulated: !!(saved.simulated || mode === 'simulate' || mode === 'betting'),
          bracket: createBracket(saved.entrants, saved.version ?? 4),
        });
        setScreen('play');
      } else {
        setTournament(null);
        setScreen('select');
      }
      setStatus('');
      return;
    }
    const label =
      mode === 'rank' ? 'ranking' : mode === 'simulate' || mode === 'betting' ? 'simulation' : 'bracket';
    if (!confirm(`Start over? This clears your current ${label}. Saved tournaments are kept.`)) {
      return;
    }
    if ((mode === 'bracket' || mode === 'simulate' || mode === 'betting') && bracketState?.done) {
      saveFinishedTournament(true);
    }
    if (mode === 'rank') {
      clearRankProgress();
      setRankProgress(null);
    } else if (mode === 'simulate' || mode === 'betting') {
      clearSimBracketProgress();
      setTournament(null);
    } else {
      clearBracketProgress();
      setTournament(null);
    }
    setShowFullResults(false);
    setPlayerRunId(null);
    setStatus('');
    setScreen('select');
  };

  const openArchiveEntry = (entry) => {
    if (!entry.entrants.every((id) => outfitsById.has(id))) {
      setStatus('That saved tournament uses skins missing from the catalogue.');
      return;
    }
    setArchiveReadOnly(true);
    setTournament({
      entrants: entry.entrants,
      history: entry.history,
      rolls: entry.rolls ?? [],
      version: entry.version ?? 4,
      archiveId: entry.id,
      simulated: !!entry.simulated || !!entry.betting,
      betting: !!entry.betting,
      starBetIds: entry.starBetIds ?? [],
      boostBetIds: entry.boostBetIds ?? [],
      pointsEarned: entry.pointsEarned ?? 0,
      championBonusPaid: true,
      xpAwarded: true,
      bracket: createBracket(entry.entrants, entry.version ?? 4),
    });
    setMode(entry.betting ? 'betting' : entry.simulated ? 'simulate' : 'bracket');
    setScreen('play');
    setShowFullResults(false);
    setPlayerRunId(null);
    setStatus('');
  };

  // Bracket page follow
  useEffect(() => {
    if (!tournament || !bracketState || bracketState.done || !followPage) return;
    const currentPage = bracketState.current
      ? tournament.bracket.pageOf.get(bracketState.current.id)
      : pageIndex;
    if (currentPage != null && currentPage !== pageIndex) setPageIndex(currentPage);
  }, [tournament, bracketState, followPage, pageIndex]);

  if (screen === 'archive') {
    const entries = loadArchive();
    return (
      <div className="fort-sort">
        <header className="top-bar">
          <h1>Saved tournaments</h1>
          <button type="button" className="ghost-button" onClick={() => setScreen(tournament ? 'play' : 'select')}>
            Back
          </button>
        </header>
        {entries.length === 0 ? (
          <p className="hint">No saved tournaments yet.</p>
        ) : (
          <ul className="archive-list">
            {entries.map((entry) => (
              <li key={entry.id} className="archive-row">
                <div className="archive-row-meta">
                  <strong>
                    {outfitsById.get(entry.championId)?.name ?? 'Tournament'} · {entry.entrants.length} skins
                    {entry.betting ? ' · Betting' : entry.simulated ? ' · Simulated' : ''}
                    {entry.pointsEarned ? ` · +${entry.pointsEarned} weebucks` : ''}
                  </strong>
                  <span className="hint">{new Date(entry.savedAt).toLocaleString()}</span>
                </div>
                <div className="archive-row-actions">
                  <button type="button" className="primary-button" onClick={() => openArchiveEntry(entry)}>
                    Open
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => {
                      if (!confirm('Delete this saved tournament?')) return;
                      saveArchive(entries.filter((item) => item.id !== entry.id));
                      setStatus('Deleted.');
                      setScreen('archive');
                    }}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (screen === 'select') {
    return (
      <div className="fort-sort">
        <SelectScreen
          discovered={discovered}
          catalogue={outfits}
          discoveredIds={discoveredIds}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
          mode={mode}
          setMode={(next) => {
            setMode(next);
            setScreen('select');
          }}
          starBetIds={starBetIds}
          setStarBetIds={setStarBetIds}
          boostBetIds={boostBetIds}
          setBoostBetIds={setBoostBetIds}
          lockedBetIds={lockedBetIds}
          economy={economy}
          skinLevels={skinLevels}
          onStart={start}
          onOpenArchive={() => setScreen('archive')}
          onOpenShop={onOpenShop}
          onBack={onBack}
        />
      </div>
    );
  }

  // PLAY screens
  if (mode === 'rank' && rankProgress && rankState) {
    if (rankState.done) {
      const lines = rankState.sorted.map((id, index) => ({
        id,
        outfit: outfitsById.get(id),
        rank: index + 1,
      }));
      return (
        <div className="fort-sort">
          <header className="top-bar">
            <h1>Your ranking</h1>
            <button type="button" className="ghost-button" onClick={startOver}>
              Start over
            </button>
            <button type="button" className="ghost-button" onClick={onBack}>
              Back to FortHang
            </button>
          </header>
          <div className="results-actions">
            <button type="button" className="ghost-button" onClick={undoRank} disabled={!rankProgress.decisions.length}>
              Undo last pick
            </button>
          </div>
          <ol className="results-list">
            {lines.map((row) => (
              <li key={row.id}>
                <span className="rank">{row.rank}</span>
                <SkinIcon outfit={row.outfit} />
                <span>{row.outfit?.name ?? row.id}</span>
              </li>
            ))}
          </ol>
        </div>
      );
    }

    const challenger = outfitsById.get(rankState.challenger);
    const opponent = outfitsById.get(rankState.opponent);
    const challengerOnLeft = (rankState.index + rankState.lo + rankState.hi) % 2 === 0;
    const left = challengerOnLeft ? challenger : opponent;
    const right = challengerOnLeft ? opponent : challenger;
    const remaining = estimateRemaining(rankState, rankProgress.order.length);

    return (
      <div className="fort-sort">
        <header className="top-bar">
          <h1>FortSort</h1>
          <button type="button" className="ghost-button" onClick={startOver}>
            Start over
          </button>
          <button type="button" className="ghost-button" onClick={onBack}>
            Back
          </button>
        </header>
        <div className="progress">
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{
                width: `${(rankProgress.decisions.length / Math.max(1, rankProgress.decisions.length + remaining)) * 100}%`,
              }}
            />
          </div>
          <p>
            {rankProgress.decisions.length} picks · about {remaining} left · {rankState.index} of{' '}
            {rankProgress.order.length} placed
          </p>
        </div>
        <h2>Which skin do you like more?</h2>
        <div className="matchup">
          <SkinCard outfit={left} onPick={() => chooseRank(challengerOnLeft)} />
          <span className="versus">vs</span>
          <SkinCard outfit={right} onPick={() => chooseRank(!challengerOnLeft)} />
        </div>
        <div className="compare-actions">
          <button type="button" className="ghost-button" onClick={undoRank} disabled={!rankProgress.decisions.length}>
            Undo
          </button>
        </div>
      </div>
    );
  }

  // Bracket / simulate / betting play
  if ((mode === 'bracket' || mode === 'simulate' || mode === 'betting') && tournament && bracketState) {
    const { bracket } = tournament;
    const currentPage = bracketState.current
      ? bracket.pageOf.get(bracketState.current.id) ?? pageIndex
      : bracket.pages.length - 1;
    const activePage = Math.min(pageIndex, bracket.pages.length - 1);
    const page = bracket.pages[activePage];

    const renderMatch = (match) => {
      const outcome = bracketState.outcomes.get(match.id);
      const inbound0 = bracket.inbound.get(`${match.id}:0`);
      const inbound1 = bracket.inbound.get(`${match.id}:1`);
      const outbound = bracket.outbound.get(match.id) ?? [];
      return (
        <div
          key={match.id}
          className={`bracket-match ${bracketState.current?.id === match.id ? 'is-current' : ''} ${
            outcome?.auto || outcome?.skipped ? 'is-auto' : ''
          }`}
        >
          {[0, 1].map((slot) => {
            const participant = outcome?.participants[slot] ?? null;
            const inbound = slot === 0 ? inbound0 : inbound1;
            const outfit = participant && participant !== BYE ? outfitsById.get(participant) : null;
            const decided = outcome?.winnerSlot != null;
            return (
              <div
                key={slot}
                className={`bracket-row ${participant == null ? 'is-tbd' : ''} ${
                  participant === BYE ? 'is-bye' : ''
                } ${decided && outcome.winnerSlot === slot ? 'is-winner' : ''} ${
                  decided && outcome.winnerSlot !== slot ? 'is-loser' : ''
                } ${inbound ? 'has-inbound' : ''}`}
                onClick={() => {
                  if (
                    !tournament.simulated &&
                    bracketState.current?.id === match.id &&
                    !archiveReadOnly
                  ) {
                    chooseBracket(slot === 0);
                  }
                }}
              >
                {inbound ? (
                  <button
                    type="button"
                    className="feed-link feed-in"
                    onClick={(event) => {
                      event.stopPropagation();
                      setFollowPage(false);
                      setPageIndex(bracket.pageOf.get(inbound.fromMatchId) ?? activePage);
                    }}
                  >
                    ← {inbound.fromLabel}
                  </button>
                ) : null}
                {participant === BYE ? (
                  <span>BYE</span>
                ) : participant == null && !inbound ? (
                  <span>TBD</span>
                ) : outfit ? (
                  <>
                    <SkinIcon outfit={outfit} />
                    <span>
                      {outfit.name}
                      {tournament.simulated ? (
                        <span className="bracket-dice">
                          {' '}
                          · {getDiceCount(outfit, bonusById)}d100
                        </span>
                      ) : null}
                    </span>
                  </>
                ) : null}
              </div>
            );
          })}
          {outbound.length ? (
            <div className="feed-out">
              {outbound.map((feed) => (
                <button
                  key={`${feed.toMatchId}-${feed.toSlot}`}
                  type="button"
                  className="feed-link"
                  onClick={() => {
                    setFollowPage(false);
                    setPageIndex(feed.toPage);
                  }}
                >
                  → {feed.toLabel}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      );
    };

    const phases = [];
    for (const [index, pageItem] of bracket.pages.entries()) {
      const last = phases[phases.length - 1];
      if (last?.phase === pageItem.phase) last.pages.push({ index, page: pageItem });
      else phases.push({ phase: pageItem.phase, pages: [{ index, page: pageItem }] });
    }
    const currentPhase = page.phase;
    const activeGroup = phases.find((group) => group.phase === currentPhase);

    return (
      <div className="fort-sort">
        <header className="top-bar">
          <h1>FortSort</h1>
          {onOpenShop ? (
            <button type="button" className="ghost-button" onClick={onOpenShop}>
              Shop
            </button>
          ) : null}
          <button type="button" className="ghost-button" onClick={() => setScreen('archive')}>
            Saved
          </button>
          <button type="button" className="ghost-button" onClick={startOver}>
            {archiveReadOnly ? 'Close saved tournament' : 'Start over'}
          </button>
          <button type="button" className="ghost-button" onClick={onBack}>
            Back to FortHang
          </button>
        </header>

        {tournament.betting ? (
          <BettingStatusPanel
            tournament={tournament}
            bracketState={bracketState}
            standings={standings}
            outfitsById={outfitsById}
          />
        ) : null}

        {bracketState.done ? (
          <section className="champion-view-inline">
            <h2>{archiveReadOnly ? 'Saved tournament' : 'Tournament complete'}</h2>
            {archiveReadOnly ? (
              <p className="resume-note">Viewing a saved tournament. Your active bracket is unchanged.</p>
            ) : null}
            <div className="podium">
              <SkinCard
                outfit={outfitsById.get(bracketState.champion)}
                placeLabel="1st"
                showDice={tournament.simulated}
              />
              <SkinCard
                outfit={outfitsById.get(bracketState.runnerUp)}
                placeLabel="2nd"
                showDice={tournament.simulated}
              />
            </div>
            {tournament.betting ? (
              <p className="hint">
                Betting haul: +{tournament.pointsEarned ?? 0} weebucks this run · Bank {economy.points}{' '}
                weebucks
              </p>
            ) : null}
            {tournament.simulated && lastRoll ? (
              <RollBreakdown roll={lastRoll} outfitsById={outfitsById} />
            ) : null}
            {standings ? (
              <div className="placements-panel">
                {!showFullResults ? (
                  <>
                    <h3>Placements</h3>
                    <ol className="placements-list">
                      {standings.placements
                        .filter((entry) => entry.place <= PREVIEW_PLACE_LIMIT)
                        .map(({ place, ids }) => (
                          <li key={place} className="placement-row">
                            <span className="placement-rank">{formatPlace(place)}</span>
                            <div className="placement-names">
                              {ids.map((id) => (
                                <span key={id} className="placement-skin">
                                  <SkinIcon outfit={outfitsById.get(id)} />
                                  <span>{outfitsById.get(id)?.name ?? id}</span>
                                </span>
                              ))}
                            </div>
                          </li>
                        ))}
                    </ol>
                    <button type="button" className="primary-button" onClick={() => setShowFullResults(true)}>
                      Full results
                    </button>
                  </>
                ) : (
                  <div className="full-results-panel">
                    <div className="full-results-header">
                      <h3>Full results</h3>
                      <button type="button" className="ghost-button" onClick={() => setShowFullResults(false)}>
                        Back
                      </button>
                    </div>
                    <p className="hint">Tap a skin to see who they beat and lost to.</p>
                    <ol className="placements-list full-results-list">
                      {standings.placements.flatMap(({ place, ids }) =>
                        ids.map((id) => (
                          <button
                            key={id}
                            type="button"
                            className="full-result-row"
                            onClick={() => setPlayerRunId(id)}
                          >
                            <span className="placement-rank">{formatPlace(place)}</span>
                            <span className="placement-skin">
                              <SkinIcon outfit={outfitsById.get(id)} />
                              <span>{outfitsById.get(id)?.name ?? id}</span>
                            </span>
                          </button>
                        )),
                      )}
                    </ol>
                    {playerRunId ? (
                      <div className="player-run-panel">
                        <div className="full-results-header">
                          <h3>
                            {outfitsById.get(playerRunId)?.name ?? playerRunId} ·{' '}
                            {formatPlace(standings.placeById.get(playerRunId))}
                          </h3>
                          <button type="button" className="ghost-button" onClick={() => setPlayerRunId(null)}>
                            Close
                          </button>
                        </div>
                        <ol className="player-run-list">
                          {buildPlayerRun(bracket, bracketState.outcomes, playerRunId).map((step) => (
                            <li key={step.matchId} className={`player-run-item is-${step.result}`}>
                              <span className="run-result">{step.result === 'win' ? 'Beat' : 'Lost to'}</span>
                              <span className="run-label">{step.label}</span>
                              <div className="run-opponent">
                                <span className="placement-skin">
                                  <SkinIcon outfit={outfitsById.get(step.opponentId)} />
                                  <span>{outfitsById.get(step.opponentId)?.name ?? step.opponentId}</span>
                                </span>
                              </div>
                            </li>
                          ))}
                        </ol>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ) : null}
            <div className="compare-actions">
              {!archiveReadOnly ? (
                <button type="button" className="primary-button" onClick={() => saveFinishedTournament(false)}>
                  Save tournament
                </button>
              ) : null}
              {!archiveReadOnly && !tournament.simulated ? (
                <button
                  type="button"
                  className="ghost-button"
                  onClick={undoBracket}
                  disabled={!tournament.history.length}
                >
                  Undo last pick
                </button>
              ) : null}
            </div>
            {status ? <p className="hint">{status}</p> : null}
          </section>
        ) : (
          <section>
            <div className="progress">
              <p>
                {tournament.history.length} picks · {tournament.entrants.length} skins · {pageLabel(page)}
                {tournament.betting ? ` · +${tournament.pointsEarned ?? 0} weebucks` : ''}
              </p>
            </div>
            {bracketState.current ? (
              <>
                <p className="match-label">
                  {roundLabel(bracket, bracketState.current)} · {pageLabel(bracket.pages[currentPage])}
                  {tournament.betting ? ' · Betting' : tournament.simulated ? ' · Simulated' : ''}
                </p>
                <h2>{tournament.simulated ? 'Dice matchup' : 'Which skin advances?'}</h2>
                <div className="matchup">
                  <SkinCard
                    outfit={outfitsById.get(bracketState.outcomes.get(bracketState.current.id).participants[0])}
                    onPick={tournament.simulated ? undefined : () => chooseBracket(true)}
                    showDice={tournament.simulated}
                    bonusDice={
                      bonusById?.[bracketState.outcomes.get(bracketState.current.id).participants[0]] ?? 0
                    }
                  />
                  <span className="versus">vs</span>
                  <SkinCard
                    outfit={outfitsById.get(bracketState.outcomes.get(bracketState.current.id).participants[1])}
                    onPick={tournament.simulated ? undefined : () => chooseBracket(false)}
                    showDice={tournament.simulated}
                    bonusDice={
                      bonusById?.[bracketState.outcomes.get(bracketState.current.id).participants[1]] ?? 0
                    }
                  />
                </div>
                {tournament.simulated && lastRoll ? (
                  <RollBreakdown roll={lastRoll} outfitsById={outfitsById} />
                ) : null}
                <div className="compare-actions">
                  {tournament.simulated ? (
                    <>
                      <button type="button" className="primary-button" onClick={simNextMatch}>
                        Roll match
                      </button>
                      <button type="button" className="primary-button" onClick={simNextRound}>
                        Simulate round
                      </button>
                      {round1Pending ? (
                        <button type="button" className="primary-button" onClick={simRound1Pools}>
                          Finish Round 1 pools
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={simAll}
                        disabled={!canSimulateAll}
                        title={
                          canSimulateAll
                            ? 'Simulate the entire bracket'
                            : 'Unlock in the Shop for 5000 weebucks'
                        }
                      >
                        {canSimulateAll ? 'Simulate all' : 'Simulate all (locked · 5000)'}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={undoBracket}
                      disabled={!tournament.history.length}
                    >
                      Undo
                    </button>
                  )}
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => {
                      setFollowPage(true);
                      setPageIndex(currentPage);
                    }}
                  >
                    Show in bracket
                  </button>
                </div>
              </>
            ) : null}
          </section>
        )}

        <section className="bracket-view">
          {bracket.pages.length > 1 ? (
            <div className="bracket-nav">
              <div className="page-tabs">
                {phases.map((group) => (
                  <button
                    key={group.phase}
                    type="button"
                    className={`page-tab ${group.phase === currentPhase ? 'is-active' : ''}`}
                    onClick={() => {
                      setFollowPage(false);
                      setPageIndex(group.pages[0].index);
                    }}
                  >
                    {group.phase}
                  </button>
                ))}
              </div>
              {activeGroup?.pages.length > 1 ? (
                <div className="page-tabs pool-tabs">
                  {activeGroup.pages.map(({ index, page: poolPage }) => (
                    <button
                      key={poolPage.pool}
                      type="button"
                      className={`page-tab ${index === activePage ? 'is-active' : ''}`}
                      onClick={() => {
                        setFollowPage(false);
                        setPageIndex(index);
                      }}
                    >
                      {poolPage.pool}
                    </button>
                  ))}
                </div>
              ) : null}
              <p className="page-title">{pageLabel(page)}</p>
            </div>
          ) : null}
          <div className="bracket-board">
            {page.sections.map((section) => (
              <div key={section.title} className="bracket-section">
                <h3>{section.title}</h3>
                <div className="bracket-rounds">
                  {section.rounds
                    .filter((round) => round.length)
                    .map((round) => (
                      <div key={round[0].id} className="bracket-round">
                        <h4>{roundLabel(bracket, round[0])}</h4>
                        <div className="bracket-matches">{round.map(renderMatch)}</div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="fort-sort">
      <p className="hint">Nothing to show. Pick skins to begin.</p>
      <button type="button" className="ghost-button" onClick={() => setScreen('select')}>
        Back to selection
      </button>
    </div>
  );
}
