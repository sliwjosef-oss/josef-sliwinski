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
  onOpenCatalogue,
}) {
  const ownedCount = sidekicks.filter((sidekick) => isSidekickOwned(economy, sidekick.id)).length;
  const totalCopies = economy.ownedSidekickIds?.length ?? 0;

  return (
    <div className="skin-catalogue">
      <header className="catalogue-header">
        <h1>Sidekick Catalogue</h1>
        <p className="discovery-count">
          {ownedCount} / {sidekicks.length} unique · {totalCopies} total copies · {economy.points}{' '}
          weebucks
        </p>
        <button type="button" className="secondary-button catalogue-back-button" onClick={onBack}>
          Back to Hangman
        </button>
      </header>

      <div className="catalogue-scroll" tabIndex={0} aria-label="Sidekick catalogue list">
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

      <nav className="catalogue-sort-bar catalogue-sort-bar--single" aria-label="Sidekick catalogue actions">
        <button type="button" className="catalogue-sort-button" onClick={onOpenCatalogue}>
          Skin Catalogue
        </button>
      </nav>
    </div>
  );
}
