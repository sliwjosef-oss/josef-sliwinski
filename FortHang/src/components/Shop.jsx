import {
  GUESS_PACKS,
  SIDEKICK_ROLLS,
  buyGuessPack,
  countOwnedSidekickKinds,
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

      <h2 className="shop-section-title">Guess packs</h2>
      <div className="shop-grid">
        {GUESS_PACKS.map((pack) => (
          <article key={pack.id} className="shop-card">
            <h2>+{pack.amount} guesses</h2>
            <p>
              Add {pack.amount} letter guesses for today.
            </p>
            <p className="shop-meta">Stacks until the 6:00 AM CST reset.</p>
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
