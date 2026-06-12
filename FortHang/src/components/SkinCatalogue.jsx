import { useMemo, useState } from 'react';
import {
  getGameOutfits,
  getOutfitIconFallbackSrc,
  getOutfitIconSrc,
  getOutfitSilhouetteSrc,
} from '../utils/outfits';
import { countDiscoveredSkins, isSeasonComplete, isSkinGuessed } from '../utils/progress';
import {
  groupOutfitsBySeason,
  sortOutfitsAlphabetically,
  sortOutfitsByNumber,
} from '../utils/seasonSort';
import { groupOutfitsBySeries } from '../utils/seriesSort';

const SORT_MODES = {
  NUMBER: 'number',
  SEASON: 'season',
  ALPHABETICAL: 'alphabetical',
  SERIES: 'series',
};

function CatalogueImage({ outfit, silhouette = false }) {
  const iconSrc = silhouette ? getOutfitSilhouetteSrc(outfit) : getOutfitIconSrc(outfit);

  if (!iconSrc) {
    return (
      <span className="catalogue-placeholder" aria-hidden="true">
        ?
      </span>
    );
  }

  return (
    <img
      src={iconSrc}
      alt={silhouette ? '' : outfit.name}
      className={silhouette ? 'catalogue-silhouette' : 'catalogue-image'}
      loading="lazy"
      aria-hidden={silhouette || undefined}
      onError={(event) => {
        if (silhouette) return;

        const fallback = getOutfitIconFallbackSrc(outfit);
        if (fallback && event.currentTarget.src !== fallback) {
          event.currentTarget.src = fallback;
        }
      }}
    />
  );
}

function CatalogueCard({ outfit, guessedSkinIds }) {
  const isRevealed = isSkinGuessed(guessedSkinIds, outfit);

  return (
    <article key={outfit.id} className={`catalogue-card ${isRevealed ? 'revealed' : 'hidden'}`}>
      <span className="catalogue-number">{outfit.number}.</span>
      <div className="catalogue-image-wrap">
        <CatalogueImage outfit={outfit} silhouette={!isRevealed} />
      </div>
      <p className="catalogue-name">{isRevealed ? outfit.name : '?'}</p>
    </article>
  );
}

function CatalogueGrid({ outfits, guessedSkinIds }) {
  return (
    <div className="catalogue-grid">
      {outfits.map((outfit) => (
        <CatalogueCard key={outfit.id} outfit={outfit} guessedSkinIds={guessedSkinIds} />
      ))}
    </div>
  );
}

function CatalogueSections({ sections, guessedSkinIds }) {
  return (
    <div className="catalogue-season-sections">
      {sections.map((section) => {
        const sectionComplete = isSeasonComplete(section.outfits, guessedSkinIds);

        return (
          <section key={section.key} className="catalogue-season-section">
            <h2 className={`catalogue-season-heading ${sectionComplete ? 'complete' : ''}`}>
              <span className="catalogue-season-label">{section.label}</span>
              <span className="catalogue-season-underline" aria-hidden="true" />
            </h2>
            <CatalogueGrid outfits={section.outfits} guessedSkinIds={guessedSkinIds} />
          </section>
        );
      })}
    </div>
  );
}

export default function SkinCatalogue({ outfits, guessedSkinIds, onBack }) {
  const [sortMode, setSortMode] = useState(SORT_MODES.NUMBER);

  const catalogueOutfits = useMemo(
    () =>
      sortOutfitsByNumber(getGameOutfits(outfits)).map((outfit, index) => ({
        ...outfit,
        number: outfit.number ?? index + 1,
      })),
    [outfits]
  );

  const alphabeticalOutfits = useMemo(
    () => sortOutfitsAlphabetically(catalogueOutfits),
    [catalogueOutfits]
  );

  const seasonSections = useMemo(
    () => groupOutfitsBySeason(catalogueOutfits),
    [catalogueOutfits]
  );

  const seriesSections = useMemo(
    () => groupOutfitsBySeries(catalogueOutfits),
    [catalogueOutfits]
  );

  const revealedCount = countDiscoveredSkins(catalogueOutfits, guessedSkinIds);

  return (
    <div className="skin-catalogue">
      <header className="catalogue-header">
        <h1>Skin Catalogue</h1>
        <p className="subtitle">
          {revealedCount} of {catalogueOutfits.length} outfits discovered
        </p>
        <div className="catalogue-sort-actions" role="group" aria-label="Catalogue sort options">
          <button
            type="button"
            className={`catalogue-sort-button ${sortMode === SORT_MODES.NUMBER ? 'active' : ''}`}
            onClick={() => setSortMode(SORT_MODES.NUMBER)}
          >
            Sort by Number
          </button>
          <button
            type="button"
            className={`catalogue-sort-button ${sortMode === SORT_MODES.SEASON ? 'active' : ''}`}
            onClick={() => setSortMode(SORT_MODES.SEASON)}
          >
            Sort by Season
          </button>
          <button
            type="button"
            className={`catalogue-sort-button ${sortMode === SORT_MODES.ALPHABETICAL ? 'active' : ''}`}
            onClick={() => setSortMode(SORT_MODES.ALPHABETICAL)}
          >
            Sort Alphabetically
          </button>
          <button
            type="button"
            className={`catalogue-sort-button ${sortMode === SORT_MODES.SERIES ? 'active' : ''}`}
            onClick={() => setSortMode(SORT_MODES.SERIES)}
          >
            Sort by Series
          </button>
        </div>
        <button type="button" className="secondary-button" onClick={onBack}>
          Return to Hangman Game
        </button>
      </header>

      {sortMode === SORT_MODES.NUMBER && (
        <CatalogueGrid outfits={catalogueOutfits} guessedSkinIds={guessedSkinIds} />
      )}

      {sortMode === SORT_MODES.ALPHABETICAL && (
        <CatalogueGrid outfits={alphabeticalOutfits} guessedSkinIds={guessedSkinIds} />
      )}

      {sortMode === SORT_MODES.SEASON && (
        <CatalogueSections sections={seasonSections} guessedSkinIds={guessedSkinIds} />
      )}

      {sortMode === SORT_MODES.SERIES && (
        <CatalogueSections sections={seriesSections} guessedSkinIds={guessedSkinIds} />
      )}
    </div>
  );
}
