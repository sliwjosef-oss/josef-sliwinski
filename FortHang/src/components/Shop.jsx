import {
  GUESS_PACKS,
  SHOP_UNLOCKS,
  SIDEKICK_ROLLS,
  buyGuessPack,
  buyShopUnlock,
  countOwnedSidekickKinds,
  isShopUnlockAvailable,
  isShopUnlockOwned,
  rollRandomSidekick,
} from '../utils/economy';
import GuessStatus from './GuessStatus';

function rarityLabel(rarity) {
  if (rarity === 'ultra') return 'Ultra Rare';
  if (rarity === 'rare') return 'Rare';
  return 'Common';
}

function formatRollResults(results) {
  return results
    .map((result) => {
      const tag = rarityLabel(result.rarity);
      const dupe = result.duplicate ? ' (duplicate)' : '';
      return `${result.sidekick.name} [${tag}]${dupe}`;
    })
    .join('\n');
}

const BETTING_UNLOCK_ORDER = [
  'simulateAll',
  'randomSelect',
  'superBetExtraLife',
  'betRunsTier1',
  'betRunsTier2',
  'starSlotsTier1',
  'starSlotsTier2',
  'boostSlotsTier1',
  'boostSlotsTier2',
  'top8Tier1',
  'top8Tier2',
  'top64Tier1',
  'top64Tier2',
  'starDicePlus',
  'boostDicePlus',
];

export default function Shop({
  economy,
  sidekicks,
  onEconomyChange,
  onBack,
  onOpenSidekicks,
  onOpenCatalogue,
  onOpenFortSort,
}) {
  const ownedKinds = countOwnedSidekickKinds(economy);
  const totalOwned = economy.ownedSidekickIds?.length ?? 0;

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
    window.alert(`You rolled:\n${formatRollResults(result.results)}`);
  };

  const buyUnlock = (unlockId) => {
    const result = buyShopUnlock(unlockId, economy);
    onEconomyChange(result.economy);
    if (!result.ok) window.alert(result.reason);
  };

  const unlockCards = BETTING_UNLOCK_ORDER.map((id) => SHOP_UNLOCKS[id]).filter((item) => {
    if (!item) return false;
    if (isShopUnlockOwned(item.id, economy)) return true;
    return isShopUnlockAvailable(item.id, economy);
  });

  return (
    <div className="shop-screen">
      <header className="catalogue-header">
        <h1>Shop</h1>
        <GuessStatus economy={economy} onEconomyChange={onEconomyChange} />
        <p className="discovery-count">
          {ownedKinds}/{sidekicks.length} unique sidekicks · {totalOwned} total copies
        </p>
        <div className="header-actions">
          <button type="button" className="secondary-button" onClick={onBack}>
            Back to Hangman
          </button>
          <button type="button" className="secondary-button" onClick={onOpenCatalogue}>
            Skin Catalogue
          </button>
          <button type="button" className="secondary-button" onClick={onOpenSidekicks}>
            Sidekick Catalogue
          </button>
          <button type="button" className="secondary-button" onClick={onOpenFortSort}>
            FortSort
          </button>
        </div>
      </header>

      <p className="hint">
        Earn weebucks in FortSort Betting mode. Sidekick rolls can duplicate. Each roll has a 10% rare and 1%
        ultra-rare chance (SpongeBob, PAC-MAN, The Knight).
      </p>

        <h2 className="shop-section-title">Skin attempt packs</h2>
      <div className="shop-grid">
        {GUESS_PACKS.map((pack) => (
          <article key={pack.id} className="shop-card">
            <h2>+{pack.amount} guesses</h2>
            <p>Add {pack.amount} skin attempts for today.</p>
            <p className="shop-meta">One attempt per skin (win or lose) · stacks until the 6:00 AM CST reset.</p>
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

      <h2 className="shop-section-title">Betting upgrades</h2>
      <div className="shop-grid">
        {unlockCards.map((item) => {
          const owned = isShopUnlockOwned(item.id, economy);
          const available = isShopUnlockAvailable(item.id, economy);
          return (
            <article key={item.id} className={`shop-card ${owned ? 'is-owned' : ''}`}>
              <h2>{item.label}</h2>
              <p>{item.blurb}</p>
              <p className="shop-meta">
                {owned ? 'Owned' : available ? 'Available' : 'Locked'}
              </p>
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

      <h2 className="shop-section-title">Sidekick rolls</h2>
      <div className="shop-grid">
        {SIDEKICK_ROLLS.map((pack) => (
          <article key={pack.id} className="shop-card">
            <h2>
              {pack.count} sidekick{pack.count === 1 ? '' : 's'}
            </h2>
            <p>
              Roll {pack.count} random sidekick{pack.count === 1 ? '' : 's'}. Duplicates allowed.
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
    </div>
  );
}
