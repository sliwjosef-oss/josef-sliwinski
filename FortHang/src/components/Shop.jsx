import { useEffect, useMemo, useState } from 'react';
import {
  GUESS_PACKS,
  MUSIC_SHOP_IDS,
  MUSIC_TRACK_COST,
  SHOP_UNLOCKS,
  SIDEKICK_ROLLS,
  TRAIL_SHOP_ORDER,
  TRAIL_SHOP_UNLOCKS,
  buyGuessPack,
  buyMusicTrack,
  buyShopUnlock,
  buyTrailShopUnlock,
  countPermanentShopUpgrades,
  isMusicTrackOwned,
  isShopUnlockAvailable,
  isShopUnlockOwned,
  isTrailShopUnlockAvailable,
  isTrailShopUnlockOwned,
  rollRandomSidekick,
} from '../utils/economy';
import { MENU_TRACKS, getPreviewTrackId, startMusicPreview, stopMusicPreview, subscribeMenuMusic } from '../audio/menuMusic';
import { getSidekickIconSrc } from '../utils/sidekicks';

function rarityLabel(rarity) {
  if (rarity === 'ultra') return 'Ultra Rare';
  if (rarity === 'rare') return 'Rare';
  return 'Common';
}

function SidekickRollIcon({ sidekick }) {
  const src = getSidekickIconSrc(sidekick);
  if (!src) {
    return (
      <span className="shop-roll-placeholder" aria-hidden="true">
        ?
      </span>
    );
  }

  return (
    <img
      src={src}
      alt=""
      className="shop-roll-icon"
      loading="eager"
      referrerPolicy="no-referrer"
      onError={(event) => {
        event.currentTarget.replaceWith(
          Object.assign(document.createElement('span'), {
            className: 'shop-roll-placeholder',
            textContent: '?',
          }),
        );
      }}
    />
  );
}

function SidekickRollResults({ results, onReturn }) {
  const title = results.length === 1 ? 'You rolled a sidekick!' : `You rolled ${results.length} sidekicks!`;

  return (
    <div className="skin-catalogue shop-screen shop-roll-screen">
      <header className="catalogue-header">
        <h1>{title}</h1>
      </header>

      <div className="catalogue-scroll shop-roll-scroll" tabIndex={0} aria-label="Sidekick roll results">
        <div className={`shop-roll-grid ${results.length === 1 ? 'is-single' : ''}`}>
          {results.map((result, index) => (
            <article
              key={`${result.sidekick.id}-${index}`}
              className={`shop-roll-card sidekick-rarity-${result.rarity}`}
            >
              {result.rarity !== 'common' ? (
                <span className={`sidekick-rarity-badge is-${result.rarity}`}>
                  {rarityLabel(result.rarity)}
                </span>
              ) : null}
              <div className="shop-roll-icon-wrap">
                <SidekickRollIcon sidekick={result.sidekick} />
              </div>
              <p className="shop-roll-name">{result.sidekick.name}</p>
              {result.duplicate ? <p className="shop-roll-dupe">Duplicate</p> : null}
            </article>
          ))}
        </div>
      </div>

      <nav className="catalogue-sort-bar catalogue-sort-bar--single" aria-label="Roll results">
        <button type="button" className="catalogue-sort-button" onClick={onReturn}>
          Return
        </button>
      </nav>
    </div>
  );
}

const BETTING_UNLOCK_ORDER = [
  'simulateAll',
  'randomSelect',
  'superBetExtraLife',
  'betSeeding',
  'betRunsTier1',
  'betRunsTier2',
  'starSlotsTier1',
  'starSlotsTier2',
  'boostSlotsTier1',
  'boostSlotsTier2',
  'top8Tier1',
  'top8Tier2',
  'top8Tier3',
  'top64Tier1',
  'top64Tier2',
  'top64Tier3',
  'tournamentWinTier1',
  'tournamentWinTier2',
  'starDicePlus',
  'boostDicePlus',
  'diceRollTier1',
  'diceRollTier2',
];

const SHOP_TABS = [
  { id: 'attempts', label: 'Skin attempt packs' },
  { id: 'betting', label: 'Betting upgrades' },
  { id: 'trail', label: 'Battle Bus Trail' },
  { id: 'music', label: 'Music' },
  { id: 'sidekicks', label: 'Sidekick rolls' },
];

