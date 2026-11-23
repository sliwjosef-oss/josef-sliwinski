import {
  GUESS_PACK_AMOUNT,
  GUESS_PACK_COST,
  SIDEKICK_ROLL_COST,
  buyGuessPack,
  rollRandomSidekick,
} from '../utils/economy';
import GuessStatus from './GuessStatus';

export default function Shop({
  economy,
  sidekicks,
  onEconomyChange,
  onBack,
  onOpenSidekicks,
  onOpenCatalogue,
  onOpenFortSort,
}) {
  const ownedCount = economy.ownedSidekickIds?.length ?? 0;

  const buyGuesses = () => {
    const result = buyGuessPack(economy);
    onEconomyChange(result.economy);
    if (!result.ok) window.alert(result.reason);
  };

  const buySidekick = () => {
    const result = rollRandomSidekick(sidekicks, economy);
    onEconomyChange(result.economy);
    if (!result.ok) {
      window.alert(result.reason);
      return;
    }
    window.alert(`You unlocked ${result.sidekick.name}!`);
  };

  return (
    <div className="shop-screen">
      <header className="catalogue-header">
        <h1>Shop</h1>
        <GuessStatus economy={economy} onEconomyChange={onEconomyChange} />
        <p className="discovery-count">
          {ownedCount}/{sidekicks.length} sidekicks unlocked
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
        Earn weebucks in FortSort Betting mode. Spend them on extra hangman guesses or a random sidekick —
        not both at once from the same stack of weebucks.
      </p>

      <div className="shop-grid">
        <article className="shop-card">
          <h2>Extra guesses</h2>
          <p>
            +{GUESS_PACK_AMOUNT} letter guesses today for {GUESS_PACK_COST} weebucks.
          </p>
          <p className="shop-meta">Daily base is 50. Bonus packs stack until the 6:00 AM CST reset.</p>
          <button
            type="button"
            className="primary-button"
            onClick={buyGuesses}
            disabled={economy.points < GUESS_PACK_COST}
          >
            Buy for {GUESS_PACK_COST} weebucks
          </button>
        </article>

        <article className="shop-card">
          <h2>Random sidekick</h2>
          <p>Spend {SIDEKICK_ROLL_COST} weebucks to unlock one random undiscovered sidekick.</p>
          <p className="shop-meta">
            {sidekicks.length - ownedCount} still locked in the sidekick catalogue.
          </p>
          <button
            type="button"
            className="primary-button"
            onClick={buySidekick}
            disabled={economy.points < SIDEKICK_ROLL_COST || ownedCount >= sidekicks.length}
          >
            Roll for {SIDEKICK_ROLL_COST} weebucks
          </button>
        </article>
      </div>
    </div>
  );
}
