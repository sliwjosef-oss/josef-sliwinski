import { useEffect, useMemo, useRef, useState } from 'react';
import { bindPageAudio, releasePageAudio, setMenuMusicBlocked } from '../audio/menuMusic';
import { noteBettingResult } from '../utils/achievements';
import { hasAchievement } from '../utils/achievementStore';

const BET_MUSIC_URL = `${import.meta.env.BASE_URL}audio/The_Final_Bracket.mp3`;
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
  simulateUntilBetMatch,
} from '../fortSort/simulate';
import {
  addPoints,
  canStartBettingRun,
  getBetWinPointsForPhase,
  getBoostBetBonusDice,
  getDailyBetRunLimit,
  getDailyBetRunsRemaining,
  HARD_FIELD_BONUS_DICE,
  HARD_MODE_PAYOUT_MULT,
  HARD_RIVAL_BONUS_DICE,
  HARD_RIVAL_MIN_ROLL,
  HARD_RIVAL_PAYOUT_MULT,
  getLockedBetIds,
  getMatchRerolls,
  getMaxBoostBets,
  getMaxStarBets,
  getStarBetBonusDice,
  getTournamentWinPoints,
  hasBetSeedingUnlock,
  hasRandomSelectUnlock,
  hasSimulateAllUnlock,
  hasSuperBetExtraLifeUnlock,
  sidekickAsEntrant,
  getDiceRollMs,
  lockBetSkins,
  spendBettingRun,
  unlockBetSkins,
} from '../utils/economy';
import { getOutfitIconFallbackSrc, getOutfitIconSrc } from '../utils/outfits';
import { isSkinGuessed } from '../utils/progress';
import { groupOutfitsBySeason, sortOutfitsByNumber } from '../utils/seasonSort';
import { groupOutfitsBySeries } from '../utils/seriesSort';
import {
  MAX_SKIN_LEVEL,
  awardPlacementXp,
  getLevelBonusDice,
  getMinRollForLevel,
  getSkinLevel,
  getSkinXp,
  levelFromXp,
  placementXp,
  saveSkinLevels,
  sortOutfitsByLevel,
  xpProgress,
} from '../utils/skinLevels';
import '../fortSort/FortSort.css';

const SELECT_SORT = {
  NUMBER: 'number',
  SEASON: 'season',
  SERIES: 'series',
  LEVEL: 'level',
};

const MAIN_MODE = {
  id: 'betting',
  label: 'Betting',
  blurb: 'Pick a super bet and your bets, then run the tournament for weebucks.',
};

const HARD_MODE = {
  id: 'hard',
  label: 'Hard Mode',
  blurb:
    'Other skins roll 2 extra dice. Rival bets match your super bets, roll 4 extra dice, and reroll anything under 10. Round payouts are ×2, or ×5 when your bet beats a rival.',
};

function isBettingMode(mode) {
  return mode === 'betting' || mode === 'hard';
}

function pickRivalBetIds(allIds, starBetIds, boostBetIds) {
  const taken = new Set([...starBetIds, ...boostBetIds]);
  const pool = shuffle(allIds.filter((id) => !taken.has(id)));
  return pool.slice(0, starBetIds.length);
}

function hardModePayoutMultiplier(tournament, win, rolls) {
  if (!tournament?.hardMode) return 1;
  const roll = (rolls ?? []).find((item) => item.matchId === win?.matchId);
  const loserId = roll?.participants?.[roll.winnerSlot === 0 ? 1 : 0];
  if (loserId && (tournament.rivalBetIds ?? []).includes(loserId)) return HARD_RIVAL_PAYOUT_MULT;
  return HARD_MODE_PAYOUT_MULT;
}

const SIDE_MODES = [
  { id: 'rank', label: 'Ranking', blurb: 'Order skins from favorite to least.' },
  { id: 'bracket', label: 'Bracket', blurb: 'Choose each winner yourself.' },
  { id: 'simulate', label: 'Simulate', blurb: 'Roll a dice bracket with no bets.' },
];

function FortSortBar({ onOpenArchive, onBack, onOpenModes, modesActive = false }) {
  return (
    <nav className="catalogue-sort-bar catalogue-sort-bar--three" aria-label="Betting">
      <button type="button" className="catalogue-sort-button" onClick={onBack}>
        Main Menu
      </button>
      <button type="button" className="catalogue-sort-button" onClick={onOpenArchive}>
        Saved
      </button>
      <button
        type="button"
        className={`catalogue-sort-button ${modesActive ? 'active' : ''}`}
        onClick={onOpenModes}
      >
        Modes
      </button>
    </nav>
  );
}

