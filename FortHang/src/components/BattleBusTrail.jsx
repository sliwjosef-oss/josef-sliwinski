import { useEffect, useMemo, useRef, useState } from 'react';
import { playTrailMatch } from '../battleBus/engine';
import {
  BASE_DAILY_TRAIL_RUNS,
  TRAIL_FALLEN_PAYOUT,
  TRAIL_FALLEN_XP,
  TRAIL_SURVIVOR_PAYOUT,
  TRAIL_SURVIVOR_XP,
  canStartTrailRun,
  getDailyTrailRunsRemaining,
  getLockedTrailSkinIds,
  getTrailUnlockedBossItems,
  lockTrailSkins,
  settleTrailPayout,
  spendTrailRun,
} from '../utils/economy';
import { getOutfitIconFallbackSrc, getOutfitIconSrc } from '../utils/outfits';
import { awardXpAmounts } from '../utils/skinLevels';
import GuessStatus from './GuessStatus';

function SkinThumb({ outfit }) {
  if (!outfit) return <div className="icon-placeholder">?</div>;
  const src = getOutfitIconSrc(outfit);
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      onError={(event) => {
        const fallback = getOutfitIconFallbackSrc(outfit);
        if (fallback && event.currentTarget.src !== fallback) {
          event.currentTarget.src = fallback;
        }
      }}
    />
  );
}

