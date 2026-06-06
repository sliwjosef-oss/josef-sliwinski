import { useCallback, useEffect, useState } from 'react';
import HangmanGame from './components/HangmanGame';
import SkinCatalogue from './components/SkinCatalogue';
import { getGameOutfits } from './utils/outfits';
import {
  addGuessedSkinId,
  loadGuessedSkinIds,
  normalizeGuessedSkinIds,
  saveGuessedSkinIds,
} from './utils/progress';
import './App.css';

const VIEWS = {
  HANGMAN: 'hangman',
  CATALOGUE: 'catalogue',
};

function App() {
  const [view, setView] = useState(VIEWS.HANGMAN);
  const [outfits, setOutfits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [guessedSkinIds, setGuessedSkinIds] = useState(loadGuessedSkinIds);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}outfits.json?v=2674`, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load outfit data');
        return res.json();
      })
      .then((data) => {
        const gameOutfits = getGameOutfits(data);
        setOutfits(gameOutfits);
        setGuessedSkinIds((current) => {
          const normalized = normalizeGuessedSkinIds(current, gameOutfits);
          if (normalized.length !== current.length || normalized.some((id, i) => id !== current[i])) {
            saveGuessedSkinIds(normalized);
          }
          return normalized;
        });
        setLoading(false);
      })
      .catch((err) => {
        setLoadError(err.message);
        setLoading(false);
      });
  }, []);

  const handleSkinWon = useCallback((outfit) => {
    setGuessedSkinIds((current) => addGuessedSkinId(current, outfit.id));
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
    <main className="app">
      {view === VIEWS.HANGMAN ? (
        <HangmanGame
          outfits={outfits}
          guessedSkinIds={guessedSkinIds}
          onSkinWon={handleSkinWon}
          onOpenCatalogue={() => setView(VIEWS.CATALOGUE)}
        />
      ) : (
        <SkinCatalogue
          outfits={outfits}
          guessedSkinIds={guessedSkinIds}
          onBack={() => setView(VIEWS.HANGMAN)}
        />
      )}
    </main>
  );
}

export default App;
