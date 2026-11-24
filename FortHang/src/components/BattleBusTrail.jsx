import { useEffect, useMemo, useRef, useState } from 'react';
import { playTrailMatch } from '../battleBus/engine';
import {
  TRAIL_FALLEN_PAYOUT,
  TRAIL_FALLEN_XP,
  TRAIL_SURVIVOR_PAYOUT,
  TRAIL_SURVIVOR_XP,
  getTrailUnlockedBossItems,
  settleTrailPayout,
} from '../utils/economy';
import { getOutfitIconFallbackSrc, getOutfitIconSrc } from '../utils/outfits';
import { awardXpAmounts } from '../utils/skinLevels';

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

function EventIconImg({ outfit, iconUrls = [], alt = '', fallback = null }) {
  const [urlIndex, setUrlIndex] = useState(0);
  if (outfit) {
    return <SkinThumb outfit={outfit} />;
  }
  const src = iconUrls[urlIndex];
  if (!src) return fallback;
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => {
        setUrlIndex((current) => current + 1);
      }}
    />
  );
}

const LOG_LINE_MS = 2000;

function EventVisualPanel({ visual }) {
  if (!visual) return null;

  const outfits = visual.outfits || [];
  const isItem = visual.kind === 'item';
  const isEnemy = visual.kind === 'enemy';
  const isDeath = visual.kind === 'death' || visual.crossedOut;
  const showIcons = outfits.length > 0 || (isItem && visual.iconUrls?.length);
  const enemyPct =
    isEnemy && visual.maxHp > 0
      ? Math.max(0, Math.min(100, Math.round((visual.hp / visual.maxHp) * 100)))
      : 0;

  return (
    <div
      className={`trail-event-panel kind-${visual.kind || 'skins'} ${isDeath ? 'is-death' : ''}`}
      aria-label="Event images"
    >
      <p className="trail-event-caption">{visual.caption}</p>
      {isEnemy ? (
        <div className="trail-enemy-hud">
          <div className="trail-enemy-meta">
            <strong>{visual.enemyLabel || 'Enemy'}</strong>
            <span>
              {Math.max(0, visual.hp ?? 0)}/{visual.maxHp ?? 0}
            </span>
          </div>
          <div className="trail-enemy-bar" aria-hidden="true">
            <span style={{ width: `${enemyPct}%` }} />
          </div>
        </div>
      ) : null}
      <div
        className={`trail-event-grid count-${Math.min(
          4,
          Math.max(1, outfits.length || (isItem ? 1 : 0)),
        )}`}
      >
        {outfits.map((outfit) => (
          <div
            key={outfit.id || outfit.name}
            className={`trail-event-card ${isDeath ? 'is-crossed' : ''}`}
          >
            <div className="trail-event-art">
              <EventIconImg key={outfit.id || outfit.name} outfit={outfit} alt={outfit.name} />
              {isDeath ? <span className="trail-squad-x" aria-hidden="true" /> : null}
            </div>
            <p className="trail-event-name">{outfit.name}</p>
          </div>
        ))}
        {isItem ? (
          <div className="trail-event-card is-item">
            <div className="trail-event-art">
              <EventIconImg
                key={visual.itemName || 'item'}
                iconUrls={visual.iconUrls || []}
                alt={visual.itemName || ''}
                fallback={
                  <div className="trail-item-fallback">
                    <span>{visual.rarity || 'Loot'}</span>
                    <strong>{visual.itemName}</strong>
                  </div>
                }
              />
            </div>
            <p className="trail-event-name">{visual.itemName}</p>
          </div>
        ) : null}
        {!showIcons && !isItem ? (
          <div className={`trail-event-card ${isDeath ? 'is-crossed' : ''}`}>
            <div className="trail-event-art">
              <div className="icon-placeholder">{isDeath ? 'X' : '?'}</div>
              {isDeath ? <span className="trail-squad-x" aria-hidden="true" /> : null}
            </div>
            <p className="trail-event-name">{visual.memberName || visual.enemyLabel || ''}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SquadStatusBar({ members }) {
  return (
    <div className="trail-squad-bar" aria-label="Squad status">
      {members.map((member) => {
        const hp = Math.max(0, Math.min(100, member.hp ?? 0));
        const shield = Math.max(0, Math.min(100, member.shield ?? 0));
        const empty = member.empty;
        const dead = !empty && !member.alive;
        return (
          <div
            key={member.key}
            className={`trail-squad-member ${empty ? 'is-empty' : ''} ${dead ? 'is-fallen' : ''} ${
              member.sidekick ? 'is-sidekick' : ''
            }`}
          >
            <div className="trail-squad-icon">
              {member.outfit || member.sidekickOutfit ? (
                <SkinThumb outfit={member.outfit || member.sidekickOutfit} />
              ) : (
                <div className="icon-placeholder">{member.sidekick ? 'S' : '?'}</div>
              )}
              {dead ? <span className="trail-squad-x" aria-hidden="true" /> : null}
            </div>
            <p className="trail-squad-name" title={member.name || ''}>
              {empty ? (member.sidekick ? 'Sidekick' : 'Skin') : member.name}
            </p>
            <div className="trail-bars" aria-hidden={empty}>
              <div className="trail-bar trail-bar-shield">
                <span style={{ width: `${empty ? 0 : shield}%` }} />
              </div>
              <div className="trail-bar trail-bar-hp">
                <span style={{ width: `${empty ? 0 : hp}%` }} />
              </div>
            </div>
            <p className="trail-squad-nums">
              {empty ? '—' : dead ? 'OUT' : `${hp}/${shield}`}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function buildSelectMembers({ partyIds, sidekickId, outfits, sidekicks }) {
  const slots = [0, 1, 2, 3].map((index) => {
    const id = partyIds[index];
    const outfit = id ? outfits.find((entry) => entry.id === id) : null;
    return {
      key: id || `slot-${index}`,
      empty: !outfit,
      name: outfit?.name || '',
      outfit,
      sidekick: false,
      hp: outfit ? 100 : 0,
      shield: 0,
      alive: Boolean(outfit),
    };
  });
  const sidekick = sidekickId ? sidekicks.find((entry) => entry.id === sidekickId) : null;
  slots.push({
    key: sidekick?.id || 'sidekick-slot',
    empty: !sidekick,
    name: sidekick?.name || '',
    sidekickOutfit: sidekick,
    sidekick: true,
    hp: sidekick ? 100 : 0,
    shield: 0,
    alive: Boolean(sidekick),
  });
  return slots;
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

  const [screen, setScreen] = useState('select'); // select | play | result
  const [partyIds, setPartyIds] = useState([]);
  const [sidekickId, setSidekickId] = useState(null);
  const [search, setSearch] = useState('');
  const [logLines, setLogLines] = useState([]);
  const [choices, setChoices] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [liveSquad, setLiveSquad] = useState(null);
  const [eventVisual, setEventVisual] = useState(null);
  const chooseRef = useRef(null);
  const logEndRef = useRef(null);
  const outfitByNameRef = useRef(new Map());
  const pendingLogRef = useRef([]);
  const logTimerRef = useRef(null);
  const logWaitersRef = useRef([]);
  const forfeitedRef = useRef(false);
  const runActiveRef = useRef(false);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ block: 'end' });
  }, [logLines, choices]);

  useEffect(
    () => () => {
      if (logTimerRef.current) {
        clearTimeout(logTimerRef.current);
        logTimerRef.current = null;
      }
    },
    [],
  );

  const flushLogWaiters = () => {
    if (pendingLogRef.current.length || logTimerRef.current) return;
    const waiters = logWaitersRef.current;
    logWaitersRef.current = [];
    for (const resolve of waiters) resolve();
  };

  const pumpLogQueue = () => {
    if (logTimerRef.current || forfeitedRef.current) return;
    const releaseNext = () => {
      if (forfeitedRef.current) {
        logTimerRef.current = null;
        pendingLogRef.current = [];
        flushLogWaiters();
        return;
      }
      if (!pendingLogRef.current.length) {
        logTimerRef.current = null;
        flushLogWaiters();
        return;
      }
      const next = pendingLogRef.current.shift();
      setLogLines((current) => [...current, next]);
      if (pendingLogRef.current.length) {
        logTimerRef.current = setTimeout(releaseNext, LOG_LINE_MS);
      } else {
        logTimerRef.current = null;
        flushLogWaiters();
      }
    };
    releaseNext();
  };

  const enqueueLog = (line) => {
    if (forfeitedRef.current) return;
    pendingLogRef.current.push(String(line));
    pumpLogQueue();
  };

  const waitForLogDrain = () =>
    new Promise((resolve) => {
      if (!pendingLogRef.current.length && !logTimerRef.current) {
        resolve();
        return;
      }
      logWaitersRef.current.push(resolve);
    });

  const clearPlayLog = () => {
    pendingLogRef.current = [];
    if (logTimerRef.current) {
      clearTimeout(logTimerRef.current);
      logTimerRef.current = null;
    }
    setLogLines([]);
    flushLogWaiters();
  };

  const visibleSkins = useMemo(() => {
    const query = search.trim().toLowerCase();
    return discovered.filter((outfit) => {
      if (!query) return true;
      return String(outfit.name || '')
        .toLowerCase()
        .includes(query);
    });
  }, [discovered, search]);

  const selectMembers = useMemo(
    () => buildSelectMembers({ partyIds, sidekickId, outfits, sidekicks: ownedSidekicks }),
    [partyIds, sidekickId, outfits, ownedSidekicks],
  );

  const playMembers = useMemo(() => {
    if (!liveSquad?.length) return selectMembers;
    return liveSquad.map((member, index) => {
      const outfit =
        outfitByNameRef.current.get(member.name) ||
        (member.sidekick
          ? ownedSidekicks.find((entry) => entry.name === member.name)
          : outfits.find((entry) => entry.name === member.name));
      return {
        key: `${member.name}-${index}`,
        empty: false,
        name: member.name,
        outfit: member.sidekick ? null : outfit,
        sidekickOutfit: member.sidekick ? outfit : null,
        sidekick: member.sidekick,
        hp: member.hp,
        shield: member.shield,
        alive: member.alive,
      };
    });
  }, [liveSquad, selectMembers, outfits, ownedSidekicks]);

  const headerMembers = screen === 'select' ? selectMembers : playMembers;

  const toggleParty = (id) => {
    if (busy) return;
    setPartyIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 4) return current;
      return [...current, id];
    });
  };

  const startRun = async () => {
    if (busy || partyIds.length !== 4 || !sidekickId) return;

    const party = partyIds.map((id) => outfits.find((outfit) => outfit.id === id)).filter(Boolean);
    const sidekick = sidekicks.find((entry) => entry.id === sidekickId);
    if (party.length !== 4 || !sidekick) {
      window.alert('Could not start — missing skins or sidekick.');
      return;
    }

    const nameMap = new Map();
    for (const outfit of party) nameMap.set(outfit.name, outfit);
    nameMap.set(sidekick.name, sidekick);
    outfitByNameRef.current = nameMap;

    forfeitedRef.current = false;
    runActiveRef.current = true;
    setBusy(true);
    setScreen('play');
    setResult(null);
    clearPlayLog();
    setChoices(null);
    setEventVisual(null);
    setLiveSquad(
      [...party.map((outfit) => ({ name: outfit.name, sidekick: false })), { name: sidekick.name, sidekick: true }].map(
        (entry) => ({
          ...entry,
          hp: 100,
          shield: 0,
          alive: true,
          afkTurns: 0,
        }),
      ),
    );

    const log = (line) => {
      enqueueLog(line);
    };
    const choose = async (options) => {
      await waitForLogDrain();
      if (forfeitedRef.current) {
        const err = new Error('forfeited');
        err.code = 'forfeited';
        throw err;
      }
      return new Promise((resolve, reject) => {
        chooseRef.current = { resolve, reject };
        setChoices(options);
      });
    };

    try {
      const match = await playTrailMatch({
        partyNames: party.map((outfit) => outfit.name),
        sidekickName: sidekick.name,
        outfits,
        partyOutfits: party,
        unlockedBossItems: getTrailUnlockedBossItems(economy),
        log,
        choose,
        onSquadUpdate: setLiveSquad,
        onEventVisual: (visual) => {
          if (forfeitedRef.current) return;
          setEventVisual(visual);
        },
      });

      if (forfeitedRef.current) return;

      await waitForLogDrain();

      const survivorNames = new Set(match.survivors);
      const fallenCount = match.fallen.length;
      const survivorCount = match.survivors.length;
      const payout = settleTrailPayout(
        { survivors: survivorCount, fallen: fallenCount },
        economy,
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
      if (error?.code === 'forfeited' || forfeitedRef.current) {
        // abandoned — no payout
      } else {
        enqueueLog(`Something went wrong: ${error.message || error}`);
        await waitForLogDrain();
      }
      setScreen('select');
      setLiveSquad(null);
      setEventVisual(null);
      clearPlayLog();
    } finally {
      runActiveRef.current = false;
      setChoices(null);
      chooseRef.current = null;
      setBusy(false);
    }
  };

  const pickChoice = (option) => {
    const pending = chooseRef.current;
    if (!pending) return;
    chooseRef.current = null;
    setChoices(null);
    clearPlayLog();
    setEventVisual(null);
    pending.resolve(option);
  };

  const forfeitRun = () => {
    if (!runActiveRef.current || screen !== 'play') return;
    const ok = window.confirm('Forfeit this Battle Bus Trail run and return to squad select?');
    if (!ok) return;
    forfeitedRef.current = true;
    pendingLogRef.current = [];
    if (logTimerRef.current) {
      clearTimeout(logTimerRef.current);
      logTimerRef.current = null;
    }
    flushLogWaiters();
    const pending = chooseRef.current;
    chooseRef.current = null;
    setChoices(null);
    setEventVisual(null);
    clearPlayLog();
    if (pending?.reject) {
      const err = new Error('forfeited');
      err.code = 'forfeited';
      pending.reject(err);
    } else {
      setScreen('select');
      setLiveSquad(null);
      setBusy(false);
      runActiveRef.current = false;
    }
  };

  const backToSelect = () => {
    setScreen('select');
    setLiveSquad(null);
    setEventVisual(null);
    setResult(null);
    clearPlayLog();
  };

  if (screen === 'play' || screen === 'result') {
    return (
      <div className="fort-sort fort-sort-screen trail-screen">
        <header className="catalogue-header trail-header">
          <div className="trail-header-top">
            <h1>Battle Bus Trail</h1>
            {screen === 'play' ? (
              <button type="button" className="trail-forfeit-button" onClick={forfeitRun}>
                Forfeit run
              </button>
            ) : null}
          </div>
          <SquadStatusBar members={headerMembers} />
        </header>
        <EventVisualPanel visual={eventVisual} />
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
              <button type="button" className="primary-button" onClick={backToSelect}>
                Back to squad select
              </button>
              <button type="button" className="ghost-button" onClick={onBack}>
                Main Menu
              </button>
            </div>
          </div>
        ) : null}
        {screen === 'play' && !choices ? <p className="hint">Writing...</p> : null}
      </div>
    );
  }

  return (
    <div className="fort-sort fort-sort-screen trail-screen">
      <header className="catalogue-header trail-header">
        <h1>Battle Bus Trail</h1>
        <SquadStatusBar members={headerMembers} />
        <p className="hint">
          Pick 4 discovered skins and 1 owned sidekick. Alive members pay {TRAIL_SURVIVOR_PAYOUT}{' '}
          weebucks, fallen pay {TRAIL_FALLEN_PAYOUT}.
        </p>
      </header>

      <div className="trail-start-bar">
        <button
          type="button"
          className="betting-start"
          disabled={partyIds.length !== 4 || !sidekickId || busy}
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
            const selected = partyIds.includes(outfit.id);
            return (
              <button
                key={outfit.id}
                type="button"
                className={`catalogue-card fort-sort-pick revealed ${selected ? 'is-selected' : ''}`}
                onClick={() => toggleParty(outfit.id)}
                disabled={partyIds.length >= 4 && !selected}
              >
                <span className="catalogue-number">{outfit.number}.</span>
                <div className="catalogue-image-wrap">
                  <SkinThumb outfit={outfit} />
                </div>
                <p className="catalogue-name">{outfit.name}</p>
                <span className="fort-sort-check" aria-hidden="true">
                  {selected ? '✓' : ''}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
