import { getSidekickCount, getSidekickRarity, isSidekickOwned } from '../utils/economy';
import { getSidekickIconSrc, getSidekickSilhouetteSrc } from '../utils/sidekicks';

function SidekickImage({ sidekick, silhouette = false }) {
  const src = silhouette ? getSidekickSilhouetteSrc(sidekick) : getSidekickIconSrc(sidekick);
  if (!src) {
    return (
      <span className="catalogue-placeholder" aria-hidden="true">
        ?
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={silhouette ? '' : sidekick.name}
      className={silhouette ? 'catalogue-silhouette sidekick-silhouette' : 'catalogue-image'}
      loading="lazy"
      referrerPolicy="no-referrer"
      aria-hidden={silhouette || undefined}
      onError={(event) => {
        event.currentTarget.replaceWith(
          Object.assign(document.createElement('span'), {
            className: 'catalogue-placeholder',
            textContent: '?',
          }),
        );
      }}
    />
  );
}

function SidekickCard({ sidekick, owned, count }) {
  const rarity = getSidekickRarity(sidekick);
  return (
    <article
      className={`catalogue-card ${owned ? 'revealed' : 'hidden'} sidekick-rarity-${rarity}`}
    >
      <span className="catalogue-number">{sidekick.number}.</span>
      {owned && rarity !== 'common' ? (
        <span className={`sidekick-rarity-badge is-${rarity}`}>
          {rarity === 'ultra' ? 'Ultra Rare' : 'Rare'}
        </span>
      ) : null}
      <div className="catalogue-image-wrap">
        <SidekickImage sidekick={sidekick} silhouette={!owned} />
      </div>
      <p className="catalogue-name">{owned ? sidekick.name : '?'}</p>
      {owned ? (
        <p className="catalogue-meta">
          {sidekick.releaseText}
          {count > 1 ? ` · ×${count}` : ''}
        </p>
      ) : null}
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
  const totalCopies = economy.ownedSidekickIds?.length ?? 0;

  return (
    <div className="catalogue-screen">
      <header className="catalogue-header">
        <h1>Sidekick Catalogue</h1>
        <p className="discovery-count">
          {ownedCount} / {sidekicks.length} unique · {totalCopies} total copies · {economy.points}{' '}
          weebucks
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
        Unlock sidekicks in the Shop. Rolls can duplicate. Rare collabs are 10%; SpongeBob, PAC-MAN, and The
        Knight are 1% ultra rare. Unowned sidekicks show as silhouettes.
      </p>

      <div className="catalogue-grid">
        {sidekicks.map((sidekick) => (
          <SidekickCard
            key={sidekick.id}
            sidekick={sidekick}
            owned={isSidekickOwned(economy, sidekick.id)}
            count={getSidekickCount(economy, sidekick.id)}
          />
        ))}
      </div>
    </div>
  );
}
