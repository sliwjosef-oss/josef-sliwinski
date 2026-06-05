import { useMemo } from 'react';
import { getOutfitIconSrc } from '../utils/outfits';
import { countDiscoveredSkins, isSkinGuessed } from '../utils/progress';

function CatalogueImage({ outfit }) {
  const iconSrc = getOutfitIconSrc(outfit);

  return (
    <img
      src={iconSrc}
      alt={outfit.name}
      className="catalogue-image"
      loading="lazy"
      onError={(event) => {
        const fallback = `/skin-icons/${outfit.number}.png`;
        if (event.currentTarget.src !== fallback) {
          event.currentTarget.src = fallback;
        }
      }}
    />
  );
}

export default function SkinCatalogue({ outfits, guessedSkinIds, onBack }) {
  const sortedOutfits = useMemo(
    () =>
      [...outfits]
        .sort((a, b) => a.number - b.number)
        .map((outfit, index) => ({
          ...outfit,
          number: outfit.number ?? index + 1,
        })),
    [outfits]
  );

  const revealedCount = countDiscoveredSkins(sortedOutfits, guessedSkinIds);

  return (
    <div className="skin-catalogue">
      <header className="catalogue-header">
        <h1>Skin Catalogue</h1>
        <p className="subtitle">
          {revealedCount} of {sortedOutfits.length} outfits discovered
        </p>
        <button type="button" className="secondary-button" onClick={onBack}>
          Return to Hangman Game
        </button>
      </header>

      <div className="catalogue-grid">
        {sortedOutfits.map((outfit) => {
          const isRevealed = isSkinGuessed(guessedSkinIds, outfit);

          return (
            <article key={outfit.id} className={`catalogue-card ${isRevealed ? 'revealed' : 'hidden'}`}>
              <span className="catalogue-number">{outfit.number}.</span>
              <div className="catalogue-image-wrap">
                {isRevealed ? (
                  <CatalogueImage outfit={outfit} />
                ) : (
                  <span className="catalogue-placeholder" aria-hidden="true">
                    ?
                  </span>
                )}
              </div>
              <p className="catalogue-name">{isRevealed ? outfit.name : '?'}</p>
            </article>
          );
        })}
      </div>
    </div>
  );
}
