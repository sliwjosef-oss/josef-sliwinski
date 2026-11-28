import { useCallback, useEffect, useState } from 'react';
import { playMenuMusic, setMenuTrack, setOwnedMusicIds } from './audio/menuMusic';
import AchievementPopup from './components/AchievementPopup';
import AchievementsScreen from './components/AchievementsScreen';
import BattleBusTrail from './components/BattleBusTrail';
import FortSort from './components/FortSort';
import HangmanGame from './components/HangmanGame';
import HelpScreen from './components/HelpScreen';
import MusicScreen from './components/MusicScreen';
import Shop from './components/Shop';
import SidekickCatalogue from './components/SidekickCatalogue';
import SkinCatalogue from './components/SkinCatalogue';
import {
  DAILY_LOGIN_BONUS,
  claimDailyLoginBonus,
  loadEconomy,
  migrateOwnedSidekickIds,
  resetEconomy,
} from './utils/economy';
import { checkAchievements } from './utils/achievements';
import { clearAchievementState } from './utils/achievementStore';
import { clearAllFortSortData } from './fortSort/storage';
import { getGameOutfits } from './utils/outfits';
import {
  addGuessedSkinId,
  clearGuessedSkinIds,
  countDiscoveredSkins,
  featureUnlocks,
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
  ACHIEVEMENTS: 'achievements',
  MUSIC: 'music',
};

