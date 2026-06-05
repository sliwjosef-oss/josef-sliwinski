import { useCallback, useMemo, useRef, useState } from 'react';
import {
  createOutfitQueue,
  formatHint,
  getLettersInWord,
  HANGMAN_IMAGES,
  isLetter,
  isWordComplete,
  MAX_WRONG_GUESSES,
} from '../utils/hangman';
import { getOutfitIconSrc, resolveAssetPath } from '../utils/outfits';
import { countDiscoveredSkins } from '../utils/progress';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const GAME_STATES = {
  IDLE: 'idle',
  PLAYING: 'playing',
  WON: 'won',
  LOST: 'lost',
};

function WordDisplay({ word, guessedLetters }) {
  return (
    <div className="word-display" aria-label="Guessed word">
      {word.split('').map((char, index) => {
        if (!isLetter(char)) {
          return (
            <span key={`${index}-${char}`} className="word-char symbol">
              {char}
            </span>
          );
        }

        const revealed = guessedLetters.has(char.toUpperCase());
        return (
          <span key={`${index}-${char}`} className={`word-char ${revealed ? 'revealed' : 'hidden'}`}>
            {revealed ? char.toUpperCase() : '_'}
          </span>
        );
      })}
    </div>
  );
}

export default function HangmanGame({ outfits, guessedSkinIds, onSkinWon, onOpenCatalogue }) {
  const [gameState, setGameState] = useState(GAME_STATES.IDLE);
  const [currentOutfit, setCurrentOutfit] = useState(null);
  const [guessedLetters, setGuessedLetters] = useState(new Set());
  const [wrongGuesses, setWrongGuesses] = useState(0);
  const outfitQueueRef = useRef(null);

  if (!outfitQueueRef.current && outfits.length > 0) {
    outfitQueueRef.current = createOutfitQueue(outfits);
  }

  const hintLines = useMemo(
    () => (currentOutfit ? formatHint(currentOutfit) : []),
    [currentOutfit]
  );

  const discoveredCount = countDiscoveredSkins(outfits, guessedSkinIds);

  const startGame = useCallback(() => {
    if (!outfitQueueRef.current) return;

    const outfit = outfitQueueRef.current.next();
    setCurrentOutfit(outfit);
    setGuessedLetters(new Set());
    setWrongGuesses(0);
    setGameState(GAME_STATES.PLAYING);
  }, []);

  const handleGuess = useCallback(
    (letter) => {
      if (gameState !== GAME_STATES.PLAYING || !currentOutfit) return;
      if (guessedLetters.has(letter)) return;

      const wordLetters = getLettersInWord(currentOutfit.name);
      const nextGuessed = new Set(guessedLetters);
      nextGuessed.add(letter);

      if (!wordLetters.has(letter)) {
        const nextWrong = wrongGuesses + 1;
        setWrongGuesses(nextWrong);
        setGuessedLetters(nextGuessed);

        if (nextWrong >= MAX_WRONG_GUESSES) {
          setGameState(GAME_STATES.LOST);
        }
        return;
      }

      setGuessedLetters(nextGuessed);

      if (isWordComplete(currentOutfit.name, nextGuessed)) {
        onSkinWon(currentOutfit);
        setGameState(GAME_STATES.WON);
      }
    },
    [gameState, currentOutfit, guessedLetters, wrongGuesses, onSkinWon]
  );

  return (
    <div className="hangman-game">
      <header className="game-header">
        <h1>Fortnite Hangman</h1>
        <p className="subtitle">Guess the outfit name before the hangman is complete!</p>
        <p className="discovery-count">
          Catalogue: {discoveredCount} / {outfits.length} skins discovered
        </p>
        <div className="header-actions">
          <button type="button" className="secondary-button" onClick={onOpenCatalogue}>
            Skin Catalogue
          </button>
        </div>
      </header>

      {gameState === GAME_STATES.PLAYING && currentOutfit && (
        <section className="hint-panel">
          {hintLines.length > 0 ? (
            hintLines.map((line) => (
              <p key={line} className="hint-line">
                {line}
              </p>
            ))
          ) : (
            <p className="hint-line muted">No season or set info available for this skin.</p>
          )}
        </section>
      )}

      <section className="hangman-stage">
        <div className="hangman-board">
          {gameState === GAME_STATES.WON && currentOutfit ? (
            <div className="skin-reveal-panel">
              <span className="skin-reveal-number">#{currentOutfit.number}</span>
              <img
                src={getOutfitIconSrc(currentOutfit)}
                alt={currentOutfit.name}
                className="skin-reveal-image"
                onError={(event) => {
                  const fallback = resolveAssetPath(`skin-icons/${currentOutfit.number}.png`);
                  if (event.currentTarget.src !== fallback) {
                    event.currentTarget.src = fallback;
                  }
                }}
              />
            </div>
          ) : (
            <img
              src={HANGMAN_IMAGES[wrongGuesses]}
              alt={`Hangman stage ${wrongGuesses} of ${MAX_WRONG_GUESSES}`}
              className="hangman-image"
            />
          )}
        </div>
        {gameState !== GAME_STATES.WON && (
          <p className="wrong-count">
            Wrong guesses: {wrongGuesses} / {MAX_WRONG_GUESSES}
          </p>
        )}
      </section>

      {currentOutfit && gameState !== GAME_STATES.IDLE && (
        <WordDisplay word={currentOutfit.name} guessedLetters={guessedLetters} />
      )}

      {gameState === GAME_STATES.IDLE && (
        <div className="action-panel">
          <p className="prompt">Ready to guess a Fortnite outfit?</p>
          <button type="button" className="primary-button" onClick={startGame}>
            Start Game
          </button>
        </div>
      )}

      {gameState === GAME_STATES.PLAYING && (
        <div className="keyboard" role="group" aria-label="Letter keyboard">
          {ALPHABET.map((letter) => {
            const guessed = guessedLetters.has(letter);
            const inWord = currentOutfit
              ? getLettersInWord(currentOutfit.name).has(letter)
              : false;
            const isWrong = guessed && !inWord;

            return (
              <button
                key={letter}
                type="button"
                className={`key-button ${guessed ? (isWrong ? 'wrong' : 'correct') : ''}`}
                onClick={() => handleGuess(letter)}
                disabled={guessed}
                aria-label={`Letter ${letter}${guessed ? ', already guessed' : ''}`}
              >
                {letter}
              </button>
            );
          })}
        </div>
      )}

      {(gameState === GAME_STATES.WON || gameState === GAME_STATES.LOST) && currentOutfit && (
        <div className="result-panel">
          {gameState === GAME_STATES.WON ? (
            <>
              <p className="result-message win">You guessed it! The outfit was {currentOutfit.name}.</p>
              <p className="catalogue-unlock">
                Catalogue #{currentOutfit.number} — added to your skin catalogue!
              </p>
            </>
          ) : (
            <p className="result-message lose">
              Game over! The outfit was {currentOutfit.name}.
            </p>
          )}
          <p className="play-again-prompt">Would you like to play again?</p>
          <button type="button" className="primary-button" onClick={startGame}>
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}
