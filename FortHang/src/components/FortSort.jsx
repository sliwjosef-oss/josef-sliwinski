import { useEffect, useMemo, useState } from 'react';
import {
  BYE,
  buildPlayerRun,
  computeStandings,
  createBracket,
  formatPlace,
  pageLabel,
  resolveBracket,
  roundLabel,
} from '../fortSort/bracket';
import { estimateRemaining, replay, shuffle } from '../fortSort/sorter';
import {
  clearBracketProgress,
  clearRankProgress,
  loadArchive,
  loadBracketProgress,
  loadRankProgress,
  loadSelectedIds,
  loadSortMode,
  newArchiveId,
  saveArchive,
  saveBracketProgress,
  saveRankProgress,
  saveSelectedIds,
  saveSortMode,
} from '../fortSort/storage';
import { getOutfitIconFallbackSrc, getOutfitIconSrc } from '../utils/outfits';
import { isSkinGuessed } from '../utils/progress';
import { sortOutfitsByNumber } from '../utils/seasonSort';
import '../fortSort/FortSort.css';

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

function SkinCard({ outfit, onPick, placeLabel }) {
  if (!outfit) return null;
  return (
    <button type="button" className={`skin-card ${placeLabel ? 'podium-card' : ''}`} onClick={onPick}>
      {placeLabel ? <p className="podium-place">{placeLabel}</p> : null}
      <SkinIcon outfit={outfit} />
      <p className="skin-name">{outfit.name}</p>
      <p className="skin-meta">
        {outfit.chapter && outfit.season ? `Chapter ${outfit.chapter} · Season ${outfit.season}` : ''}
      </p>
    </button>
  );
}