function buildBonusById(
  starBetIds,
  boostBetIds,
  economy,
  skinLevels,
  entrantIds = [],
  hard = null,
) {
  const bonus = {};
  for (const id of entrantIds) {
    const levelDice = getLevelBonusDice(getSkinLevel(skinLevels, id));
    if (levelDice > 0) bonus[id] = levelDice;
  }
  if (economy) {
    const starBonus = getStarBetBonusDice(economy);
    const boostBonus = getBoostBetBonusDice(economy);
    for (const id of starBetIds) bonus[id] = (bonus[id] || 0) + starBonus;
    for (const id of boostBetIds) bonus[id] = (bonus[id] || 0) + boostBonus;
  }
  if (hard?.hardMode) {
    const stars = new Set(starBetIds);
    const boosts = new Set(boostBetIds);
    const rivals = new Set(hard.rivalBetIds ?? []);
    for (const id of entrantIds) {
      if (stars.has(id) || boosts.has(id)) continue;
      bonus[id] = (bonus[id] || 0) + (rivals.has(id) ? HARD_RIVAL_BONUS_DICE : HARD_FIELD_BONUS_DICE);
    }
  }
  return Object.keys(bonus).length ? bonus : null;
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
  const rivalIds = useMemo(() => tournament.rivalBetIds ?? [], [tournament.rivalBetIds]);

  const describeRow = (id) => {
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
        bracketState.done && place != null ? `Eliminated · ${formatPlace(place)}` : 'Eliminated';
      lane = 'eliminated';
    } else if (losses >= 1) {
      statusLabel = 'In losers';
      lane = 'losers';
    }
    return {
      id,
      outfit,
      statusLabel,
      lane,
      isStar: starSet.has(id),
      isRival: rivalIds.includes(id),
      hasExtraLife: !!tournament.extraLifeById?.[id],
    };
  };

  const rows = useMemo(
    () => betIds.map(describeRow),
    // describeRow closes over the same bracket state the list depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [betIds, bracketState, outfitsById, standings, starSet, rivalIds, tournament.bracket, tournament.extraLifeById],
  );
  const rivalRows = useMemo(
    () => rivalIds.map(describeRow),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rivalIds, bracketState, outfitsById, standings, starSet, tournament.bracket, tournament.extraLifeById],
  );

  const detail = detailId
    ? (() => {
        const outfit = outfitsById.get(detailId);
        const run = buildPlayerRun(tournament.bracket, bracketState.outcomes, detailId);
        const rolls = (tournament.rolls ?? []).filter((roll) => roll.participants?.includes(detailId));
        return { outfit, run, rolls };
      })()
    : null;

  const renderOverview = (rowId) => {
    if (detailId !== rowId || !detail) return null;
    return (
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
    );
  };

  const renderCards = (group) =>
    group.length ? (
      <div className="bet-status-grid">
        {group.map((row) => (
          <div key={row.id} className={`bet-status-item ${detailId === row.id ? 'is-open' : ''}`}>
            <button
              type="button"
              className={`bet-status-card is-${row.lane}`}
              onClick={() => setDetailId((current) => (current === row.id ? null : row.id))}
            >
              <SkinIcon outfit={row.outfit} />
              <div className="bet-status-text">
                <strong>
                  {row.outfit?.name ?? row.id}
                  {row.hasExtraLife ? ' 💖' : ''}
                </strong>
                <span>{row.statusLabel}</span>
                {row.isRival ? <span className="bet-status-tier">Rival</span> : null}
                {row.hasExtraLife ? <span className="bet-status-tier">Extra life</span> : null}
              </div>
            </button>
            {renderOverview(row.id)}
          </div>
        ))}
      </div>
    ) : (
      <p className="hint">None this run.</p>
    );

  return (
    <>
      <section className="bet-status-panel is-super">
        <h2 className="bet-status-title">Super Bet skins status</h2>
        {renderCards(rows.filter((row) => row.isStar))}
      </section>
      <section className="bet-status-panel is-bet">
        <h2 className="bet-status-title">Bet skins status</h2>
        {renderCards(rows.filter((row) => !row.isStar))}
      </section>
      {tournament.hardMode ? (
        <section className="bet-status-panel is-rival">
          <h2 className="bet-status-title">Rival bets</h2>
          {renderCards(rivalRows)}
        </section>
      ) : null}
    </>
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

function DiceBadge({ outfit, bonus = 0, rowSize = 0 }) {
  if (!outfit) return null;
  const dice = getDiceCount(outfit) + (Number(bonus) || 0);
  const shown = Math.min(dice, 16);
  const stars = '★'.repeat(shown);
  const title = `${dice} × d100 — keep the highest`;
  if (rowSize > 0 && shown > rowSize) {
    return (
      <p className="skin-dice is-wrapped" title={title}>
        <span className="skin-dice-row">{'★'.repeat(rowSize)}</span>
        <span className="skin-dice-row">{stars.slice(rowSize)}</span>
      </p>
    );
  }
  return (
    <p className="skin-dice" title={title}>
      {stars}
    </p>
  );
}

function SkinCard({ outfit, onPick, placeLabel, showDice = false, bonusDice = 0, compact = false }) {
  if (!outfit) return null;
  const className = `skin-card ${placeLabel ? 'podium-card' : ''} ${compact ? 'is-compact' : ''} ${onPick ? '' : 'is-static'}`;
  const body = (
    <>
      {placeLabel ? <p className="podium-place">{placeLabel}</p> : null}
      <SkinIcon outfit={outfit} />
      <p className="skin-name">{outfit.name}</p>
      {showDice && !compact ? <DiceBadge outfit={outfit} bonus={bonusDice} /> : null}
      {compact ? null : (
        <p className="skin-meta">
          {outfit.sidekick
            ? `Sidekick · ${
                outfit.sidekickRarity === 'ultra'
                  ? 'Ultra rare'
                  : outfit.sidekickRarity === 'rare'
                    ? 'Rare'
                    : 'Common'
              }`
            : outfit.chapter && outfit.season
              ? `Chapter ${outfit.chapter} · Season ${outfit.season}`
              : ''}
        </p>
      )}
    </>
  );
  if (!onPick) return <div className={className}>{body}</div>;
  return (
    <button type="button" className={className} onClick={onPick}>
      {body}
    </button>
  );
}

function BetMark({ id, starIds, boostIds, rivalIds }) {
  if (starIds?.has(id)) return <span className="bet-mark is-super">Super bet</span>;
  if (boostIds?.has(id)) return <span className="bet-mark is-bet">Bet</span>;
  if (rivalIds?.has(id)) return <span className="bet-mark is-rival">Rival</span>;
  return null;
}

function revealOrder(roll) {
  const order = [];
  const longest = Math.max(...roll.sides.map((side) => side.rolls.length), 0);
  for (let index = 0; index < longest; index += 1) {
    roll.sides.forEach((side, sideIndex) => {
      if (index < side.rolls.length) order.push({ side: sideIndex, index });
    });
  }
  return order;
}

/** True once one side has every die shown and their best is already below the other side. */
function canFinishEarly(roll, revealed) {
  for (let sideIndex = 0; sideIndex < 2; sideIndex += 1) {
    const side = roll.sides[sideIndex];
    if (!side?.rolls?.length) continue;
    const allShown = side.rolls.every((_, index) => revealed.has(`${sideIndex}:${index}`));
    if (!allShown) continue;
    const best = Math.max(...side.rolls);
    const otherIndex = 1 - sideIndex;
    let otherBest = null;
    roll.sides[otherIndex].rolls.forEach((value, index) => {
      if (!revealed.has(`${otherIndex}:${index}`)) return;
      otherBest = otherBest == null ? value : Math.max(otherBest, value);
    });
    if (otherBest != null && best < otherBest) return true;
  }
  return false;
}

function RollResult({
  roll,
  outfitsById,
  starIds,
  boostIds,
  rivalIds,
  onNext,
  onReroll = null,
  rerollsLeft = 0,
  dieMs = 2000,
}) {
  const steps = useMemo(() => revealOrder(roll), [roll]);
  const [shown, setShown] = useState(0);
  const finished = shown >= steps.length;

  useEffect(() => {
    if (finished) return undefined;
    const timer = setTimeout(() => setShown((count) => count + 1), dieMs);
    return () => clearTimeout(timer);
  }, [shown, finished, dieMs]);

  const winnerId = roll.participants[roll.winnerSlot];
  const winner = outfitsById.get(winnerId);
  const revealed = new Set(steps.slice(0, shown).map((step) => `${step.side}:${step.index}`));
  const latest = steps[shown - 1];
  const finishReady = !finished && canFinishEarly(roll, revealed);

  return (
    <section className="roll-result">
      {finished ? (
        <>
          <h2>{winner?.name ?? 'Winner'} won the round</h2>
          <SkinIcon outfit={winner} className="roll-winner-image" />
          <BetMark id={winnerId} starIds={starIds} boostIds={boostIds} rivalIds={rivalIds} />
        </>
      ) : (
        <h2>Rolling...</h2>
      )}
      <div className="suspense-matchup">
        {roll.sides.map((side, sideIndex) => {
          const id = roll.participants[sideIndex];
          const outfit = outfitsById.get(id);
          let bestSoFar = null;
          side.rolls.forEach((value, index) => {
            if (!revealed.has(`${sideIndex}:${index}`)) return;
            bestSoFar = bestSoFar == null ? value : Math.max(bestSoFar, value);
          });
          const won = finished && roll.winnerSlot === sideIndex;
          return (
            <div key={id ?? sideIndex} className="suspense-pair">
              {sideIndex === 1 ? <span className="versus">vs</span> : null}
              <div className={`suspense-side ${won ? 'is-winner' : ''}`}>
                <strong>{outfit?.name ?? '—'}</strong>
                <BetMark id={id} starIds={starIds} boostIds={boostIds} rivalIds={rivalIds} />
                <span className="sim-roll-dice">
                  {side.rolls.map((value, index) => {
                    const isShown = revealed.has(`${sideIndex}:${index}`);
                    const isLatest = latest?.side === sideIndex && latest?.index === index;
                    const isBest = isShown && value === bestSoFar;
                    return (
                      <span
                        key={`${id}-${index}`}
                        className={`sim-die ${isShown ? '' : 'is-pending'} ${isBest ? 'is-best' : ''} ${
                          isLatest ? 'is-fresh' : ''
                        }`}
                      >
                        {isShown ? value : '–'}
                      </span>
                    );
                  })}
                </span>
                <span className="sim-roll-best">{bestSoFar == null ? 'Best —' : `Best ${bestSoFar}`}</span>
              </div>
            </div>
          );
        })}
      </div>
      {finished && roll.extraLifeSavedId ? (
        <p className="hint">Extra life saved {outfitsById.get(roll.extraLifeSavedId)?.name ?? 'a skin'}</p>
      ) : null}
      {finished && roll.attempts > 1 ? <p className="hint">{roll.attempts} rolls to break the tie</p> : null}
      <div className="roll-result-actions">
        {finished ? (
          <button type="button" className="primary-button" onClick={onNext}>
            Next match
          </button>
        ) : (
          <button
            type="button"
            className="ghost-button"
            onClick={() => setShown(steps.length)}
            disabled={!finishReady}
            title={
              finishReady
                ? 'One side is already beaten — skip the rest of the reveal'
                : 'Finish unlocks once one side has all dice shown and cannot beat the other side'
            }
          >
            Finish
          </button>
        )}
        {onReroll ? (
          <button
            type="button"
            className="ghost-button"
            onClick={onReroll}
            disabled={rerollsLeft <= 0}
            title={
              rerollsLeft > 0
                ? 'Throw out this match and roll it again'
                : 'No rerolls left this tournament'
            }
          >
            Reroll match ({rerollsLeft} left)
          </button>
        ) : null}
      </div>
    </section>
  );
}

function RoundResults({ rolls, outfitsById, starIds, boostIds, rivalIds, openRollId, onToggle, onNext }) {
  const [shown, setShown] = useState(1);
  const latestRef = useRef(null);
  const finished = shown >= rolls.length;

  useEffect(() => {
    if (finished) return undefined;
    const timer = setTimeout(() => setShown((count) => count + 1), 90);
    return () => clearTimeout(timer);
  }, [shown, finished]);

  useEffect(() => {
    latestRef.current?.scrollIntoView({ block: 'center', inline: 'nearest' });
  }, [shown]);

  return (
    <section className="round-results">
      <h2>Round results</h2>
      <div className="round-result-list">
        {rolls.slice(0, shown).map((roll, index) => (
          <div
            key={roll.matchId}
            className={`round-result-item ${index === shown - 1 ? 'is-latest' : ''}`}
            ref={index === shown - 1 ? latestRef : null}
          >
            <button
              type="button"
              className={`round-matchup ${openRollId === roll.matchId ? 'is-open' : ''}`}
              onClick={() => onToggle(roll.matchId)}
            >
              {roll.participants.map((id, slot) => {
                const won = roll.winnerSlot === slot;
                const outfit = outfitsById.get(id);
                return (
                  <span key={id} className="round-pair">
                    {slot === 1 ? <span className="versus">vs</span> : null}
                    <span className={`round-side ${won ? 'is-win' : 'is-loss'}`}>
                      <span className="round-portrait">
                        <SkinIcon outfit={outfit} className="round-skin-icon" />
                      </span>
                      <span className="round-name">{outfit?.name ?? '—'}</span>
                      <BetMark id={id} starIds={starIds} boostIds={boostIds} rivalIds={rivalIds} />
                    </span>
                  </span>
                );
              })}
            </button>
            {openRollId === roll.matchId ? <RollBreakdown roll={roll} outfitsById={outfitsById} /> : null}
          </div>
        ))}
      </div>
      {finished ? (
        <button type="button" className="primary-button" onClick={onNext}>
          Next match
        </button>
      ) : null}
    </section>
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

function xpEarnedById(tournament, standings) {
  const earned = new Map();
  if (!tournament?.betting || !standings?.placeById) return earned;
  const stars = new Set(tournament.starBetIds ?? []);
  for (const id of [...(tournament.starBetIds ?? []), ...(tournament.boostBetIds ?? [])]) {
    const place = standings.placeById.get(id);
    if (place == null) continue;
    earned.set(id, placementXp(place, stars.has(id)));
  }
  return earned;
}

function PlacementName({ id, outfitsById, xpById, skinLevels }) {
  const earned = xpById?.get(id) ?? 0;
  const progress = xpProgress(skinLevels, id);
  const prevLevel = earned > 0 ? levelFromXp(Math.max(0, progress.xp - earned)) : progress.level;
  const leveledUp = earned > 0 && progress.level > prevLevel;
  const maxed = progress.next == null;
  const fill = maxed ? 100 : Math.max(0, Math.min(100, (progress.intoLevel / progress.needed) * 100));
  return (
    <span className="placement-skin">
      <SkinIcon outfit={outfitsById.get(id)} />
      <span className="placement-skin-body">
        <span className="placement-skin-top">
          <span className="placement-skin-name">{outfitsById.get(id)?.name ?? id}</span>
          {earned > 0 ? <span className="placement-level">Lv {progress.level}</span> : null}
          {leveledUp ? <span className="level-up-sign">Level up!</span> : null}
        </span>
        {earned > 0 ? (
          <>
            <span
              className="xp-bar"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={maxed ? progress.xp : progress.needed}
              aria-valuenow={maxed ? progress.xp : progress.intoLevel}
              aria-label={maxed ? `Level ${progress.level}, max level` : `Level ${progress.level}`}
            >
              <span className="xp-bar-fill" style={{ width: `${fill}%` }} />
            </span>
            <span className="placement-xp-line">
              <span className="placement-xp">+{earned} XP</span>
              <span className="placement-xp-progress">
                {maxed ? 'Max' : `${progress.intoLevel} / ${progress.needed}`}
              </span>
            </span>
          </>
        ) : null}
      </span>
    </span>
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
  onBack,
  onOpenModes,
}) {
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const starSet = useMemo(() => new Set(starBetIds), [starBetIds]);
  const boostSet = useMemo(() => new Set(boostBetIds), [boostBetIds]);
  const isBetting = isBettingMode(mode);
  const isHard = mode === 'hard';
  const betCount = starBetIds.length + boostBetIds.length;
  const [betTier, setBetTier] = useState('star'); // star | boost
  const [selectSort, setSelectSort] = useState(SELECT_SORT.NUMBER);
  const [hideUnowned, setHideUnowned] = useState(true);
  const [skinSearch, setSkinSearch] = useState('');
  const starBonus = getStarBetBonusDice(economy);
  const boostBonus = getBoostBetBonusDice(economy);
  const maxStarBets = getMaxStarBets(economy);
  const maxBoostBets = getMaxBoostBets(economy);
  const canRandomSelect = hasRandomSelectUnlock(economy);
  const betRunsRemaining = getDailyBetRunsRemaining(economy);
  const betRunsLimit = getDailyBetRunLimit(economy);

  const catalogueSorted = useMemo(() => sortOutfitsByNumber(catalogue), [catalogue]);
  const visibleOutfits = useMemo(() => {
    const base = hideUnowned ? discovered : catalogueSorted;
    const query = skinSearch.trim().toLowerCase();
    if (!query) return base;
    return base.filter((outfit) => {
      if (!discoveredIds.has(outfit.id)) return false;
      return String(outfit.name || '')
        .toLowerCase()
        .includes(query);
    });
  }, [hideUnowned, discovered, catalogueSorted, skinSearch, discoveredIds]);

  const allSelected =
    discovered.length > 0 && selectedIds.length === discovered.length && hideUnowned
      ? true
      : discovered.length > 0 &&
        discovered.every((outfit) => selectedIds.includes(outfit.id)) &&
        selectedIds.length === discovered.length;

  const seasonSections = useMemo(() => groupOutfitsBySeason(visibleOutfits), [visibleOutfits]);
  const seriesSections = useMemo(() => groupOutfitsBySeries(visibleOutfits), [visibleOutfits]);
  const levelSorted = useMemo(
    () => sortOutfitsByLevel(visibleOutfits, skinLevels),
    [visibleOutfits, skinLevels],
  );

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
    const fieldLabel = discovered.some((outfit) => outfit.sidekick)
      ? `${discovered.length} entrants`
      : `${discovered.length} skins`;
    if (isHard) {
      const rivals = starBetIds.length;
      return `Start hard mode (${fieldLabel} · ${starBetIds.length} super · ${boostBetIds.length} bets · ${rivals} rival${rivals === 1 ? '' : 's'})`;
    }
    if (mode === 'betting') {
      return `Start betting sim (${fieldLabel} · ${starBetIds.length} super · ${boostBetIds.length} bets)`;
    }
    return `Start bracket with ${selectedIds.length} skins`;
  })();

  const canStart =
    isBetting
      ? discovered.length >= 2 && betCount > 0 && betRunsRemaining > 0
      : selectedIds.length >= 2;

  const renderPick = (outfit) => {
    const owned = discoveredIds.has(outfit.id);
    const selected = selectedSet.has(outfit.id);
    const locked = lockedBetIds.has(outfit.id);
    const isStar = isBetting && starSet.has(outfit.id);
    const isBoost = isBetting && boostSet.has(outfit.id);
    const level = owned ? getSkinLevel(skinLevels, outfit.id) : 0;
    const bonus =
      (isStar ? starBonus : isBoost ? boostBonus : 0) +
      getLevelBonusDice(level) +
      (isHard && !isStar && !isBoost ? HARD_FIELD_BONUS_DICE : 0);
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
        {owned ? (
          <p className="skin-level-badge">
            {outfit.sidekick ? 'Sidekick' : isBetting ? `Lvl. ${level}` : level}
          </p>
        ) : null}
        {owned && (mode === 'simulate' || isBetting) ? (
          <DiceBadge outfit={outfit} bonus={bonus} rowSize={isBetting ? 6 : 0} />
        ) : null}
        <span className="fort-sort-check" aria-hidden="true">
          {isBetting
            ? locked
              ? '🔒'
              : isStar
                ? 'SUPER'
                : isBoost
                  ? 'BET'
                  : ''
            : selected
              ? '✓'
              : ''}
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
    <div className="fort-sort fort-sort-screen">
      <header className={`catalogue-header ${isBetting ? 'betting-header' : ''}`}>
        {isBetting ? (
          <div className="betting-header-row">
            <h1>{isHard ? 'Hard Mode' : 'Betting'}</h1>
            <div className="betting-header-stats">
              <span>Weebucks: {economy.points}</span>
              <span>
                Runs {betRunsRemaining}/{betRunsLimit}
              </span>
            </div>
          </div>
        ) : (
          <h1>Betting</h1>
        )}
        <p className="hint">
          {mode === 'rank'
            ? 'Pick discovered skins, then rank them favorite to least favorite.'
            : mode === 'simulate'
              ? 'Pick discovered skins for a dice-simulated double-elim bracket.'
              : isHard
                ? `${
                    discovered.some((outfit) => outfit.sidekick)
                      ? 'Every discovered skin enters, plus your owned sidekicks.'
                      : 'Every discovered skin enters.'
                  } Other skins roll 2 extra dice. One rival is chosen per super bet, with 4 extra dice and a floor of 10. Round payouts are ×2, or ×5 when your bet beats a rival.`
                : mode === 'betting'
                  ? `${
                      discovered.some((outfit) => outfit.sidekick)
                        ? 'Every discovered skin enters, plus your owned sidekicks.'
                        : 'Every discovered skin enters.'
                    } Pick your super bet and your bets, then start.`
                  : 'Pick discovered skins, then run a double-elimination bracket.'}{' '}
          {isBetting ? 'Rules are in Help.' : 'Only discovered skins can enter.'}
        </p>
      </header>

      {isBetting ? (
        <div className="betting-toolbar">
          <div className="betting-pick-row">
            <button
              type="button"
              className={`mode-tab is-star ${betTier === 'star' ? 'is-active' : ''}`}
              onClick={() => setBetTier('star')}
            >
              Pick super bet{maxStarBets === 1 ? '' : 's'} ({starBetIds.length}/{maxStarBets})
            </button>
            <button
              type="button"
              className={`mode-tab is-bet ${betTier === 'boost' ? 'is-active' : ''}`}
              onClick={() => setBetTier('boost')}
            >
              Pick bets ({boostBetIds.length}/{maxBoostBets})
            </button>
          </div>
          <button type="button" className="betting-start" disabled={!canStart} onClick={onStart}>
            {startLabel}
          </button>
        </div>
      ) : null}

      <div className="catalogue-scroll" tabIndex={0} aria-label="Betting skins">
      {!isBetting ? (
        <div className="import-actions" style={{ marginBottom: 12 }}>
          <button type="button" className="primary-button" disabled={!canStart} onClick={onStart}>
            {startLabel}
          </button>
        </div>
      ) : null}

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
        <div className="betting-tools">
          <button
            type="button"
            className="ghost-button betting-clear"
            onClick={() => {
              setStarBetIds([]);
              setBoostBetIds([]);
            }}
            disabled={betCount === 0}
          >
            Clear bets
          </button>
          <div className="betting-search-row">
            <input
              type="search"
              className="betting-skin-search"
              value={skinSearch}
              onChange={(event) => setSkinSearch(event.target.value)}
              placeholder="Search"
              enterKeyHint="search"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              aria-label="Search"
            />
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
                Select random (locked)
              </button>
            )}
          </div>
        </div>
      )}

      {catalogue.length > 0 ? (
        <div className="fort-sort-sort-row">
          <select
            className="fort-sort-sort-select"
            value={selectSort}
            onChange={(event) => setSelectSort(event.target.value)}
            aria-label="Sort skins"
          >
            <option value={SELECT_SORT.NUMBER}>Sort by Number</option>
            <option value={SELECT_SORT.SEASON}>Sort by Season</option>
            <option value={SELECT_SORT.SERIES}>Sort by Series</option>
            <option value={SELECT_SORT.LEVEL}>Sort by Level</option>
          </select>
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
        <p className="hint">Discover skins in hangman first, then come back to Betting.</p>
      ) : visibleOutfits.length === 0 ? (
        <p className="hint">No skins to show.</p>
      ) : selectSort === SELECT_SORT.SEASON ? (
        renderSections(seasonSections)
      ) : selectSort === SELECT_SORT.SERIES ? (
        renderSections(seriesSections)
      ) : selectSort === SELECT_SORT.LEVEL ? (
        renderPickGrid(levelSorted)
      ) : (
        renderPickGrid(visibleOutfits)
      )}
      </div>

      <FortSortBar
        onOpenArchive={onOpenArchive}
        onBack={onBack}
        onOpenModes={onOpenModes}
      />
    </div>
  );
}