function initialView() {
  const params = new URLSearchParams(window.location.search);
  const view = params.get('view');
  if (view === 'fortsort' || window.location.hash === '#fortsort') return VIEWS.FORTSORT;
  if (view === 'trail' || window.location.hash === '#trail') return VIEWS.TRAIL;
  if (view === 'shop') return VIEWS.SHOP;
  if (view === 'sidekicks') return VIEWS.SIDEKICKS;
  if (view === 'help') return VIEWS.HELP;
  if (view === 'music') return VIEWS.MUSIC;
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
  const [achievementQueue, setAchievementQueue] = useState([]);

  useEffect(() => {
    playMenuMusic();
    const resume = () => playMenuMusic();
    window.addEventListener('pointerdown', resume);
    return () => window.removeEventListener('pointerdown', resume);
  }, []);

  useEffect(() => {
    const result = claimDailyLoginBonus(loadEconomy());
    setEconomy(result.economy);
    if (result.ok) {
      window.alert(`Daily login bonus: +${DAILY_LOGIN_BONUS} weebucks!`);
    }
  }, []);

  useEffect(() => {
    Promise.all([
      fetch(`${import.meta.env.BASE_URL}outfits.json?v=2860`, { cache: 'no-store' }).then((res) => {
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
        return next;
      });
    },
    [outfits],
  );

  const handleDeleteAllData = useCallback(() => {
    setGuessedSkinIds(clearGuessedSkinIds());
    setSkinLevels(clearSkinLevels());
    setEconomy(resetEconomy());
    clearAchievementState();
    setAchievementQueue([]);
    clearAllFortSortData();
  }, []);

  const handleSkinLevelsChange = useCallback((next) => {
    setSkinLevels(next);
  }, []);

  const gameOutfits = getGameOutfits(outfits);
  const discoveredCount = countDiscoveredSkins(gameOutfits, guessedSkinIds);

  useEffect(() => {
    const onUnlock = (event) => {
      const unlocked = event.detail?.unlocked || [];
      if (unlocked.length) setAchievementQueue((current) => [...current, ...unlocked]);
      if (event.detail?.economy) setEconomy(event.detail.economy);
    };
    window.addEventListener('forthang-achievements', onUnlock);
    return () => window.removeEventListener('forthang-achievements', onUnlock);
  }, []);

  useEffect(() => {
    if (!outfits.length) return;
    checkAchievements({
      discoveredCount,
      totalSkins: gameOutfits.length,
      sidekicks,
    });
  }, [outfits, sidekicks, guessedSkinIds, economy, skinLevels, discoveredCount, gameOutfits.length]);

  useEffect(() => {
    const current = achievementQueue[0];
    if (!current?.trackId) return;
    setMenuTrack(current.trackId);
    playMenuMusic();
  }, [achievementQueue]);
  const unlocks = featureUnlocks(discoveredCount);
  setOwnedMusicIds(economy.ownedMusicIds);

  useEffect(() => {
    if (!outfits.length) return;
    if (view === VIEWS.TRAIL && !unlocks.trail) setView(VIEWS.HANGMAN);
    if (view === VIEWS.FORTSORT && !unlocks.betting) setView(VIEWS.HANGMAN);
    if (view === VIEWS.SHOP && !unlocks.shop) setView(VIEWS.HANGMAN);
    if (view === VIEWS.MUSIC && !unlocks.music) setView(VIEWS.HANGMAN);
  }, [outfits.length, view, unlocks.trail, unlocks.betting, unlocks.shop, unlocks.music]);

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
      {view === VIEWS.HANGMAN || view === VIEWS.CATALOGUE ? (
        <div hidden={view !== VIEWS.HANGMAN}>
          <HangmanGame
            outfits={outfits}
            guessedSkinIds={guessedSkinIds}
            economy={economy}
            onEconomyChange={setEconomy}
            onSkinWon={handleSkinWon}
            onOpenCatalogue={() => setView(VIEWS.CATALOGUE)}
            onOpenSidekicks={() => setView(VIEWS.SIDEKICKS)}
            onOpenShop={() => {
              if (unlocks.shop) setView(VIEWS.SHOP);
            }}
            onOpenFortSort={() => {
              if (unlocks.betting) setView(VIEWS.FORTSORT);
            }}
            onOpenTrail={() => {
              if (unlocks.trail) setView(VIEWS.TRAIL);
            }}
            onOpenHelp={() => setView(VIEWS.HELP)}
            onOpenAchievements={() => setView(VIEWS.ACHIEVEMENTS)}
            onOpenMusic={() => {
              if (unlocks.music) setView(VIEWS.MUSIC);
            }}
            inputEnabled={view === VIEWS.HANGMAN}
          />
        </div>
      ) : null}
      {view === VIEWS.CATALOGUE ? (
        <SkinCatalogue
          outfits={outfits}
          guessedSkinIds={guessedSkinIds}
          skinLevels={skinLevels}
          onBack={() => setView(VIEWS.HANGMAN)}
          onOpenSidekicks={() => setView(VIEWS.SIDEKICKS)}
        />
      ) : null}
      {view === VIEWS.SIDEKICKS ? (
        <SidekickCatalogue
          sidekicks={sidekicks}
          economy={economy}
          onBack={() => setView(VIEWS.HANGMAN)}
          onOpenCatalogue={() => setView(VIEWS.CATALOGUE)}
        />
      ) : null}
      {view === VIEWS.SHOP ? (
        <Shop
          economy={economy}
          sidekicks={sidekicks}
          onEconomyChange={setEconomy}
          musicUnlocked={unlocks.music}
          onBack={() => setView(VIEWS.HANGMAN)}
        />
      ) : null}
      {view === VIEWS.HELP ? (
        <HelpScreen onBack={() => setView(VIEWS.HANGMAN)} onDeleteAllData={handleDeleteAllData} />
      ) : null}
      {view === VIEWS.ACHIEVEMENTS ? (
        <AchievementsScreen
          onBack={() => setView(VIEWS.HANGMAN)}
          discoveredCount={discoveredCount}
          totalSkins={gameOutfits.length}
          sidekicks={sidekicks}
        />
      ) : null}
      <AchievementPopup
        achievement={achievementQueue[0] || null}
        onClose={() => setAchievementQueue((current) => current.slice(1))}
      />
      {view === VIEWS.MUSIC ? (
        <MusicScreen onBack={() => setView(VIEWS.HANGMAN)} />
      ) : null}
      {view === VIEWS.TRAIL ? (
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
      ) : null}
      {view === VIEWS.FORTSORT ? (
        <FortSort
          outfits={outfits}
          guessedSkinIds={guessedSkinIds}
          sidekicks={sidekicks}
          economy={economy}
          onEconomyChange={setEconomy}
          skinLevels={skinLevels}
          onSkinLevelsChange={handleSkinLevelsChange}
          onBack={() => setView(VIEWS.HANGMAN)}
        />
      ) : null}
    </main>
  );
}

export default App;
