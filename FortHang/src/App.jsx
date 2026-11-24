import { useCallback, useEffect, useState } from 'react';
import BattleBusTrail from './components/BattleBusTrail';
import FortSort from './components/FortSort';
import HangmanGame from './components/HangmanGame';
import HelpScreen from './components/HelpScreen';
import Shop from './components/Shop';
import SidekickCatalogue from './components/SidekickCatalogue';
import SkinCatalogue from './components/SkinCatalogue';
import {
  CATALOG_COMPLETE_BONUS,
  awardCatalogCompleteBonus,
  loadEconomy,
  migrateOwnedSidekickIds,
  resetEconomy,
} from './utils/economy';
import { clearAllFortSortData } from './fortSort/storage';
import { getGameOutfits } from './utils/outfits';
import {
  addGuessedSkinId,
  clearGuessedSkinIds,
  isCollectionComplete,
  loadGuessedSkinIds,
  normalizeGuessedSkinIds,
  saveGuessedSkinIds,
} from './utils/progress';
import { clearSkinLevels, loadSkinLevels } from './utils/skinLevels';
import './App.css';

const VIEWS = {
  HANGMAN: 'hangman',
  CATALOGUE: 'catalogue',
  SIDEKICKS: 'sidekicks',
  SHOP: 'shop',
  FORTSORT: 'fortsort',
  TRAIL: 'trail',
  HELP: 'help',
};

function initialView() {
  const params = new URLSearchParams(window.location.search);
  const view = params.get('view');
  if (view === 'fortsort' || window.location.hash === '#fortsort') return VIEWS.FORTSORT;
  if (view === 'trail' || window.location.hash === '#trail') return VIEWS.TRAIL;
  if (view === 'shop') return VIEWS.SHOP;
  if (view === 'sidekicks') return VIEWS.SIDEKICKS;
  if (view === 'help') return VIEWS.HELP;
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
  const [skinLevels, setSkinLevels] = useState(loadSkinLevels);

  useEffect(() => {
    Promise.all([
      fetch(`${import.meta.env.BASE_URL}outfits.json?v=2853`, { cache: 'no-store' }).then((res) => {
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
    setSkinLevels(clearSkinLevels());
    setEconomy(resetEconomy());
    clearAllFortSortData();
  }, []);

  const handleSkinLevelsChange = useCallback((next) => {
    setSkinLevels(next);
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
    <main
      className={`app ${
        view === VIEWS.FORTSORT || view === VIEWS.TRAIL ? 'app-fortsort' : ''
      }`}
    >
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
          onOpenTrail={() => setView(VIEWS.TRAIL)}
          onOpenHelp={() => setView(VIEWS.HELP)}
        />
      ) : view === VIEWS.CATALOGUE ? (
        <SkinCatalogue
          outfits={outfits}
          guessedSkinIds={guessedSkinIds}
          skinLevels={skinLevels}
          onBack={() => setView(VIEWS.HANGMAN)}
          onOpenSidekicks={() => setView(VIEWS.SIDEKICKS)}
        />
      ) : view === VIEWS.SIDEKICKS ? (
        <SidekickCatalogue
          sidekicks={sidekicks}
          economy={economy}
          onBack={() => setView(VIEWS.HANGMAN)}
          onOpenCatalogue={() => setView(VIEWS.CATALOGUE)}
        />
      ) : view === VIEWS.SHOP ? (
        <Shop
          economy={economy}
          sidekicks={sidekicks}
          onEconomyChange={setEconomy}
          onBack={() => setView(VIEWS.HANGMAN)}
        />
      ) : view === VIEWS.HELP ? (
        <HelpScreen onBack={() => setView(VIEWS.HANGMAN)} onDeleteAllData={handleDeleteAllData} />
      ) : view === VIEWS.TRAIL ? (
        <BattleBusTrail
          outfits={outfits}
          guessedSkinIds={guessedSkinIds}
          sidekicks={sidekicks}
          economy={economy}
          onEconomyChange={setEconomy}
          skinLevels={skinLevels}
          onSkinLevelsChange={handleSkinLevelsChange}
          onBack={() => setView(VIEWS.HANGMAN)}
        />
      ) : (
        <FortSort
          outfits={outfits}
          guessedSkinIds={guessedSkinIds}
          economy={economy}
          onEconomyChange={setEconomy}
          skinLevels={skinLevels}
          onSkinLevelsChange={handleSkinLevelsChange}
          onBack={() => setView(VIEWS.HANGMAN)}
        />
      )}
    </main>
  );
}

export default App;
