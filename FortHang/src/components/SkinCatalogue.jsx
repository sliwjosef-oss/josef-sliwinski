import { useMemo, useState } from 'react';
import {
  getGameOutfits,
  getOutfitIconFallbackSrc,
  getOutfitIconSrc,
  getOutfitSilhouetteSrc,
} from '../utils/outfits';
import { countDiscoveredSkins, isSeasonComplete, isSkinGuessed } from '../utils/progress';
import { groupOutfitsBySeason, sortOutfitsByNumber } from '../utils/seasonSort';
import { groupOutfitsBySeries } from '../utils/seriesSort';
import { MAX_SKIN_LEVEL, getSkinLevel, getSkinXp, xpProgress } from '../utils/skinLevels';

const SORT_MODES = {
  NUMBER: 'number',
  SEASON: 'season',
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

function CatalogueCard({ outfit, guessedSkinIds, skinLevels }) {
  const isRevealed = isSkinGuessed(guessedSkinIds, outfit);
  const level = isRevealed ? getSkinLevel(skinLevels, outfit.id) : 0;
  const progress = isRevealed ? xpProgress(skinLevels, outfit.id) : null;

  return (
    <article
      key={outfit.id}
      className={`catalogue-card ${isRevealed ? 'revealed' : 'hidden'} ${
        level >= MAX_SKIN_LEVEL ? 'level-max' : ''
      }`}
    >
      <span className="catalogue-number">{outfit.number}.</span>
      <div className="catalogue-image-wrap">
        <CatalogueImage outfit={outfit} silhouette={!isRevealed} />
      </div>
      <p className="catalogue-name">{isRevealed ? outfit.name : '?'}</p>
      {isRevealed ? (
        <p className="skin-level-badge" title={`${getSkinXp(skinLevels, outfit.id)} XP`}>
          Lv {level}
          {progress?.next != null
            ? ` · ${progress.intoLevel}/${progress.needed} XP`
            : ' · MAX'}
        </p>
      ) : null}
    </article>
  );
}

function CatalogueGrid({ outfits, guessedSkinIds, skinLevels }) {
  return (
    <div className="catalogue-grid">
      {outfits.map((outfit) => (
        <CatalogueCard
          key={outfit.id}
          outfit={outfit}
          guessedSkinIds={guessedSkinIds}
          skinLevels={skinLevels}
        />
      ))}
    </div>
  );
}

function CatalogueSections({ sections, guessedSkinIds, skinLevels, showCounts = false }) {
  return (
    <div className="catalogue-season-sections">
      {sections.map((section) => {
        const sectionComplete = isSeasonComplete(section.outfits, guessedSkinIds);
        const label = showCounts
          ? `${section.label} (${countDiscoveredSkins(section.outfits, guessedSkinIds)}/${section.outfits.length})`
          : section.label;

        return (
          <section key={section.key} className="catalogue-season-section">
            <h2 className={`catalogue-season-heading ${sectionComplete ? 'complete' : ''}`}>
              <span className="catalogue-season-label">{label}</span>
              <span className="catalogue-season-underline" aria-hidden="true" />
            </h2>
            <CatalogueGrid
              outfits={section.outfits}
              guessedSkinIds={guessedSkinIds}
              skinLevels={skinLevels}
            />
          </section>
        );
      })}
    </div>
  );
}

export default function SkinCatalogue({
  outfits,
  guessedSkinIds,
  skinLevels = {},
  onBack,
  onOpenSidekicks,
}) {
  const [sortMode, setSortMode] = useState(SORT_MODES.NUMBER);

  const catalogueOutfits = useMemo(
    () =>
      sortOutfitsByNumber(getGameOutfits(outfits)).map((outfit, index) => ({
        ...outfit,
        number: outfit.number ?? index + 1,
      })),
    [outfits]
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
        <button type="button" className="secondary-button catalogue-back-button" onClick={onBack}>
          Return to Hangman Game
        </button>
      </header>

      <div className="catalogue-scroll" tabIndex={0} aria-label="Skin catalogue list">
        {sortMode === SORT_MODES.NUMBER && (
          <CatalogueGrid
            outfits={catalogueOutfits}
            guessedSkinIds={guessedSkinIds}
            skinLevels={skinLevels}
          />
        )}

        {sortMode === SORT_MODES.SEASON && (
          <CatalogueSections
            sections={seasonSections}
            guessedSkinIds={guessedSkinIds}
            skinLevels={skinLevels}
            showCounts
          />
        )}

        {sortMode === SORT_MODES.SERIES && (
          <CatalogueSections
            sections={seriesSections}
            guessedSkinIds={guessedSkinIds}
            skinLevels={skinLevels}
            showCounts
          />
        )}
      </div>

      <nav className="catalogue-sort-bar" aria-label="Catalogue actions">
        <button
          type="button"
          className={`catalogue-sort-button ${sortMode === SORT_MODES.NUMBER ? 'active' : ''}`}
          onClick={() => setSortMode(SORT_MODES.NUMBER)}
        >
          Number
        </button>
        <button
          type="button"
          className={`catalogue-sort-button ${sortMode === SORT_MODES.SEASON ? 'active' : ''}`}
          onClick={() => setSortMode(SORT_MODES.SEASON)}
        >
          Season
        </button>
        <button
          type="button"
          className={`catalogue-sort-button ${sortMode === SORT_MODES.SERIES ? 'active' : ''}`}
          onClick={() => setSortMode(SORT_MODES.SERIES)}
        >
          Series
        </button>
        <button type="button" className="catalogue-sort-button sort-divider" onClick={onOpenSidekicks}>
          Sidekick Catalogue
        </button>
      </nav>

    </div>
  );
}