export default function BattleBusTrail({
  outfits,
  guessedSkinIds,
  sidekicks,
  economy,
  onEconomyChange,
  skinLevels,
  onSkinLevelsChange,
  onBack,
  onOpenShop,
}) {
  const discovered = useMemo(
    () => outfits.filter((outfit) => guessedSkinIds.includes(outfit.id)),
    [outfits, guessedSkinIds],
  );
  const ownedSidekicks = useMemo(() => {
    const counts = new Map();
    for (const id of economy.ownedSidekickIds || []) {
      counts.set(id, (counts.get(id) || 0) + 1);
    }
    return sidekicks.filter((sidekick) => counts.has(sidekick.id));
  }, [sidekicks, economy.ownedSidekickIds]);

  const lockedIds = useMemo(() => getLockedTrailSkinIds(economy), [economy]);
  const runsLeft = getDailyTrailRunsRemaining(economy);

  const [screen, setScreen] = useState('select'); // select | play | result
  const [partyIds, setPartyIds] = useState([]);
  const [sidekickId, setSidekickId] = useState(null);
  const [search, setSearch] = useState('');
  const [logLines, setLogLines] = useState([]);
  const [choices, setChoices] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const chooseRef = useRef(null);
  const logEndRef = useRef(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ block: 'end' });
  }, [logLines, choices]);

  const visibleSkins = useMemo(() => {
    const query = search.trim().toLowerCase();
    return discovered.filter((outfit) => {
      if (!query) return true;
      return String(outfit.name || '')
        .toLowerCase()
        .includes(query);
    });
  }, [discovered, search]);

  const toggleParty = (id) => {
    if (lockedIds.has(id) || busy) return;
    setPartyIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 4) return current;
      return [...current, id];
    });
  };

  const startRun = async () => {
    if (busy || partyIds.length !== 4 || !sidekickId) return;
    if (!canStartTrailRun(economy)) {
      window.alert('No Battle Bus Trail runs left today.');
      return;
    }
    if (partyIds.some((id) => lockedIds.has(id))) {
      window.alert('One of those skins is locked until Monday.');
      return;
    }

    let nextEconomy = spendTrailRun(economy);
    if (!nextEconomy.ok) {
      onEconomyChange(nextEconomy.economy);
      window.alert(nextEconomy.reason);
      return;
    }
    nextEconomy = { ok: true, economy: lockTrailSkins(partyIds, nextEconomy.economy) };
    onEconomyChange(nextEconomy.economy);

    const party = partyIds.map((id) => outfits.find((outfit) => outfit.id === id)).filter(Boolean);
    const sidekick = sidekicks.find((entry) => entry.id === sidekickId);
    if (party.length !== 4 || !sidekick) {
      window.alert('Could not start — missing skins or sidekick.');
      return;
    }

    setBusy(true);
    setScreen('play');
    setResult(null);
    setLogLines([]);
    setChoices(null);

    const log = (line) => {
      setLogLines((current) => [...current, String(line)]);
    };
    const choose = (options) =>
      new Promise((resolve) => {
        chooseRef.current = resolve;
        setChoices(options);
      });

    try {
      const match = await playTrailMatch({
        partyNames: party.map((outfit) => outfit.name),
        sidekickName: sidekick.name,
        unlockedBossItems: getTrailUnlockedBossItems(nextEconomy.economy),
        log,
        choose,
      });

      const survivorNames = new Set(match.survivors);
      const fallenCount = match.fallen.length;
      const survivorCount = match.survivors.length;
      const payout = settleTrailPayout(
        { survivors: survivorCount, fallen: fallenCount },
        nextEconomy.economy,
      );
      onEconomyChange(payout.economy);

      const xpAwards = [];
      for (const outfit of party) {
        const survived = survivorNames.has(outfit.name);
        xpAwards.push({
          id: outfit.id,
          amount: survived ? TRAIL_SURVIVOR_XP : TRAIL_FALLEN_XP,
        });
      }
      const xpResult = awardXpAmounts(skinLevels, xpAwards);
      onSkinLevelsChange?.(xpResult.levels);

      setResult({
        ...match,
        weebucks: payout.amount,
        survivorCount,
        fallenCount,
        xpAwards,
      });
      setScreen('result');
    } catch (error) {
      log(`Something went wrong: ${error.message || error}`);
      setScreen('select');
    } finally {
      setChoices(null);
      chooseRef.current = null;
      setBusy(false);
    }
  };

  const pickChoice = (option) => {
    const resolve = chooseRef.current;
    if (!resolve) return;
    chooseRef.current = null;
    setChoices(null);
    resolve(option);
  };

  if (screen === 'play' || screen === 'result') {
    return (
      <div className="fort-sort fort-sort-screen trail-screen">
        <header className="catalogue-header">
          <h1>Battle Bus Trail</h1>
          <GuessStatus economy={economy} onEconomyChange={onEconomyChange} />
        </header>
        <div className="catalogue-scroll trail-log" tabIndex={0} aria-label="Trail log">
          {logLines.map((line, index) => (
            <p key={`${index}-${line.slice(0, 24)}`} className="trail-log-line">
              {line}
            </p>
          ))}
          <div ref={logEndRef} />
        </div>
        {screen === 'play' && choices ? (
          <div className="trail-choices">
            {choices.map((option) => (
              <button
                key={option}
                type="button"
                className="primary-button"
                onClick={() => pickChoice(option)}
              >
                {option}
              </button>
            ))}
          </div>
        ) : null}
        {screen === 'result' && result ? (
          <div className="trail-result">
            <h2>{result.won ? 'Victory Royale!' : `Placed #${result.placement}`}</h2>
            <p>
              +{result.weebucks} weebucks ({result.survivorCount} alive × {TRAIL_SURVIVOR_PAYOUT},{' '}
              {result.fallenCount} fallen × {TRAIL_FALLEN_PAYOUT})
            </p>
            <p>
              Skin XP: survivors +{TRAIL_SURVIVOR_XP}, fallen +{TRAIL_FALLEN_XP}
            </p>
            <div className="import-actions">
              <button type="button" className="primary-button" onClick={() => setScreen('select')}>
                Back to squad select
              </button>
              <button type="button" className="ghost-button" onClick={onBack}>
                Main Menu
              </button>
            </div>
          </div>
        ) : null}
        {screen === 'play' && !choices ? (
          <p className="hint">Resolving...</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="fort-sort fort-sort-screen trail-screen">
      <header className="catalogue-header betting-header">
        <div className="betting-header-row">
          <h1>Battle Bus Trail</h1>
          <div className="betting-header-stats">
            <span>Weebucks: {economy.points}</span>
            <span>
              Runs {runsLeft}/{BASE_DAILY_TRAIL_RUNS}
            </span>
          </div>
        </div>
        <p className="hint">
          Pick 4 discovered skins and 1 owned sidekick. Survive the island. Alive members pay{' '}
          {TRAIL_SURVIVOR_PAYOUT} weebucks, fallen pay {TRAIL_FALLEN_PAYOUT}. Skins lock until Monday.
        </p>
        <GuessStatus economy={economy} onEconomyChange={onEconomyChange} />
      </header>

      <div className="trail-start-bar">
        <button
          type="button"
          className="betting-start"
          disabled={partyIds.length !== 4 || !sidekickId || runsLeft <= 0 || busy}
          onClick={startRun}
        >
          Drop in ({partyIds.length}/4 skins · {sidekickId ? 'sidekick ready' : 'need sidekick'})
        </button>
        <div className="import-actions">
          <button type="button" className="ghost-button" onClick={onOpenShop}>
            Shop
          </button>
          <button type="button" className="ghost-button" onClick={onBack}>
            Main Menu
          </button>
        </div>
      </div>

      <div className="catalogue-scroll" tabIndex={0} aria-label="Trail squad select">
        <h2 className="shop-section-title">Sidekick</h2>
        {ownedSidekicks.length === 0 ? (
          <p className="hint">Buy sidekick rolls in the Shop first.</p>
        ) : (
          <div className="catalogue-grid fort-sort-select-grid">
            {ownedSidekicks.map((sidekick) => (
              <button
                key={sidekick.id}
                type="button"
                className={`catalogue-card fort-sort-pick revealed ${
                  sidekickId === sidekick.id ? 'is-selected' : ''
                }`}
                onClick={() => setSidekickId(sidekick.id)}
              >
                <p className="catalogue-name">{sidekick.name}</p>
                <span className="fort-sort-check" aria-hidden="true">
                  {sidekickId === sidekick.id ? '✓' : ''}
                </span>
              </button>
            ))}
          </div>
        )}

        <h2 className="shop-section-title">Squad skins</h2>
        <div className="betting-search-row" style={{ marginBottom: 12 }}>
          <input
            type="search"
            className="betting-skin-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search skins"
            aria-label="Search skins"
          />
          <button
            type="button"
            className="ghost-button"
            onClick={() => setPartyIds([])}
            disabled={!partyIds.length}
          >
            Clear squad
          </button>
        </div>
        <div className="catalogue-grid fort-sort-select-grid">
          {visibleSkins.map((outfit) => {
            const locked = lockedIds.has(outfit.id);
            const selected = partyIds.includes(outfit.id);
            return (
              <button
                key={outfit.id}
                type="button"
                className={`catalogue-card fort-sort-pick revealed ${selected ? 'is-selected' : ''} ${
                  locked ? 'is-locked' : ''
                }`}
                onClick={() => toggleParty(outfit.id)}
                disabled={locked || (partyIds.length >= 4 && !selected)}
              >
                <span className="catalogue-number">{outfit.number}.</span>
                <div className="catalogue-image-wrap">
                  <SkinThumb outfit={outfit} />
                </div>
                <p className="catalogue-name">{outfit.name}</p>
                <span className="fort-sort-check" aria-hidden="true">
                  {locked ? '🔒' : selected ? '✓' : ''}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