export default function FortSort({
  outfits,
  guessedSkinIds,
  sidekicks = [],
  economy,
  onEconomyChange,
  skinLevels = {},
  onSkinLevelsChange,
  onBack,
}) {
  const sidekickBetting = hasAchievement('sidekicks-50');
  const sidekickField = useMemo(() => {
    if (!sidekickBetting) return [];
    const owned = new Set(economy.ownedSidekickIds || []);
    return sidekicks.filter((sidekick) => owned.has(sidekick.id)).map(sidekickAsEntrant);
  }, [sidekickBetting, sidekicks, economy.ownedSidekickIds]);
  const outfitsById = useMemo(() => {
    const map = new Map(outfits.map((outfit) => [outfit.id, outfit]));
    for (const pet of sidekickField) map.set(pet.id, pet);
    return map;
  }, [outfits, sidekickField]);
  const discovered = useMemo(
    () => sortOutfitsByNumber(outfits.filter((outfit) => isSkinGuessed(guessedSkinIds, outfit))),
    [outfits, guessedSkinIds],
  );
  const discoveredIds = useMemo(() => new Set(discovered.map((outfit) => outfit.id)), [discovered]);
  const bettingField = useMemo(() => [...discovered, ...sidekickField], [discovered, sidekickField]);
  const bettingFieldIds = useMemo(
    () => new Set(bettingField.map((outfit) => outfit.id)),
    [bettingField],
  );
  const lockedBetIds = useMemo(() => getLockedBetIds(economy), [economy]);

  const [mode, setMode] = useState('betting');
  const [selectedIds, setSelectedIds] = useState(() =>
    loadSelectedIds().filter((id) => discoveredIds.has(id) || discovered.some((outfit) => outfit.id === id)),
  );
  const [starBetIds, setStarBetIds] = useState([]);
  const [boostBetIds, setBoostBetIds] = useState([]);
  const [screen, setScreen] = useState('select'); // select | modes | play | archive
  const [rankProgress, setRankProgress] = useState(null);
  const [tournament, setTournament] = useState(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [followPage, setFollowPage] = useState(true);
  const [archiveReadOnly, setArchiveReadOnly] = useState(false);
  const [showFullResults, setShowFullResults] = useState(false);
  const [playerRunId, setPlayerRunId] = useState(null);
  const [status, setStatus] = useState('');
  const [playTab, setPlayTab] = useState('match');
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [matchView, setMatchView] = useState('vs');
  /** @type {[null | 'bet' | 'super', Function]} */
  const [watchPending, setWatchPending] = useState(null);
  const [roundRolls, setRoundRolls] = useState([]);
  const [openRollId, setOpenRollId] = useState(null);
  const hubModeRef = useRef('betting');
  const musicRef = useRef(null);

  const playBetMusic = () => {
    let audio = musicRef.current;
    if (!audio) {
      audio = bindPageAudio(new Audio(BET_MUSIC_URL));
      audio.loop = true;
      audio.volume = 0.55;
      musicRef.current = audio;
    }
    const pending = audio.play();
    if (pending?.catch) pending.catch(() => {});
  };

  const stopBetMusic = () => {
    const audio = musicRef.current;
    if (!audio) return;
    releasePageAudio(audio);
    audio.currentTime = 0;
  };

  useEffect(
    () => () => {
      setMenuMusicBlocked('betting', false);
      releasePageAudio(musicRef.current);
      musicRef.current = null;
    },
    [],
  );

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
      current.filter((id) => bettingFieldIds.has(id) && !lockedBetIds.has(id)).slice(0, maxStarBets),
    );
    setBoostBetIds((current) =>
      current.filter((id) => bettingFieldIds.has(id) && !lockedBetIds.has(id)).slice(0, maxBoostBets),
    );
  }, [discoveredIds, bettingFieldIds, lockedBetIds, maxStarBets, maxBoostBets]);

  useEffect(() => {
    saveSortMode(mode);
    if (isBettingMode(mode)) {
      setSelectedIds(bettingField.map((outfit) => outfit.id));
    }
  }, [mode, bettingField]);

  useEffect(() => {
    if (!isBettingMode(mode)) saveSelectedIds(selectedIds);
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
    const resumeSim =
      savedSim?.entrants.every((id) => discoveredIds.has(id) || bettingFieldIds.has(id)) &&
      ((isBettingMode(mode) && savedSim.betting) || (mode === 'simulate' && !savedSim.betting));
    if (resumeSim) {
      if (savedSim.hardMode) setMode('hard');
      setTournament({
        ...savedSim,
        simulated: true,
        bracket: createBracket(savedSim.entrants, savedSim.version ?? 4),
      });
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

  useEffect(() => {
    const rollOnScreen = matchView === 'roll' && !!lastRoll;
    const roundOnScreen = matchView === 'round' && roundRolls.length > 0;
    const tournamentCompleteOnScreen =
      screen === 'play' &&
      playTab === 'match' &&
      !!bracketState?.done &&
      !rollOnScreen &&
      !roundOnScreen;
    const inBettingBracket =
      screen === 'play' &&
      isBettingMode(mode) &&
      !archiveReadOnly &&
      !!tournament?.betting &&
      !!bracketState &&
      !tournamentCompleteOnScreen;
    if (!inBettingBracket) {
      stopBetMusic();
      setMenuMusicBlocked('betting', false);
      return undefined;
    }
    setMenuMusicBlocked('betting', true);
    playBetMusic();
    const resumeOnTap = () => playBetMusic();
    window.addEventListener('pointerdown', resumeOnTap);
    return () => window.removeEventListener('pointerdown', resumeOnTap);
  }, [
    screen,
    mode,
    archiveReadOnly,
    tournament,
    bracketState,
    playTab,
    matchView,
    lastRoll,
    roundRolls,
  ]);
  const isSimMode = mode === 'simulate' || isBettingMode(mode) || !!tournament?.simulated;
  const bonusById = useMemo(() => {
    if (!tournament?.simulated) return null;
    return buildBonusById(
      tournament.betting ? tournament.starBetIds ?? [] : [],
      tournament.betting ? tournament.boostBetIds ?? [] : [],
      tournament.betting ? economy : null,
      skinLevels,
      tournament.entrants ?? [],
      tournament.hardMode
        ? { hardMode: true, rivalBetIds: tournament.rivalBetIds ?? [] }
        : null,
    );
  }, [tournament, economy, skinLevels]);
  const minRollById = useMemo(() => {
    if (!tournament?.simulated) return null;
    const rivals = new Set(tournament.hardMode ? tournament.rivalBetIds ?? [] : []);
    const map = {};
    for (const id of tournament.entrants ?? []) {
      let min = getMinRollForLevel(getSkinLevel(skinLevels, id));
      if (rivals.has(id)) min = Math.max(min, HARD_RIVAL_MIN_ROLL);
      if (min > 1) map[id] = min;
    }
    return Object.keys(map).length ? map : null;
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
    } else if (isBettingMode(mode)) {
      const entrants = bettingField.map((outfit) => outfit.id);
      if (entrants.length < 2) return;
      if (!canStartBettingRun(economy)) {
        setStatus('No betting runs left today.');
        return;
      }
      const stars = starBetIds.filter((id) => bettingFieldIds.has(id) && !lockedBetIds.has(id));
      const boosts = boostBetIds.filter(
        (id) => bettingFieldIds.has(id) && !lockedBetIds.has(id) && !stars.includes(id),
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
      const hardMode = mode === 'hard';
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
        hardMode,
        rivalBetIds: hardMode ? pickRivalBetIds(entrants, stars, boosts) : [],
        starBetIds: stars,
        boostBetIds: boosts,
        pointsEarned: 0,
        rerollsUsed: 0,
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
        rerollsUsed: 0,
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
    if (isBettingMode(mode)) {
      setMenuMusicBlocked('betting', true);
      playBetMusic();
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

  const applySimResult = (result, nextExtraLifeById = null, source = null) => {
    const run = source?.tournament ?? tournament;
    const economyState = source?.economy ?? economy;
    const levelState = source?.skinLevels ?? skinLevels;
    if (!run || !result) return;
    let pointsGain = 0;
    let championBonusPaid = !!run.championBonusPaid;
    let xpAwarded = !!run.xpAwarded;
    let bettingNote = null;
    const extraLifeById =
      nextExtraLifeById != null ? { ...nextExtraLifeById } : { ...(run.extraLifeById ?? {}) };
    if (run.betting) {
      for (const win of result.wins ?? []) {
        const winnerId = typeof win === 'string' ? win : win?.winnerId;
        const matchId = typeof win === 'string' ? null : win?.matchId;
        if (!winnerId || !betIdSet.has(winnerId)) continue;
        const phase = matchId ? matchPhase(run.bracket, matchId) : '';
        pointsGain +=
          getBetWinPointsForPhase(phase, economyState, {
            superBet: superBetIdSet.has(winnerId),
          }) * hardModePayoutMultiplier(run, win, result.rolls);
      }
      const wasDone = !!resolveBracket(run.bracket, Object.fromEntries(run.history)).done;
      const nextState = resolveBracket(run.bracket, Object.fromEntries(result.history));
      if (
        !wasDone &&
        nextState.done &&
        nextState.champion &&
        betIdSet.has(nextState.champion) &&
        !championBonusPaid
      ) {
        pointsGain += getTournamentWinPoints(economyState, {
          superBet: superBetIdSet.has(nextState.champion),
        });
        championBonusPaid = true;
      }
      if (!wasDone && nextState.done && !xpAwarded) {
        const finalStandings = computeStandings(run.bracket, nextState.outcomes, nextState);
        const awards = [...betIdSet]
          .filter((id) => !outfitsById.get(id)?.sidekick)
          .map((id) => ({
            id,
            place: finalStandings.placeById.get(id) ?? 999,
            superBet: superBetIdSet.has(id),
          }));
        const xpResult = awardPlacementXp(levelState, awards);
        onSkinLevelsChange?.(xpResult.levels);
        const totalXp = xpResult.gained.reduce((sum, entry) => sum + entry.amount, 0);
        if (totalXp > 0) {
          setStatus(`Betting XP awarded: +${totalXp} across your selected skins.`);
        }
        xpAwarded = true;
      }
      const gf1 = nextState.outcomes?.get('GF1');
      const gf2 = nextState.outcomes?.get('GF2');
      bettingNote = {
        rolls: result.rolls ?? [],
        completed: !wasDone && !!nextState.done,
        hardMode: !!run.hardMode,
        championId: nextState.champion,
        runnerUpId: nextState.runnerUp,
        fromLosers: gf1?.winnerSlot === 1 && gf2?.winner != null && gf2.winner === gf1.winner,
        betIds: betIdSet,
      };
    }
    const nextEconomy = pointsGain > 0 ? addPoints(pointsGain, economyState) : economyState;
    if (nextEconomy !== economy) onEconomyChange(nextEconomy);
    if (bettingNote) noteBettingResult(bettingNote);
    const next = {
      ...run,
      history: result.history,
      rolls: [...(run.rolls ?? []), ...result.rolls],
      pointsEarned: (run.pointsEarned ?? 0) + pointsGain,
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
    setWatchPending(null);
    applySimResult(
      {
        history: [...tournament.history, [step.matchId, step.winnerSlot]],
        rolls: [step.roll],
        wins: [{ winnerId: step.winnerId, matchId: step.matchId }],
      },
      lives,
    );
    setMatchView('roll');
    setOpenRollId(null);
  };

  const rerollCurrentMatch = () => {
    if (!tournament || archiveReadOnly || !tournament.simulated) return;
    const limit = getMatchRerolls(economy);
    const used = Math.max(0, Number(tournament.rerollsUsed) || 0);
    if (limit <= 0 || used >= limit) return;
    const rolls = tournament.rolls ?? [];
    const last = rolls[rolls.length - 1];
    if (!last || !tournament.history.length) return;

    const history = tournament.history.slice(0, -1);
    let pointsEarned = tournament.pointsEarned ?? 0;
    let championBonusPaid = !!tournament.championBonusPaid;
    let xpAwarded = !!tournament.xpAwarded;
    let economyState = economy;
    let levelState = skinLevels;
    let refund = 0;

    if (tournament.betting) {
      const winnerId = last.participants?.[last.winnerSlot];
      if (winnerId && betIdSet.has(winnerId)) {
        const phase = matchPhase(tournament.bracket, last.matchId);
        refund +=
          getBetWinPointsForPhase(phase, economy, {
            superBet: superBetIdSet.has(winnerId),
          }) * hardModePayoutMultiplier(tournament, { matchId: last.matchId }, [last]);
      }
      const before = resolveBracket(tournament.bracket, Object.fromEntries(history));
      const after = resolveBracket(tournament.bracket, Object.fromEntries(tournament.history));
      if (!before.done && after.done) {
        if (championBonusPaid && after.champion && betIdSet.has(after.champion)) {
          refund += getTournamentWinPoints(economy, {
            superBet: superBetIdSet.has(after.champion),
          });
          championBonusPaid = false;
        }
        if (xpAwarded && standings?.placeById) {
          const stars = new Set(tournament.starBetIds ?? []);
          const nextLevels = { ...skinLevels };
          for (const id of betIdSet) {
            if (outfitsById.get(id)?.sidekick) continue;
            const place = standings.placeById.get(id);
            if (place == null) continue;
            const amount = placementXp(place, stars.has(id));
            const xp = Math.max(0, getSkinXp(nextLevels, id) - amount);
            nextLevels[id] = { xp, level: levelFromXp(xp) };
          }
          saveSkinLevels(nextLevels);
          levelState = nextLevels;
          xpAwarded = false;
        }
      }
    }

    if (refund > 0) {
      pointsEarned = Math.max(0, pointsEarned - refund);
      economyState = addPoints(-refund, economy);
    }

    const lives = { ...(tournament.extraLifeById ?? {}) };
    if (last.extraLifeSavedId) lives[last.extraLifeSavedId] = true;

    const base = {
      ...tournament,
      history,
      rolls: rolls.slice(0, -1),
      pointsEarned,
      championBonusPaid,
      xpAwarded,
      extraLifeById: { ...lives },
      rerollsUsed: used + 1,
    };

    const step = simulateNextMatch(
      base.bracket,
      base.history,
      outfitsById,
      bonusById,
      minRollById,
      lives,
    );
    if (levelState !== skinLevels) onSkinLevelsChange?.(levelState);
    if (!step) {
      if (economyState !== economy) onEconomyChange(economyState);
      setTournament(base);
      persistTournament(base);
      return;
    }
    applySimResult(
      {
        history: [...base.history, [step.matchId, step.winnerSlot]],
        rolls: [step.roll],
        wins: [{ winnerId: step.winnerId, matchId: step.matchId }],
      },
      lives,
      { tournament: base, economy: economyState, skinLevels: levelState },
    );
    setMatchView('roll');
    setOpenRollId(null);
  };

  const classifyBetMatch = (participants = []) => {
    const stars = new Set(tournament?.starBetIds ?? []);
    const bets = new Set(tournament?.boostBetIds ?? []);
    if (participants.some((id) => stars.has(id))) return 'super';
    if (participants.some((id) => bets.has(id))) return 'bet';
    return null;
  };

  const peekWatchKind = (history = tournament?.history) => {
    if (!tournament?.betting || !history) return null;
    const state = resolveBracket(tournament.bracket, Object.fromEntries(history));
    if (!state.current) return null;
    return classifyBetMatch(state.outcomes.get(state.current.id)?.participants || []);
  };

  const autoUntilBet = () => {
    if (!tournament || archiveReadOnly || !tournament.simulated || !tournament.betting) return;
    // Auto is only for skipping non-bet matches; bet/super-bet matchups must be watched.
    if (peekWatchKind(tournament.history)) return;

    const lives = withExtraLives();
    const result = simulateUntilBetMatch(
      tournament.bracket,
      tournament.history,
      outfitsById,
      bonusById,
      minRollById,
      lives,
      [...(tournament.boostBetIds ?? []), ...(tournament.starBetIds ?? [])],
      tournament.starBetIds ?? [],
    );
    const watchKind = result.watchKind || null;
    if (result.rolls?.length) {
      // Same presentation as Simulate round — show everything Auto cleared.
      showRoundResults(result, lives);
      setWatchPending(watchKind);
      return;
    }
    if (lives && tournament.extraLifeById) {
      const next = { ...tournament, extraLifeById: lives };
      setTournament(next);
      persistTournament(next);
    }
    setWatchPending(watchKind);
    setMatchView('vs');
    setOpenRollId(null);
  };

  const showRoundResults = (result, lives) => {
    if (!result.rolls?.length) return;
    applySimResult(result, lives);
    setRoundRolls(result.rolls);
    setOpenRollId(null);
    setMatchView('round');
  };

  const simNextRound = () => {
    if (!tournament || archiveReadOnly || !tournament.simulated) return;
    const lives = withExtraLives();
    showRoundResults(
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

  const finishSimulationQuiet = (result, lives) => {
    if (!result) return;
    applySimResult(result, lives);
    setRoundRolls([]);
    setOpenRollId(null);
    setMatchView('vs');
  };

  const simRound1Pools = () => {
    if (!tournament || archiveReadOnly || !tournament.simulated) return;
    const lives = withExtraLives();
    finishSimulationQuiet(
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
    finishSimulationQuiet(
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
        hardMode: !!tournament.hardMode,
        rivalBetIds: tournament.rivalBetIds ?? [],
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
      (mode === 'bracket' || mode === 'simulate' || isBettingMode(mode)) &&
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
          simulated: !!(saved.simulated || mode === 'simulate' || isBettingMode(mode)),
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
      mode === 'rank' ? 'ranking' : mode === 'simulate' || isBettingMode(mode) ? 'simulation' : 'bracket';
    if (!confirm(`Start over? This clears your current ${label}. Saved tournaments are kept.`)) {
      return;
    }
    if ((mode === 'bracket' || mode === 'simulate' || isBettingMode(mode)) && bracketState?.done) {
      saveFinishedTournament(true);
    }
    if (mode === 'rank') {
      clearRankProgress();
      setRankProgress(null);
    } else if (mode === 'simulate' || isBettingMode(mode)) {
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

  const playAgain = () => {
    if ((mode === 'bracket' || mode === 'simulate' || isBettingMode(mode)) && bracketState?.done) {
      saveFinishedTournament(true);
    }
    if (mode === 'rank') {
      clearRankProgress();
      setRankProgress(null);
    } else if (mode === 'simulate' || isBettingMode(mode)) {
      clearSimBracketProgress();
      setTournament(null);
    } else {
      clearBracketProgress();
      setTournament(null);
    }
    setShowFullResults(false);
    setPlayerRunId(null);
    setRoundRolls([]);
    setOpenRollId(null);
    setWatchPending(null);
    setMatchView('vs');
    setPlayTab('match');
    setStatus('');
    setScreen('select');
  };

  const abandonTournament = () => {
    if (!tournament || archiveReadOnly) {
      setConfirmRestart(false);
      setScreen('select');
      return;
    }
    const earned = Math.max(0, Number(tournament.pointsEarned) || 0);
    const betIds = [...(tournament.starBetIds ?? []), ...(tournament.boostBetIds ?? [])];
    let nextEconomy = economy;
    if (earned > 0) nextEconomy = addPoints(-earned, nextEconomy);
    if (tournament.betting && betIds.length) nextEconomy = unlockBetSkins(betIds, nextEconomy);
    if (nextEconomy !== economy) onEconomyChange(nextEconomy);

    if (tournament.betting && tournament.xpAwarded && standings?.placeById) {
      const stars = new Set(tournament.starBetIds ?? []);
      const nextLevels = { ...skinLevels };
      for (const id of betIds) {
        const place = standings.placeById.get(id);
        if (place == null) continue;
        const amount = placementXp(place, stars.has(id));
        const xp = Math.max(0, getSkinXp(nextLevels, id) - amount);
        nextLevels[id] = { xp, level: levelFromXp(xp) };
      }
      saveSkinLevels(nextLevels);
      onSkinLevelsChange?.(nextLevels);
    }

    if (tournament.simulated || mode === 'simulate' || isBettingMode(mode)) clearSimBracketProgress();
    else clearBracketProgress();
    setTournament(null);
    setRoundRolls([]);
    setOpenRollId(null);
    setMatchView('vs');
    setPlayTab('match');
    setConfirmRestart(false);
    setStatus('');
    setScreen('select');
  };

  const openArchiveEntry = (entry) => {
    if (!entry.entrants.every((id) => outfitsById.has(id))) {
      setStatus('That saved tournament uses skins missing from the catalogue.');
      return;
    }
    setArchiveReadOnly(true);
    hubModeRef.current = mode;
    setTournament({
      entrants: entry.entrants,
      history: entry.history,
      rolls: entry.rolls ?? [],
      version: entry.version ?? 4,
      archiveId: entry.id,
      simulated: !!entry.simulated || !!entry.betting,
      betting: !!entry.betting,
      hardMode: !!entry.hardMode,
      rivalBetIds: entry.rivalBetIds ?? [],
      starBetIds: entry.starBetIds ?? [],
      boostBetIds: entry.boostBetIds ?? [],
      pointsEarned: entry.pointsEarned ?? 0,
      championBonusPaid: true,
      xpAwarded: true,
      bracket: createBracket(entry.entrants, entry.version ?? 4),
    });
    setMode(entry.hardMode ? 'hard' : entry.betting ? 'betting' : entry.simulated ? 'simulate' : 'bracket');
    setScreen('play');
    setShowFullResults(false);
    setPlayerRunId(null);
    setStatus('');
  };

  const returnToHub = () => {
    setArchiveReadOnly(false);
    setShowFullResults(false);
    setPlayerRunId(null);
    setRoundRolls([]);
    setOpenRollId(null);
    setMatchView('vs');
    setPlayTab('match');
    setConfirmLeave(false);
    setStatus('');
    const hubMode = hubModeRef.current;
    setMode(hubMode);
    const saved = hubMode === 'simulate' || hubMode === 'betting' ? loadSimBracketProgress() : loadBracketProgress();
    if (saved?.entrants.every((id) => discoveredIds.has(id))) {
      setTournament({
        ...saved,
        simulated: !!(saved.simulated || hubMode === 'simulate' || hubMode === 'betting'),
        bracket: createBracket(saved.entrants, saved.version ?? 4),
      });
    } else {
      setTournament(null);
    }
    setScreen('select');
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
                    {entry.hardMode ? ' · Hard Mode' : entry.betting ? ' · Betting' : entry.simulated ? ' · Simulated' : ''}
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

  if (screen === 'modes') {
    return (
      <div className="fort-sort fort-sort-screen">
        <header className="catalogue-header">
          <h1>Modes</h1>
        </header>
        <div className="catalogue-scroll" tabIndex={0} aria-label="Betting modes">
          <div className="fort-sort-mode-list">
            <button
              type="button"
              className={`mode-feature ${mode === MAIN_MODE.id ? 'is-current' : ''}`}
              onClick={() => {
                setMode(MAIN_MODE.id);
                setScreen('select');
              }}
            >
              <span className="mode-feature-kicker">Main mode</span>
              <span className="mode-feature-title">{MAIN_MODE.label}</span>
              <span className="mode-feature-blurb">{MAIN_MODE.blurb}</span>
              {mode === MAIN_MODE.id ? <span className="mode-current">Current</span> : null}
            </button>
            {hasAchievement('bet-plays-100') ? (
              <button
                type="button"
                className={`mode-feature is-hard ${mode === HARD_MODE.id ? 'is-current' : ''}`}
                onClick={() => {
                  setMode(HARD_MODE.id);
                  setScreen('select');
                }}
              >
                <span className="mode-feature-kicker">Betting mode</span>
                <span className="mode-feature-title">{HARD_MODE.label}</span>
                <span className="mode-feature-blurb">{HARD_MODE.blurb}</span>
                {mode === HARD_MODE.id ? <span className="mode-current">Current</span> : null}
              </button>
            ) : null}
            <p className="mode-side-label">Side modes</p>
            <div className="mode-side-list">
              {SIDE_MODES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`mode-side-button ${mode === item.id ? 'is-current' : ''}`}
                  onClick={() => {
                    setMode(item.id);
                    setScreen('select');
                  }}
                >
                  <span className="mode-side-title">
                    {item.label}
                    {mode === item.id ? <span className="mode-current">Current</span> : null}
                  </span>
                  <span>{item.blurb}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <FortSortBar
          onOpenArchive={() => setScreen('archive')}
          onBack={onBack}
          onOpenModes={() => setScreen('modes')}
          modesActive
        />
      </div>
    );
  }

  if (screen === 'select') {
    return (
      <SelectScreen
        discovered={isBettingMode(mode) ? bettingField : discovered}
        catalogue={outfits}
        discoveredIds={isBettingMode(mode) ? bettingFieldIds : discoveredIds}
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
        onBack={onBack}
        onOpenModes={() => setScreen('modes')}
      />
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
            <button type="button" className="ghost-button" onClick={onBack}>
              Main Menu
            </button>
            <button type="button" className="ghost-button" onClick={startOver}>
              Start over
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
          <h1>Betting</h1>
          <button type="button" className="ghost-button" onClick={onBack}>
            Main Menu
          </button>
          <button type="button" className="ghost-button" onClick={startOver}>
            Start over
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
  if ((mode === 'bracket' || mode === 'simulate' || isBettingMode(mode)) && tournament && bracketState) {
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
    const xpById = bracketState.done ? xpEarnedById(tournament, standings) : null;
    const currentOutcome = bracketState.current
      ? bracketState.outcomes.get(bracketState.current.id)
      : null;
    const currentBetKind = tournament.betting
      ? watchPending || classifyBetMatch(currentOutcome?.participants || [])
      : null;

    const openBracketTab = () => {
      setFollowPage(true);
      if (bracketState.current) {
        const nextPage = bracket.pageOf.get(bracketState.current.id);
        if (nextPage != null) setPageIndex(nextPage);
      } else if (bracketState.done) {
        setPageIndex(Math.max(0, bracket.pages.length - 1));
      }
      setPlayTab('bracket');
    };

    const bracketNav =
      playTab === 'bracket' && bracket.pages.length > 1 ? (
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
      ) : null;

    return (
      <div className={`fort-sort fort-sort-screen ${playTab === 'bracket' ? 'is-bracket-wide' : ''}`}>
        {bracketNav}
        <div
          className={`catalogue-scroll ${playTab === 'bracket' ? 'is-bracket-scroll' : ''}`}
          tabIndex={0}
          aria-label="Tournament"
        >
        <div className="status-tab" hidden={playTab !== 'status'}>
          {tournament.betting ? (
            <BettingStatusPanel
              tournament={tournament}
              bracketState={bracketState}
              standings={standings}
              outfitsById={outfitsById}
            />
          ) : (
            <p className="hint">Skin status shows your bet skins. This mode has none.</p>
          )}
          {!archiveReadOnly && !bracketState.done ? (
            <button type="button" className="danger-button" onClick={() => setConfirmRestart(true)}>
              Start Over
            </button>
          ) : null}
        </div>
        <div className="match-tab-panel" hidden={playTab !== 'match'}>
        {matchView === 'roll' && lastRoll ? (
          <RollResult
            key={`${lastRoll.matchId}-${tournament.rerollsUsed ?? 0}`}
            roll={lastRoll}
            outfitsById={outfitsById}
            starIds={new Set(tournament.starBetIds ?? [])}
            boostIds={new Set(tournament.boostBetIds ?? [])}
            rivalIds={new Set(tournament.rivalBetIds ?? [])}
            dieMs={getDiceRollMs(economy)}
            onReroll={
              !archiveReadOnly && getMatchRerolls(economy) > 0 ? rerollCurrentMatch : null
            }
            rerollsLeft={Math.max(0, getMatchRerolls(economy) - (tournament.rerollsUsed ?? 0))}
            onNext={() => {
              setMatchView('vs');
              setWatchPending(peekWatchKind());
            }}
          />
        ) : matchView === 'round' && roundRolls.length ? (
          <RoundResults
            key={roundRolls[0]?.matchId ?? 'round'}
            rolls={roundRolls}
            outfitsById={outfitsById}
            starIds={new Set(tournament.starBetIds ?? [])}
            boostIds={new Set(tournament.boostBetIds ?? [])}
            rivalIds={new Set(tournament.rivalBetIds ?? [])}
            openRollId={openRollId}
            onToggle={(matchId) => setOpenRollId((current) => (current === matchId ? null : matchId))}
            onNext={() => {
              setMatchView('vs');
              setWatchPending(peekWatchKind());
            }}
          />
        ) : bracketState.done ? (
          <section className="champion-view-inline">
            <div className="champion-view-header">
              <h2>{archiveReadOnly ? 'Saved tournament' : 'Tournament complete'}</h2>
              {!archiveReadOnly ? (
                <div className="champion-view-actions">
                  <button type="button" className="primary-button" onClick={playAgain}>
                    Finish
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => saveFinishedTournament(false)}
                  >
                    Save tournament
                  </button>
                </div>
              ) : null}
            </div>
            {archiveReadOnly ? (
              <p className="resume-note">Viewing a saved tournament. Your active bracket is unchanged.</p>
            ) : null}
            {tournament.betting ? (
              <p className="hint">
                Betting haul: +{tournament.pointsEarned ?? 0} weebucks this run · Bank {economy.points}{' '}
                weebucks
              </p>
            ) : null}
            {standings ? (
              <div className="placements-panel">
                {!showFullResults ? (
                  <>
                    <h3>Placements</h3>
                    <ol className="placements-list">
                      {standings.placements
                        .filter((entry) => entry.place <= PREVIEW_PLACE_LIMIT)
                        .flatMap(({ place, ids }) =>
                          ids.map((id) => (
                            <li key={id} className="placement-row">
                              <span className="placement-rank">{formatPlace(place)}</span>
                              <PlacementName
                                id={id}
                                outfitsById={outfitsById}
                                xpById={xpById}
                                skinLevels={skinLevels}
                              />
                            </li>
                          )),
                        )}
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
                            <PlacementName
                              id={id}
                              outfitsById={outfitsById}
                              xpById={xpById}
                              skinLevels={skinLevels}
                            />
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
            {!archiveReadOnly && !tournament.simulated ? (
              <div className="compare-actions">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={undoBracket}
                  disabled={!tournament.history.length}
                >
                  Undo last pick
                </button>
              </div>
            ) : null}
            {status ? <p className="hint">{status}</p> : null}
          </section>
        ) : tournament.simulated ? (
          <section className="dice-matchup">
            <div className="dice-matchup-top">
              <div className="dice-matchup-chips">
                {bracketState.current ? (
                  <span className="dice-chip is-round">
                    {roundLabel(bracket, bracketState.current)}
                  </span>
                ) : null}
                <span className="dice-chip">
                  {pageLabel(bracket.pages[currentPage] ?? page)}
                </span>
                {tournament.hardMode ? (
                  <span className="dice-chip is-hard">Hard Mode</span>
                ) : tournament.betting ? (
                  <span className="dice-chip is-bet">Betting</span>
                ) : null}
              </div>
              <div className="dice-matchup-stats">
                <span>
                  {tournament.history.length} picks · {tournament.entrants.length} skins
                </span>
                {tournament.betting ? (
                  <span className="dice-haul">+{tournament.pointsEarned ?? 0} weebucks</span>
                ) : null}
              </div>
            </div>

            {bracketState.current ? (
              <>
                <div className="dice-matchup-arena">
                  <p className="dice-matchup-kicker">Next roll</p>
                  <div className="matchup matchup-vs">
                    <span className="vs-side">
                      <SkinCard compact outfit={outfitsById.get(currentOutcome?.participants[0])} />
                      <BetMark
                        id={currentOutcome?.participants[0]}
                        starIds={new Set(tournament.starBetIds ?? [])}
                        boostIds={new Set(tournament.boostBetIds ?? [])}
                        rivalIds={new Set(tournament.rivalBetIds ?? [])}
                      />
                    </span>
                    <span className="versus dice-versus" aria-hidden="true">
                      VS
                    </span>
                    <span className="vs-side">
                      <SkinCard compact outfit={outfitsById.get(currentOutcome?.participants[1])} />
                      <BetMark
                        id={currentOutcome?.participants[1]}
                        starIds={new Set(tournament.starBetIds ?? [])}
                        boostIds={new Set(tournament.boostBetIds ?? [])}
                        rivalIds={new Set(tournament.rivalBetIds ?? [])}
                      />
                    </span>
                  </div>
                </div>

                <div className="dice-matchup-actions">
                  <button type="button" className="dice-action dice-action-roll" onClick={simNextMatch}>
                    {currentBetKind === 'super'
                      ? 'Watch super bet match'
                      : currentBetKind === 'bet'
                        ? 'Watch bet match'
                        : 'Roll match'}
                  </button>
                  {tournament.betting ? (
                    currentBetKind ? null : (
                      <button
                        type="button"
                        className="dice-action dice-action-round"
                        onClick={autoUntilBet}
                        title="Simulate rounds like Simulate round, stopping at the next bet or super bet match"
                      >
                        Auto
                      </button>
                    )
                  ) : (
                    <button type="button" className="dice-action dice-action-round" onClick={simNextRound}>
                      Simulate round
                    </button>
                  )}
                  {round1Pending ? (
                    <button type="button" className="dice-action dice-action-pools" onClick={simRound1Pools}>
                      Finish Round 1 pools
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="dice-action dice-action-all"
                    onClick={simAll}
                    disabled={!canSimulateAll}
                    title={
                      canSimulateAll
                        ? 'Simulate the entire bracket'
                        : 'Unlock in the Shop for 5000 weebucks'
                    }
                  >
                    {canSimulateAll ? 'Simulate all' : 'Simulate all (locked)'}
                  </button>
                </div>
              </>
            ) : null}
          </section>
        ) : (
          <section>
            <div className="progress">
              <p>
                {tournament.history.length} picks · {tournament.entrants.length} skins · {pageLabel(page)}
              </p>
            </div>
            {bracketState.current ? (
              <>
                <p className="match-label">
                  {roundLabel(bracket, bracketState.current)} · {pageLabel(bracket.pages[currentPage])}
                </p>
                <h2>Which skin advances?</h2>
                <div className="matchup">
                  <SkinCard
                    outfit={outfitsById.get(currentOutcome?.participants[0])}
                    onPick={() => chooseBracket(true)}
                  />
                  <span className="versus">vs</span>
                  <SkinCard
                    outfit={outfitsById.get(currentOutcome?.participants[1])}
                    onPick={() => chooseBracket(false)}
                  />
                </div>
                <div className="compare-actions">
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={undoBracket}
                    disabled={!tournament.history.length}
                  >
                    Undo
                  </button>
                </div>
              </>
            ) : null}
          </section>
        )}
        </div>
        <section className="bracket-view" hidden={playTab !== 'bracket'}>
          <div className="bracket-board">
            {page.sections.map((section) => {
              const rounds = section.rounds
                .filter((round) => round.length)
                .filter((round) => {
                  if (round[0].id !== 'GF2') return true;
                  const outcome = bracketState.outcomes.get('GF2');
                  if (!outcome || outcome.skipped) return false;
                  return outcome.winnerSlot != null || bracketState.current?.id === 'GF2';
                });
              if (!rounds.length) return null;
              return (
              <div key={section.title} className="bracket-section">
                <h3>{section.title}</h3>
                <div className="bracket-rounds">
                  {rounds.map((round) => (
                      <div key={round[0].id} className="bracket-round">
                        <h4>{roundLabel(bracket, round[0])}</h4>
                        <div className="bracket-matches">{round.map(renderMatch)}</div>
                      </div>
                    ))}
                </div>
              </div>
              );
            })}
          </div>
        </section>
        </div>
        <nav className="catalogue-sort-bar" aria-label="Tournament actions">
          <button
            type="button"
            className={`catalogue-sort-button ${playTab === 'match' ? 'active' : ''}`}
            onClick={() => setPlayTab('match')}
          >
            Match
          </button>
          <button
            type="button"
            className={`catalogue-sort-button ${playTab === 'status' ? 'active' : ''}`}
            onClick={() => setPlayTab('status')}
          >
            Skin Status
          </button>
          <button
            type="button"
            className={`catalogue-sort-button ${playTab === 'bracket' ? 'active' : ''}`}
            onClick={openBracketTab}
          >
            Bracket
          </button>
          {archiveReadOnly ? (
            <button type="button" className="catalogue-sort-button sort-divider" onClick={returnToHub}>
              Return
            </button>
          ) : (
            <button type="button" className="catalogue-sort-button sort-divider" onClick={() => setConfirmLeave(true)}>
              Main Menu
            </button>
          )}
        </nav>
        {confirmLeave ? (
          <div className="modal-overlay" role="presentation" onClick={() => setConfirmLeave(false)}>
            <div
              className="modal-dialog"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="leave-tournament-title"
              onClick={(event) => event.stopPropagation()}
            >
              <h2 id="leave-tournament-title">Leave this tournament?</h2>
              <p>Are you sure? Your progress will be saved.</p>
              <div className="modal-actions">
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => {
                    if (tournament && !archiveReadOnly) persistTournament(tournament);
                    onBack();
                  }}
                >
                  Yes
                </button>
                <button type="button" className="secondary-button" onClick={() => setConfirmLeave(false)}>
                  No
                </button>
              </div>
            </div>
          </div>
        ) : null}
        {confirmRestart ? (
          <div className="modal-overlay" role="presentation" onClick={() => setConfirmRestart(false)}>
            <div
              className="modal-dialog"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="restart-tournament-title"
              onClick={(event) => event.stopPropagation()}
            >
              <h2 id="restart-tournament-title">Start over?</h2>
              <p>Are you sure? All data and weebucks will be lost.</p>
              <div className="modal-actions">
                <button type="button" className="danger-button" onClick={abandonTournament}>
                  Yes
                </button>
                <button type="button" className="secondary-button" onClick={() => setConfirmRestart(false)}>
                  No
                </button>
              </div>
            </div>
          </div>
        ) : null}
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
