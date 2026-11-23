import { isSidekickOwned } from '../utils/economy';

function SidekickCard({ sidekick, owned }) {
  const initial = sidekick.name.trim().charAt(0).toUpperCase() || '?';
  return (
    <article className={`catalogue-card ${owned ? 'revealed' : 'hidden'}`}>
      <span className="catalogue-number">{sidekick.number}.</span>
      <div className="catalogue-image-wrap sidekick-avatar-wrap">
        {owned ? (
          <div className="sidekick-avatar" aria-hidden="true">
            {initial}
          </div>
        ) : (
          <span className="catalogue-placeholder" aria-hidden="true">
            ?
          </span>
        )}
      </div>
      <p className="catalogue-name">{owned ? sidekick.name : '?'}</p>
      {owned ? <p className="catalogue-meta">{sidekick.releaseText}</p> : null}
    </article>
  );
}

export default function SidekickCatalogue({
  sidekicks,
  economy,
  onBack,
  onOpenShop,
  onOpenCatalogue,
  onOpenFortSort,
}) {
  const ownedCount = sidekicks.filter((sidekick) => isSidekickOwned(economy, sidekick.id)).length;

  return (
    <div className="catalogue-screen">
      <header className="catalogue-header">
        <h1>Sidekick Catalogue</h1>
        <p className="discovery-count">
          {ownedCount} / {sidekicks.length} sidekicks unlocked · {economy.points} points
        </p>
        <div className="header-actions">
          <button type="button" className="secondary-button" onClick={onBack}>
            Back to Hangman
          </button>
          <button type="button" className="secondary-button" onClick={onOpenCatalogue}>
            Skin Catalogue
          </button>
          <button type="button" className="secondary-button" onClick={onOpenShop}>
            Shop
          </button>
          <button type="button" className="secondary-button" onClick={onOpenFortSort}>
            FortSort
          </button>
        </div>
      </header>

      <p className="hint">
        Unlock sidekicks in the Shop by spending 100 betting points on a random roll.
      </p>

      <div className="catalogue-grid">
        {sidekicks.map((sidekick) => (
          <SidekickCard
            key={sidekick.id}
            sidekick={sidekick}
            owned={isSidekickOwned(economy, sidekick.id)}
          />
        ))}
      </div>
    </div>
  );
}
