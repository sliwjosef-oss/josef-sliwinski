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
import { MAX_SKIN_LEVEL, getSkinLevel, getSkinXp, xpProgress } from '../utils/skinLevels';

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

function DeleteAllDataConfirm({ onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" role="presentation" onClick={onCancel}>
      <div
        className="modal-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-all-data-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="delete-all-data-title">Are you sure?</h2>
        <p>
          This permanently deletes everything: discovered skins, weebucks, shop unlocks, sidekicks, skin
          levels, FortSort saves, and resets daily hangman attempts and betting runs.
        </p>
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onCancel}>
            No
          </button>
          <button type="button" className="danger-button" onClick={onConfirm}>
            Yes
          </button>
        </div>
      </div>
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
  onOpenShop,
  onOpenFortSort,
  onDeleteAllData,
}) {
  const [sortMode, setSortMode] = useState(SORT_MODES.NUMBER);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
        <div className="header-actions">
          <button type="button" className="secondary-button" onClick={onBack}>
            Return to Hangman Game
          </button>
          <button type="button" className="secondary-button" onClick={onOpenSidekicks}>
            Sidekick Catalogue
          </button>
          <button type="button" className="secondary-button" onClick={onOpenShop}>
            Shop
          </button>
          <button type="button" className="secondary-button" onClick={onOpenFortSort}>
            FortSort
          </button>
        </div>
      </header>

      {sortMode === SORT_MODES.NUMBER && (
        <CatalogueGrid
          outfits={catalogueOutfits}
          guessedSkinIds={guessedSkinIds}
          skinLevels={skinLevels}
        />
      )}

      {sortMode === SORT_MODES.ALPHABETICAL && (
        <CatalogueGrid
          outfits={alphabeticalOutfits}
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

      <footer className="catalogue-footer">
        <button
          type="button"
          className="danger-button"
          onClick={() => setShowDeleteConfirm(true)}
        >
          Delete All Data
        </button>
      </footer>

      {showDeleteConfirm && (
        <DeleteAllDataConfirm
          onConfirm={() => {
            setShowDeleteConfirm(false);
            onDeleteAllData?.();
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