export default function Shop({ economy, sidekicks, onEconomyChange, onBack }) {
  const [tab, setTab] = useState('attempts');
  const [rollResults, setRollResults] = useState(null);
  const [, setPreviewRevision] = useState(0);
  const upgrades = useMemo(() => countPermanentShopUpgrades(economy), [economy]);

  useEffect(() => subscribeMenuMusic(() => setPreviewRevision((current) => current + 1)), []);

  useEffect(() => {
    if (tab !== 'music') stopMusicPreview();
  }, [tab]);

  useEffect(() => () => stopMusicPreview(), []);

  const buyGuesses = (pack) => {
    const result = buyGuessPack(economy, pack);
    onEconomyChange(result.economy);
    if (!result.ok) window.alert(result.reason);
  };

  const buySidekicks = (pack) => {
    const result = rollRandomSidekick(sidekicks, economy, { count: pack.count, cost: pack.cost });
    onEconomyChange(result.economy);
    if (!result.ok) {
      window.alert(result.reason);
      return;
    }
    setTab('sidekicks');
    setRollResults(result.results);
  };

  if (rollResults?.length) {
    return (
      <SidekickRollResults
        results={rollResults}
        onReturn={() => {
          setRollResults(null);
          setTab('sidekicks');
        }}
      />
    );
  }

  const buyUnlock = (unlockId) => {
    const result = buyShopUnlock(unlockId, economy);
    onEconomyChange(result.economy);
    if (!result.ok) window.alert(result.reason);
  };

  const buyTrailUnlock = (unlockId) => {
    const result = buyTrailShopUnlock(unlockId, economy);
    onEconomyChange(result.economy);
    if (!result.ok) window.alert(result.reason);
  };

  const buySong = (trackId) => {
    const result = buyMusicTrack(trackId, economy);
    onEconomyChange(result.economy);
    if (!result.ok) window.alert(result.reason);
  };

  const musicCards = MUSIC_SHOP_IDS.map((id) => MENU_TRACKS.find((track) => track.id === id)).filter(Boolean);

  const unlockCards = BETTING_UNLOCK_ORDER.map((id) => SHOP_UNLOCKS[id]).filter((item) => {
    if (!item) return false;
    if (isShopUnlockOwned(item.id, economy)) return true;
    return isShopUnlockAvailable(item.id, economy);
  });

  const trailCards = TRAIL_SHOP_ORDER.map((id) => TRAIL_SHOP_UNLOCKS[id]).filter((item) => {
    if (!item) return false;
    if (isTrailShopUnlockOwned(item.id, economy)) return true;
    return isTrailShopUnlockAvailable(item.id, economy);
  });

  return (
    <div className="skin-catalogue shop-screen">
      <header className="catalogue-header">
        <h1>Shop</h1>
        <div className="shop-header-stats">
          <p className="discovery-count shop-upgrade-count">
            {upgrades.owned}/{upgrades.total} unique upgrades unlocked
          </p>
          <p className="discovery-count shop-weebucks-count">{economy.points} weebucks</p>
        </div>
      </header>

      <nav className="shop-tabs" aria-label="Shop sections">
        {SHOP_TABS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={`shop-tab ${tab === entry.id ? 'is-active' : ''}`}
            onClick={() => setTab(entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </nav>

      <div className="catalogue-scroll" tabIndex={0} aria-label="Shop items">
        {tab === 'attempts' ? (
          <>
            <h2 className="shop-section-title">Skin attempt packs</h2>
            <div className="shop-grid">
              {GUESS_PACKS.map((pack) => (
                <article key={pack.id} className="shop-card">
                  <h2>+{pack.amount} guesses</h2>
                  <p>Add {pack.amount} skin attempts for today.</p>
                  <p className="shop-meta">
                    One attempt per skin (win or lose) · stacks until the 6:00 AM Central Time reset.
                  </p>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => buyGuesses(pack)}
                    disabled={economy.points < pack.cost}
                  >
                    Buy for {pack.cost} weebucks
                  </button>
                </article>
              ))}
            </div>
          </>
        ) : null}

        {tab === 'betting' ? (
          <>
            <h2 className="shop-section-title">Betting upgrades</h2>
            <div className="shop-grid">
              {unlockCards.map((item) => {
                const owned = isShopUnlockOwned(item.id, economy);
                const available = isShopUnlockAvailable(item.id, economy);
                return (
                  <article key={item.id} className={`shop-card ${owned ? 'is-owned' : ''}`}>
                    <h2>{item.label}</h2>
                    <p>{item.blurb}</p>
                    <p className="shop-meta">{owned ? 'Owned' : available ? 'Available' : 'Locked'}</p>
                    {owned ? (
                      <button type="button" className="ghost-button" disabled>
                        Owned
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="primary-button"
                        onClick={() => buyUnlock(item.id)}
                        disabled={!available || economy.points < item.cost}
                      >
                        Buy for {item.cost} weebucks
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          </>
        ) : null}

        {tab === 'trail' ? (
          <>
            <h2 className="shop-section-title">Battle Bus Trail unlocks</h2>
            <div className="shop-grid">
              {trailCards.map((item) => {
                const owned = isTrailShopUnlockOwned(item.id, economy);
                const available = isTrailShopUnlockAvailable(item.id, economy);
                const meta = owned
                  ? 'Owned'
                  : item.kind === 'trailEvent'
                    ? available
                      ? 'Unlockable Trail event'
                      : 'Locked'
                    : item.kind
                      ? available
                        ? 'Trail upgrade'
                        : 'Locked'
                      : item.id === 'trailChugJug'
                        ? 'Chest and boss loot'
                        : 'Adds to boss loot pool';
                return (
                  <article key={item.id} className={`shop-card ${owned ? 'is-owned' : ''}`}>
                    <h2>{item.label}</h2>
                    <p>{item.blurb}</p>
                    <p className="shop-meta">{meta}</p>
                    {owned ? (
                      <button type="button" className="ghost-button" disabled>
                        Owned
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="primary-button"
                        onClick={() => buyTrailUnlock(item.id)}
                        disabled={!available || economy.points < item.cost}
                      >
                        Buy for {item.cost} weebucks
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          </>
        ) : null}

        {tab === 'music' ? (
          <>
            <h2 className="shop-section-title">Music</h2>
            <div className="shop-grid shop-grid--stack">
              {musicCards.map((track) => {
                const owned = isMusicTrackOwned(track.id, economy);
                const previewing = getPreviewTrackId() === track.id;
                return (
                  <article key={track.id} className={`shop-card ${owned ? 'is-owned' : ''}`}>
                    <h2>{track.label}</h2>
                    <p>Unlock this song for the lobby music list.</p>
                    <p className="shop-meta">{owned ? 'Owned' : 'Available'}</p>
                    <div className="shop-card-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => startMusicPreview(track.id)}
                      >
                        {previewing ? 'Stop preview' : 'Preview'}
                      </button>
                      {owned ? (
                        <button type="button" className="ghost-button" disabled>
                          Owned
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="primary-button"
                          onClick={() => buySong(track.id)}
                          disabled={economy.points < MUSIC_TRACK_COST}
                        >
                          Buy for {MUSIC_TRACK_COST} weebucks
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        ) : null}

        {tab === 'sidekicks' ? (
          <>
            <h2 className="shop-section-title">Sidekick rolls</h2>
            <div className="shop-grid">
              {SIDEKICK_ROLLS.map((pack) => (
                <article key={pack.id} className="shop-card">
                  <h2>
                    {pack.count} sidekick{pack.count === 1 ? '' : 's'}
                  </h2>
                  <p>
                    Roll {pack.count} random sidekick{pack.count === 1 ? '' : 's'}. Duplicates
                    allowed.
                  </p>
                  <p className="shop-meta">10% rare · 1% ultra rare per roll.</p>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => buySidekicks(pack)}
                    disabled={economy.points < pack.cost || sidekicks.length === 0}
                  >
                    Roll for {pack.cost} weebucks
                  </button>
                </article>
              ))}
            </div>
          </>
        ) : null}
      </div>

      <nav className="catalogue-sort-bar catalogue-sort-bar--single" aria-label="Shop">
        <button type="button" className="catalogue-sort-button" onClick={onBack}>
          Main Menu
        </button>
      </nav>
    </div>
  );
}
