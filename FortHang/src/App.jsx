import { useCallback, useEffect, useState } from 'react';
import FortSort from './components/FortSort';
import HangmanGame from './components/HangmanGame';
import Shop from './components/Shop';
import SidekickCatalogue from './components/SidekickCatalogue';
import SkinCatalogue from './components/SkinCatalogue';
import {
  CATALOG_COMPLETE_BONUS,
  awardCatalogCompleteBonus,
  loadEconomy,
  migrateOwnedSidekickIds,
} from './utils/economy';
import { getGameOutfits } from './utils/outfits';
import {
  addGuessedSkinId,
  clearGuessedSkinIds,
  isCollectionComplete,
  loadGuessedSkinIds,
  normalizeGuessedSkinIds,
  saveGuessedSkinIds,
} from './utils/progress';
import './App.css';

const VIEWS = {
  HANGMAN: 'hangman',
  CATALOGUE: 'catalogue',
  SIDEKICKS: 'sidekicks',
  SHOP: 'shop',
  FORTSORT: 'fortsort',
};

function initialView() {
  const params = new URLSearchParams(window.location.search);
  const view = params.get('view');
  if (view === 'fortsort' || window.location.hash === '#fortsort') return VIEWS.FORTSORT;
  if (view === 'shop') return VIEWS.SHOP;
  if (view === 'sidekicks') return VIEWS.SIDEKICKS;
  return VIEWS.HANGMAN;
}

function App() {
  const [view, setView] = useState(initialView);
  const [outfits, setOutfits] = useState([]);
  const [sidekicks, setSidekicks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [guessedSkinIds, setGuessedSkinIds] = useState(loadGuessedSkinIds);
  const [economy, setEconomy] = useState(loadEconomy);

  useEffect(() => {
    Promise.all([
      fetch(`${import.meta.env.BASE_URL}outfits.json?v=2850`, { cache: 'no-store' }).then((res) => {
        if (!res.ok) throw new Error('Failed to load outfit data');
        return res.json();
      }),
      fetch(`${import.meta.env.BASE_URL}sidekicks.json?v=3`, { cache: 'no-store' }).then((res) => {
        if (!res.ok) throw new Error('Failed to load sidekick data');
        return res.json();
      }),
    ])
      .then(([outfitData, sidekickData]) => {
        const gameOutfits = getGameOutfits(outfitData);
        setOutfits(gameOutfits);
        const nextSidekicks = Array.isArray(sidekickData) ? sidekickData : [];
        setSidekicks(nextSidekicks);
        setGuessedSkinIds((current) => {
          const normalized = normalizeGuessedSkinIds(current, gameOutfits);
          if (normalized.length !== current.length || normalized.some((id, i) => id !== current[i])) {
            saveGuessedSkinIds(normalized);
          }
          return normalized;
        });
        setEconomy(() => {
          const current = loadEconomy();
          const ownedSidekickIds = migrateOwnedSidekickIds(current.ownedSidekickIds, nextSidekicks);
          if (ownedSidekickIds.some((id, index) => id !== current.ownedSidekickIds[index])) {
            const next = { ...current, ownedSidekickIds };
            localStorage.setItem('fort-hang-economy-v1', JSON.stringify(next));
            return next;
          }
          return current;
        });
        setLoading(false);
      })
      .catch((err) => {
        setLoadError(err.message);
        setLoading(false);
      });
  }, []);

  const handleSkinWon = useCallback(
    (outfit) => {
      setGuessedSkinIds((current) => {
        const next = addGuessedSkinId(current, outfit.id);
        if (
          outfits.length > 0 &&
          !isCollectionComplete(outfits, current) &&
          isCollectionComplete(outfits, next)
        ) {
          setEconomy((eco) => {
            const result = awardCatalogCompleteBonus(eco);
            if (result.ok) {
              window.alert(
                `Catalogue complete! You earned ${CATALOG_COMPLETE_BONUS.toLocaleString()} weebucks.`,
              );
            }
            return result.economy;
          });
        }
        return next;
      });
    },
    [outfits],
  );

  const handleDeleteAllData = useCallback(() => {
    setGuessedSkinIds(clearGuessedSkinIds());
  }, []);

  if (loading) {
    return (
      <main className="app">
        <div className="status-message">Loading Fortnite outfits...</div>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="app">
        <div className="status-message error">Error: {loadError}</div>
      </main>
    );
  }

  return (
    <main className={`app ${view === VIEWS.FORTSORT ? 'app-fortsort' : ''}`}>
      {view === VIEWS.HANGMAN ? (
        <HangmanGame
          outfits={outfits}
          guessedSkinIds={guessedSkinIds}
          economy={economy}
          onEconomyChange={setEconomy}
          onSkinWon={handleSkinWon}
          onOpenCatalogue={() => setView(VIEWS.CATALOGUE)}
          onOpenSidekicks={() => setView(VIEWS.SIDEKICKS)}
          onOpenShop={() => setView(VIEWS.SHOP)}
          onOpenFortSort={() => setView(VIEWS.FORTSORT)}
        />
      ) : view === VIEWS.CATALOGUE ? (
        <SkinCatalogue
          outfits={outfits}
          guessedSkinIds={guessedSkinIds}
          onBack={() => setView(VIEWS.HANGMAN)}
          onOpenSidekicks={() => setView(VIEWS.SIDEKICKS)}
          onOpenShop={() => setView(VIEWS.SHOP)}
          onOpenFortSort={() => setView(VIEWS.FORTSORT)}
          onDeleteAllData={handleDeleteAllData}
        />
      ) : view === VIEWS.SIDEKICKS ? (
        <SidekickCatalogue
          sidekicks={sidekicks}
          economy={economy}
          onBack={() => setView(VIEWS.HANGMAN)}
          onOpenCatalogue={() => setView(VIEWS.CATALOGUE)}
          onOpenShop={() => setView(VIEWS.SHOP)}
          onOpenFortSort={() => setView(VIEWS.FORTSORT)}
        />
      ) : view === VIEWS.SHOP ? (
        <Shop
          economy={economy}
          sidekicks={sidekicks}
          onEconomyChange={setEconomy}
          onBack={() => setView(VIEWS.HANGMAN)}
          onOpenCatalogue={() => setView(VIEWS.CATALOGUE)}
          onOpenSidekicks={() => setView(VIEWS.SIDEKICKS)}
          onOpenFortSort={() => setView(VIEWS.FORTSORT)}
        />
      ) : (
        <FortSort
          outfits={outfits}
          guessedSkinIds={guessedSkinIds}
          economy={economy}
          onEconomyChange={setEconomy}
          onBack={() => setView(VIEWS.HANGMAN)}
          onOpenShop={() => setView(VIEWS.SHOP)}
        />
      )}
    </main>
  );
}

export default App;