function SelectScreen({
  discovered,
  selectedIds,
  setSelectedIds,
  mode,
  setMode,
  onStart,
  onOpenArchive,
  onBack,
}) {
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allSelected = discovered.length > 0 && selectedIds.length === discovered.length;

  const toggle = (id) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

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
        </nav>
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
          : 'Pick discovered skins, then run a double-elimination bracket.'}{' '}
        Only skins you have discovered in FortHang can be used.
      </p>

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

      {discovered.length === 0 ? (
        <p className="hint">Discover skins in hangman first, then come back to FortSort.</p>
      ) : (
        <div className="catalogue-grid fort-sort-select-grid">
          {discovered.map((outfit) => {
            const selected = selectedSet.has(outfit.id);
            return (
              <button
                key={outfit.id}
                type="button"
                className={`catalogue-card revealed fort-sort-pick ${selected ? 'is-selected' : ''}`}
                onClick={() => toggle(outfit.id)}
              >
                <span className="catalogue-number">{outfit.number}.</span>
                <div className="catalogue-image-wrap">
                  <SkinIcon outfit={outfit} className="catalogue-image" />
                </div>
                <p className="catalogue-name">{outfit.name}</p>
                <span className="fort-sort-check" aria-hidden="true">
                  {selected ? '✓' : ''}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="import-actions" style={{ marginTop: 20 }}>
        <button
          type="button"
          className="primary-button"
          disabled={selectedIds.length < 2}
          onClick={onStart}
        >
          {mode === 'rank'
            ? `Start ranking ${selectedIds.length} skins`
            : `Start bracket with ${selectedIds.length} skins`}
        </button>
      </div>
    </div>
  );
}

export default function FortSort({ outfits, guessedSkinIds, onBack }) {
  const outfitsById = useMemo(() => new Map(outfits.map((outfit) => [outfit.id, outfit])), [outfits]);
  const discovered = useMemo(
    () => sortOutfitsByNumber(outfits.filter((outfit) => isSkinGuessed(guessedSkinIds, outfit))),
    [outfits, guessedSkinIds],
  );
  const discoveredIds = useMemo(() => new Set(discovered.map((outfit) => outfit.id)), [discovered]);

  const [mode, setMode] = useState(loadSortMode);
  const [selectedIds, setSelectedIds] = useState(() =>
    loadSelectedIds().filter((id) => discoveredIds.has(id) || discovered.some((outfit) => outfit.id === id)),
  );
  const [screen, setScreen] = useState('select'); // select | play | archive
  const [rankProgress, setRankProgress] = useState(null);
  const [tournament, setTournament] = useState(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [followPage, setFollowPage] = useState(true);
  const [archiveReadOnly, setArchiveReadOnly] = useState(false);
  const [showFullResults, setShowFullResults] = useState(false);
  const [playerRunId, setPlayerRunId] = useState(null);
  const [status, setStatus] = useState('');

  // Keep selection limited to currently discovered skins.
  useEffect(() => {
    setSelectedIds((current) => {
      const next = current.filter((id) => discoveredIds.has(id));
      if (next.length !== current.length) saveSelectedIds(next);
      return next;
    });
  }, [discoveredIds]);

  useEffect(() => {
    saveSortMode(mode);
  }, [mode]);

  useEffect(() => {
    saveSelectedIds(selectedIds);
  }, [selectedIds]);

  // Resume active runs if their skins are still discovered.
  useEffect(() => {
    const savedRank = loadRankProgress();
    if (savedRank?.order.every((id) => discoveredIds.has(id))) {
      setRankProgress(savedRank);
      if (mode === 'rank') setScreen('play');
    }
    const savedBracket = loadBracketProgress();
    if (savedBracket?.entrants.every((id) => discoveredIds.has(id))) {
      setTournament({
        ...savedBracket,
        bracket: createBracket(savedBracket.entrants, savedBracket.version ?? 4),
      });
      if (mode === 'bracket') setScreen('play');
    }
    // Only on mount / discovery set identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rankState = useMemo(
    () => (rankProgress ? replay(rankProgress.order, rankProgress.decisions) : null),
    [rankProgress],
  );

  const bracketState = useMemo(() => {
    if (!tournament) return null;
    return resolveBracket(tournament.bracket, Object.fromEntries(tournament.history));
  }, [tournament]);

  const standings = useMemo(() => {
    if (!tournament || !bracketState?.done) return null;
    return computeStandings(tournament.bracket, bracketState.outcomes, bracketState);
  }, [tournament, bracketState]);

  const start = () => {
    if (selectedIds.length < 2) return;
    setArchiveReadOnly(false);
    setShowFullResults(false);
    setPlayerRunId(null);
    setStatus('');
    if (mode === 'rank') {
      const progress = { order: shuffle(selectedIds), decisions: [] };
      setRankProgress(progress);
      saveRankProgress(progress);
      setTournament(null);
    } else {
      const next = {
        entrants: shuffle(selectedIds),
        history: [],
        version: 4,
        archiveId: null,
        bracket: null,
      };
      next.bracket = createBracket(next.entrants, 4);
      setTournament(next);
      saveBracketProgress(next);
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
    if (!tournament || archiveReadOnly || !bracketState?.current) return;
    const next = {
      ...tournament,
      history: [...tournament.history, [bracketState.current.id, firstWins ? 0 : 1]],
    };
    setTournament(next);
    saveBracketProgress(next);
    setFollowPage(true);
  };

  const undoBracket = () => {
    if (!tournament?.history.length || archiveReadOnly) return;
    const next = { ...tournament, history: tournament.history.slice(0, -1) };
    setTournament(next);
    saveBracketProgress(next);
    setFollowPage(true);
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
        version: tournament.version ?? 4,
        championId: bracketState.champion,
        runnerUpId: bracketState.runnerUp,
      };
      const entries = loadArchive().filter((item) => item.id !== id);
      entries.unshift(entry);
      saveArchive(entries);
      const next = { ...tournament, archiveId: id };
      setTournament(next);
      if (!archiveReadOnly) saveBracketProgress(next);
      if (!quiet) setStatus('Saved on this device.');
    } catch (error) {
      if (!quiet) setStatus(`Could not save: ${error.message}`);
    }
  };

  useEffect(() => {
    if (screen === 'play' && mode === 'bracket' && bracketState?.done && !archiveReadOnly && tournament && !tournament.archiveId) {
      saveFinishedTournament(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bracketState?.done, screen, mode]);

  const startOver = () => {
    if (archiveReadOnly) {
      setArchiveReadOnly(false);
      const saved = loadBracketProgress();
      if (saved?.entrants.every((id) => discoveredIds.has(id))) {
        setTournament({ ...saved, bracket: createBracket(saved.entrants, saved.version ?? 4) });
        setScreen('play');
      } else {
        setTournament(null);
        setScreen('select');
      }
      setStatus('');
      return;
    }
    if (!confirm(`Start over? This clears your current ${mode === 'rank' ? 'ranking' : 'bracket'}. Saved tournaments are kept.`)) {
      return;
    }
    if (mode === 'bracket' && bracketState?.done) saveFinishedTournament(true);
    if (mode === 'rank') {
      clearRankProgress();
      setRankProgress(null);
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
      version: entry.version ?? 4,
      archiveId: entry.id,
      bracket: createBracket(entry.entrants, entry.version ?? 4),
    });
    setMode('bracket');
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
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
          mode={mode}
          setMode={(next) => {
            setMode(next);
            setScreen('select');
          }}
          onStart={start}
          onOpenArchive={() => setScreen('archive')}
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

  // Bracket play
  if (mode === 'bracket' && tournament && bracketState) {
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
                  if (bracketState.current?.id === match.id && !archiveReadOnly) chooseBracket(slot === 0);
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
                    <span>{outfit.name}</span>
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

        {bracketState.done ? (
          <section className="champion-view-inline">
            <h2>{archiveReadOnly ? 'Saved tournament' : 'Tournament complete'}</h2>
            {archiveReadOnly ? (
              <p className="resume-note">Viewing a saved tournament. Your active bracket is unchanged.</p>
            ) : null}
            <div className="podium">
              <SkinCard outfit={outfitsById.get(bracketState.champion)} placeLabel="1st" />
              <SkinCard outfit={outfitsById.get(bracketState.runnerUp)} placeLabel="2nd" />
            </div>
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
              {!archiveReadOnly ? (
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
                    outfit={outfitsById.get(bracketState.outcomes.get(bracketState.current.id).participants[0])}
                    onPick={() => chooseBracket(true)}
                  />
                  <span className="versus">vs</span>
                  <SkinCard
                    outfit={outfitsById.get(bracketState.outcomes.get(bracketState.current.id).participants[1])}
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
