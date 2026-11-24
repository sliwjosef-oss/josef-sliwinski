import { useEffect, useMemo, useRef, useState } from 'react';
import { playTrailMatch } from '../battleBus/engine';
import {
  TRAIL_FALLEN_XP,
  TRAIL_SURVIVOR_XP,
  canStartTrailRun,
  getDailyTrailRunsRemaining,
  getLockedTrailSkinIds,
  getTrailFightResist,
  getTrailStormResist,
  getTrailUnlockedBossItems,
  getTrailUnlockedEvents,
  lockTrailSkins,
  settleTrailPayout,
  spendTrailRun,
} from '../utils/economy';
import { getOutfitIconFallbackSrc, getOutfitIconSrc } from '../utils/outfits';
import { groupOutfitsBySeason, sortOutfitsByNumber } from '../utils/seasonSort';
import { groupOutfitsBySeries } from '../utils/seriesSort';
import {
  MAX_SKIN_LEVEL,
  awardXpAmounts,
  getSkinLevel,
  getTrailFightDamageResist,
  getTrailStartHp,
  getTrailStartHpBonus,
  getTrailStormDamageResist,
  sortOutfitsByLevel,
} from '../utils/skinLevels';
import '../fortSort/FortSort.css';

const SELECT_SORT = {
  NUMBER: 'number',
  SEASON: 'season',
  SERIES: 'series',
  LEVEL: 'level',
};

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
  const hpHidden = Boolean(visual.hpHidden);
  const enemyPct =
    isEnemy && !hpHidden && visual.maxHp > 0
      ? Math.max(0, Math.min(100, Math.round((visual.hp / visual.maxHp) * 100)))
      : 0;

  return (
    <div
      className={`trail-event-panel kind-${visual.kind || 'skins'} ${isDeath ? 'is-death' : ''}`}
      aria-label="Event images"
    >
      <p className="trail-event-caption">{visual.caption}</p>
      {isEnemy ? (
        <div className={`trail-enemy-hud ${hpHidden ? 'is-hp-hidden' : ''}`}>
          <div className="trail-enemy-meta">
            <strong>{visual.enemyLabel || 'Enemy'}</strong>
            <span>{hpHidden ? 'HP ???' : `${Math.max(0, visual.hp ?? 0)}/${visual.maxHp ?? 0}`}</span>
          </div>
          {!hpHidden ? (
            <div className="trail-enemy-bar" aria-hidden="true">
              <span style={{ width: `${enemyPct}%` }} />
            </div>
          ) : (
            <p className="trail-enemy-unknown">Ambush them (or get ambushed) to reveal HP</p>
          )}
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
        const maxHp = Math.max(1, member.maxHp ?? 100);
        const hp = Math.max(0, Math.min(maxHp, member.hp ?? 0));
        const shield = Math.max(0, Math.min(100, member.shield ?? 0));
        const hpPct = Math.round((hp / maxHp) * 100);
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
                <span style={{ width: `${empty ? 0 : hpPct}%` }} />
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

function buildSelectMembers({ partyIds, sidekickId, outfits, sidekicks, skinLevels }) {
  const slots = [0, 1, 2, 3].map((index) => {
    const id = partyIds[index];
    const outfit = id ? outfits.find((entry) => entry.id === id) : null;
    const maxHp = outfit ? getTrailStartHp(skinLevels, outfit.id) : 0;
    return {
      key: id || `slot-${index}`,
      empty: !outfit,
      name: outfit?.name || '',
      outfit,
      sidekick: false,
      hp: maxHp,
      maxHp: maxHp || 100,
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
    maxHp: 100,
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
}) {
  const discovered = useMemo(
    () => sortOutfitsByNumber(outfits.filter((outfit) => guessedSkinIds.includes(outfit.id))),
    [outfits, guessedSkinIds],
  );
  const ownedSidekicks = useMemo(() => {
    const counts = new Map();
    for (const id of economy.ownedSidekickIds || []) {
      counts.set(id, (counts.get(id) || 0) + 1);
    }
    return sidekicks.filter((sidekick) => counts.has(sidekick.id));
  }, [sidekicks, economy.ownedSidekickIds]);

  const [screen, setScreen] = useState('select'); // select | forFunSelect | play | result
  const [forFunMode, setForFunMode] = useState(false);
  const [partyIds, setPartyIds] = useState([]);
  const [sidekickId, setSidekickId] = useState(null);
  const [search, setSearch] = useState('');
  const [selectSort, setSelectSort] = useState(SELECT_SORT.NUMBER);
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

  const seasonSections = useMemo(() => groupOutfitsBySeason(visibleSkins), [visibleSkins]);
  const seriesSections = useMemo(() => groupOutfitsBySeries(visibleSkins), [visibleSkins]);
  const levelSorted = useMemo(
    () => sortOutfitsByLevel(visibleSkins, skinLevels),
    [visibleSkins, skinLevels],
  );

  const selectMembers = useMemo(
    () =>
      buildSelectMembers({
        partyIds,
        sidekickId,
        outfits,
        sidekicks: ownedSidekicks,
        skinLevels,
      }),
    [partyIds, sidekickId, outfits, ownedSidekicks, skinLevels],
  );

  const playMembers = useMemo(() => {
    if (!liveSquad?.length) return selectMembers;
    const members = liveSquad.map((member, index) => {
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
        maxHp: member.maxHp ?? 100,
        shield: member.shield,
        alive: member.alive,
      };
    });
    if (!members.some((member) => member.sidekick)) {
      members.push({
        key: 'sidekick-empty',
        empty: true,
        name: '',
        sidekick: true,
        hp: 0,
        maxHp: 100,
        shield: 0,
        alive: false,
      });
    }
    return members;
  }, [liveSquad, selectMembers, outfits, ownedSidekicks]);

  const isSelectScreen = screen === 'select' || screen === 'forFunSelect';
  const isForFunSelect = screen === 'forFunSelect';
  const headerMembers = isSelectScreen ? selectMembers : playMembers;
  const runsLeft = getDailyTrailRunsRemaining(economy);
  const lockedIds = useMemo(() => getLockedTrailSkinIds(economy), [economy]);
  const partyHasLocked = !isForFunSelect && partyIds.some((id) => lockedIds.has(id));

  const toggleParty = (id) => {
    if (busy) return;
    setPartyIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 4) return current;
      return [...current, id];
    });
  };

  const startRun = async ({ forFun = false } = {}) => {
    if (busy || partyIds.length !== 4) return;
    if (!forFun) {
      if (!canStartTrailRun(economy)) {
        window.alert('No Battle Bus Trail runs left today.');
        return;
      }
      if (partyIds.some((id) => lockedIds.has(id))) {
        window.alert('One of those skins is locked until Monday. Use For Fun, or pick other skins.');
        return;
      }
    }
    setForFunMode(forFun);

    const party = partyIds.map((id) => outfits.find((outfit) => outfit.id === id)).filter(Boolean);
    const sidekick = sidekickId ? sidekicks.find((entry) => entry.id === sidekickId) : null;
    if (party.length !== 4) {
      window.alert('Could not start — pick 4 skins.');
      return;
    }

    let runEconomy = economy;
    if (!forFun) {
      const spent = spendTrailRun(economy);
      onEconomyChange(spent.economy);
      if (!spent.ok) {
        window.alert(spent.reason);
        return;
      }
      runEconomy = lockTrailSkins(partyIds, spent.economy);
      onEconomyChange(runEconomy);
    }

    const nameMap = new Map();
    for (const outfit of party) nameMap.set(outfit.name, outfit);
    if (sidekick) nameMap.set(sidekick.name, sidekick);
    outfitByNameRef.current = nameMap;

    forfeitedRef.current = false;
    runActiveRef.current = true;
    setBusy(true);
    setScreen('play');
    setResult(null);
    clearPlayLog();
    setChoices(null);
    setEventVisual(null);
    const startingHpByName = Object.fromEntries([
      ...party.map((outfit) => [outfit.name, getTrailStartHp(skinLevels, outfit.id)]),
      ...(sidekick ? [[sidekick.name, 100]] : []),
    ]);
    const fightResistByName = Object.fromEntries(
      party.map((outfit) => [
        outfit.name,
        getTrailFightDamageResist(getSkinLevel(skinLevels, outfit.id)),
      ]),
    );
    const stormResistByName = Object.fromEntries(
      party.map((outfit) => [
        outfit.name,
        getTrailStormDamageResist(getSkinLevel(skinLevels, outfit.id)),
      ]),
    );
    setLiveSquad(
      [
        ...party.map((outfit) => ({
          name: outfit.name,
          sidekick: false,
          maxHp: startingHpByName[outfit.name],
        })),
        ...(sidekick ? [{ name: sidekick.name, sidekick: true, maxHp: 100 }] : []),
      ].map((entry) => ({
        ...entry,
        hp: entry.maxHp,
        shield: 0,
        alive: true,
        afkTurns: 0,
      })),
    );

    if (forFun) {
      enqueueLog('FOR FUN — no weebucks or skin XP this run.');
    }

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
        sidekickName: sidekick?.name || null,
        // Full catalogue for encounter art — not limited to discovered/owned skins.
        outfits,
        partyOutfits: party,
        startingHpByName,
        fightResistByName,
        stormResistByName,
        stormResist: getTrailStormResist(runEconomy),
        fightResist: getTrailFightResist(runEconomy),
        unlockedBossItems: getTrailUnlockedBossItems(runEconomy),
        unlockedEvents: getTrailUnlockedEvents(runEconomy),
        forFun,
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

      const fallenCount = match.fallen.length;
      const survivorCount = match.survivors.length;

      if (forFun) {
        setResult({
          ...match,
          forFun: true,
          weebucks: 0,
          survivorCount,
          fallenCount,
          survivorPay: 0,
          fallenPay: 0,
          xpAwards: [],
        });
        setScreen('result');
        return;
      }

      const survivorNames = new Set(match.survivors);
      const payout = settleTrailPayout(
        {
          survivors: survivorCount,
          fallen: fallenCount,
          bonusWeebucks: match.bonusWeebucks || 0,
        },
        runEconomy,
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
        forFun: false,
        weebucks: payout.amount,
        survivorCount,
        fallenCount,
        survivorPay: payout.survivorPay,
        fallenPay: payout.fallenPay,
        bonusWeebucks: payout.bonusWeebucks || 0,
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
      setScreen(forFun || forFunMode ? 'forFunSelect' : 'select');
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
      setScreen(forFunMode ? 'forFunSelect' : 'select');
      setLiveSquad(null);
      setBusy(false);
      runActiveRef.current = false;
    }
  };

  const backToSelect = () => {
    setScreen(forFunMode || result?.forFun ? 'forFunSelect' : 'select');
    setPartyIds([]);
    setSidekickId(null);
    setLiveSquad(null);
    setEventVisual(null);
    setResult(null);
    clearPlayLog();
  };

  const openForFunSelect = () => {
    setForFunMode(true);
    setScreen('forFunSelect');
  };

  const openRankedSelect = () => {
    setForFunMode(false);
    setScreen('select');
  };

  const renderSkinPick = (outfit) => {
    const selected = partyIds.includes(outfit.id);
    const locked = !isForFunSelect && lockedIds.has(outfit.id);
    const level = getSkinLevel(skinLevels, outfit.id);
    const hpBonus = getTrailStartHpBonus(level);
    const fightResist = getTrailFightDamageResist(level);
    const stormResist = getTrailStormDamageResist(level);
    const levelBits = [`Lv ${level}`];
    if (hpBonus > 0) levelBits.push(`+${hpBonus} HP`);
    if (stormResist > 0) levelBits.push(`${Math.round(stormResist * 100)}% storm`);
    if (fightResist > 0) levelBits.push(`${Math.round(fightResist * 100)}% fight`);
    return (
      <button
        key={outfit.id}
        type="button"
        className={`catalogue-card fort-sort-pick revealed ${
          level >= MAX_SKIN_LEVEL ? 'level-max' : ''
        } ${selected ? 'is-selected' : ''} ${locked ? 'is-locked' : ''}`}
        onClick={() => toggleParty(outfit.id)}
        disabled={partyIds.length >= 4 && !selected}
      >
        <span className="catalogue-number">{outfit.number}.</span>
        <div className="catalogue-image-wrap">
          <SkinThumb outfit={outfit} />
        </div>
        <p className="catalogue-name">{outfit.name}</p>
        <p className="skin-level-badge">{levelBits.join(' · ')}</p>
        <span className="fort-sort-check" aria-hidden="true">
          {locked ? '🔒' : selected ? '✓' : ''}
        </span>
      </button>
    );
  };

  const renderPickGrid = (skins) => (
    <div className="catalogue-grid fort-sort-select-grid">{skins.map(renderSkinPick)}</div>
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

  if (screen === 'play' || screen === 'result') {
    return (
      <div className="fort-sort fort-sort-screen trail-screen">
        <header className="catalogue-header trail-header">
          <div className="trail-header-top">
            <h1>{forFunMode ? 'Battle Bus Trail · For Fun' : 'Battle Bus Trail'}</h1>
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
            {result.forFun ? (
              <p>For Fun — no weebucks or skin XP earned.</p>
            ) : (
              <>
                <p>
                  +{result.weebucks} weebucks ({result.survivorCount} alive × {result.survivorPay},{' '}
                  {result.fallenCount} fallen × {result.fallenPay}
                  {result.bonusWeebucks
                    ? `, Pirate Shop +${result.bonusWeebucks}`
                    : ''}
                  )
                </p>
                <p>
                  Skin XP: survivors +{TRAIL_SURVIVOR_XP}, fallen +{TRAIL_FALLEN_XP}
                </p>
              </>
            )}
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
        <h1>{isForFunSelect ? 'Battle Bus Trail · For Fun' : 'Battle Bus Trail'}</h1>
        <SquadStatusBar members={headerMembers} />
      </header>

      <div className="trail-start-bar">
        <button
          type="button"
          className="betting-start"
          disabled={
            partyIds.length !== 4 ||
            busy ||
            (!isForFunSelect && (runsLeft <= 0 || partyHasLocked))
          }
          onClick={() => startRun({ forFun: isForFunSelect })}
        >
          {isForFunSelect
            ? `Drop in (${partyIds.length}/4 skins${sidekickId ? ' · sidekick' : ''})`
            : `Drop in (${partyIds.length}/4 skins${sidekickId ? ' · sidekick' : ''} · ${runsLeft} run${
                runsLeft === 1 ? '' : 's'
              } left)`}
        </button>
      </div>

      <div
        className="catalogue-scroll"
        tabIndex={0}
        aria-label={isForFunSelect ? 'For Fun squad select' : 'Trail squad select'}
      >
        <h2 className="shop-section-title">Sidekick (optional)</h2>
        {ownedSidekicks.length === 0 ? (
          <p className="hint">Optional — buy sidekick rolls in the Shop if you want one.</p>
        ) : (
          <div className="catalogue-grid fort-sort-select-grid">
            {ownedSidekicks.map((sidekick) => (
              <button
                key={sidekick.id}
                type="button"
                className={`catalogue-card fort-sort-pick revealed ${
                  sidekickId === sidekick.id ? 'is-selected' : ''
                }`}
                onClick={() =>
                  setSidekickId((current) => (current === sidekick.id ? null : sidekick.id))
                }
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
        <div className="fort-sort-sort-row fort-sort-sort-row--solo">
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
        </div>
        {visibleSkins.length === 0 ? (
          <p className="hint">No skins to show.</p>
        ) : selectSort === SELECT_SORT.SEASON ? (
          renderSections(seasonSections)
        ) : selectSort === SELECT_SORT.SERIES ? (
          renderSections(seriesSections)
        ) : selectSort === SELECT_SORT.LEVEL ? (
          renderPickGrid(levelSorted)
        ) : (
          renderPickGrid(visibleSkins)
        )}
      </div>

      <nav className="catalogue-sort-bar catalogue-sort-bar--two" aria-label="Trail">
        <button type="button" className="catalogue-sort-button" onClick={onBack}>
          Main Menu
        </button>
        {isForFunSelect ? (
          <button type="button" className="catalogue-sort-button" onClick={openRankedSelect}>
            Ranked
          </button>
        ) : (
          <button type="button" className="catalogue-sort-button" onClick={openForFunSelect}>
            For Fun
          </button>
        )}
      </nav>
    </div>
  );
}
