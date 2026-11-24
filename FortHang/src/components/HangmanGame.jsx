import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createOutfitQueue,
  formatHint,
  getLettersInWord,
  getPlayableOutfits,
  HANGMAN_IMAGES,
  isLetter,
  isWordComplete,
  MAX_WRONG_GUESSES,
  TITLE_IMAGE,
} from '../utils/hangman';
import {
  getOutfitIconFallbackSrc,
  getOutfitIconSrc,
  getOutfitSilhouetteSrc,
} from '../utils/outfits';
import {
  canSpendGuess,
  getDailyGuessLimit,
  getDailyGuessesRemaining,
  spendGuess,
} from '../utils/economy';
import { countDiscoveredSkins, isCollectionComplete } from '../utils/progress';
import CollectionCompleteScreen, {
  COMPLETE_ALT,
  COMPLETE_IMAGE,
} from './CollectionCompleteScreen';
import GuessStatus from './GuessStatus';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const GAME_STATES = {
  IDLE: 'idle',
  PLAYING: 'playing',
  WON: 'won',
  LOST: 'lost',
};

function renderWordChar(char, key, guessedLetters) {
  if (!isLetter(char)) {
    return (
      <span key={key} className="word-char symbol">
        {char}
      </span>
    );
  }

  const revealed = guessedLetters.has(char.toUpperCase());
  return (
    <span key={key} className={`word-char ${revealed ? 'revealed' : 'hidden'}`}>
      {revealed ? char.toUpperCase() : '_'}
    </span>
  );
}

function OutfitGuessImage({ outfit, reveal = false }) {
  const src = reveal ? getOutfitIconSrc(outfit) : getOutfitSilhouetteSrc(outfit);

  if (!src) {
    return (
      <span className="outfit-guess-placeholder" aria-hidden="true">
        ?
      </span>
    );
  }

  const image = (
    <img
      src={src}
      alt={reveal ? outfit.name : ''}
      className={reveal ? 'outfit-guess-image' : 'outfit-guess-silhouette'}
      aria-hidden={reveal ? undefined : true}
      onError={(event) => {
        if (reveal) {
          const fallback = getOutfitIconFallbackSrc(outfit);
          if (fallback && event.currentTarget.src !== fallback) {
            event.currentTarget.src = fallback;
          }
          return;
        }

        const fallback = getOutfitIconSrc(outfit);
        if (fallback && event.currentTarget.src !== fallback) {
          event.currentTarget.src = fallback;
          event.currentTarget.className = 'outfit-guess-image outfit-guess-silhouette-fallback';
        }
      }}
    />
  );

  if (reveal) return image;

  return (
    <div className="outfit-silhouette-frame">
      <div className="outfit-silhouette-inner">{image}</div>
    </div>
  );
}

function MenuLinks({
  onOpenCatalogue,
  onOpenSidekicks,
  onOpenShop,
  onOpenFortSort,
  onOpenTrail,
  onOpenHelp,
}) {
  return (
    <div className="menu-actions">
      <button type="button" className="secondary-button" onClick={onOpenCatalogue}>
        Skin Catalogue
      </button>
      <button type="button" className="secondary-button" onClick={onOpenSidekicks}>
        Sidekick Catalogue
      </button>
      {onOpenTrail ? (
        <button type="button" className="secondary-button" onClick={onOpenTrail}>
          Battle Bus Trail
        </button>
      ) : null}
      <button type="button" className="secondary-button" onClick={onOpenFortSort}>
        Betting
      </button>
      <button type="button" className="secondary-button" onClick={onOpenShop}>
        Shop
      </button>
      {onOpenHelp ? (
        <button type="button" className="secondary-button" onClick={onOpenHelp}>
          Help
        </button>
      ) : null}
    </div>
  );
}

function WordDisplay({ word, guessedLetters }) {
  const words = word.split(' ');

  return (
    <div className="word-display" aria-label="Guessed word">
      {words.map((segment, wordIndex) => (
        <span key={`word-${wordIndex}`} className="word-group">
          {segment.split('').map((char, charIndex) =>
            renderWordChar(char, `${wordIndex}-${charIndex}-${char}`, guessedLetters)
          )}
        </span>
      ))}
    </div>
  );
}

export default function HangmanGame({
  outfits,
  guessedSkinIds,
  economy,
  onEconomyChange,
  onSkinWon,
  onOpenCatalogue,
  onOpenSidekicks,
  onOpenShop,
  onOpenFortSort,
  onOpenTrail,
  onOpenHelp,
  inputEnabled = true,
}) {
  const [gameState, setGameState] = useState(GAME_STATES.IDLE);
  const [currentOutfit, setCurrentOutfit] = useState(null);
  const [guessedLetters, setGuessedLetters] = useState(new Set());
  const [wrongGuesses, setWrongGuesses] = useState(0);
  const outfitQueueRef = useRef(null);
  const guessesRemaining = getDailyGuessesRemaining(economy);
  const guessesLimit = getDailyGuessLimit(economy);

  const remainingOutfits = useMemo(
    () => getPlayableOutfits(outfits, guessedSkinIds),
    [outfits, guessedSkinIds]
  );

  const hint = useMemo(
    () => (currentOutfit ? formatHint(currentOutfit) : null),
    [currentOutfit]
  );

  const discoveredCount = countDiscoveredSkins(outfits, guessedSkinIds);
  const collectionComplete = isCollectionComplete(outfits, guessedSkinIds);

  const peelyStage = gameState === GAME_STATES.WON ? 0 : wrongGuesses;

  const returnToMenu = useCallback(() => {
    setGameState(GAME_STATES.IDLE);
    setCurrentOutfit(null);
    setGuessedLetters(new Set());
    setWrongGuesses(0);
  }, []);

  const startGame = useCallback(() => {
    if (!canSpendGuess(economy)) return;
    const playableOutfits = getPlayableOutfits(outfits, guessedSkinIds);
    if (playableOutfits.length === 0) return;

    outfitQueueRef.current = createOutfitQueue(playableOutfits);
    const outfit = outfitQueueRef.current.next();
    if (!outfit) return;

    const spent = spendGuess(economy);
    onEconomyChange(spent.economy);
    if (!spent.ok) return;

    setCurrentOutfit(outfit);
    setGuessedLetters(new Set());
    setWrongGuesses(0);
    setGameState(GAME_STATES.PLAYING);
  }, [outfits, guessedSkinIds, economy, onEconomyChange]);

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

  useEffect(() => {
    if (!inputEnabled || gameState !== GAME_STATES.PLAYING) return;

    const handleKeyDown = (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      const letter = event.key.toUpperCase();
      if (!/^[A-Z]$/.test(letter)) return;

      event.preventDefault();
      handleGuess(letter);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inputEnabled, gameState, handleGuess]);

  if (gameState === GAME_STATES.PLAYING && currentOutfit) {
    return (
      <div className="hangman-game hangman-game--playing">
        <header className="game-header play-header">
          <h1 className="attempts-left-heading">
            Attempts left today: {guessesRemaining} / {guessesLimit}
          </h1>
          <button
            type="button"
            className="secondary-button play-catalogue-button"
            onClick={onOpenCatalogue}
          >
            Skin Catalogue
          </button>
        </header>

        <section className="hint-panel">
          {hint?.seasonLine || hint?.flavorLine ? (
            <>
              {hint.seasonLine ? <p className="hint-line">{hint.seasonLine}</p> : null}
              {hint.flavorLine ? <p className="hint-line flavor">{hint.flavorLine}</p> : null}
            </>
          ) : (
            <p className="hint-line muted">No season or flavor text available for this skin.</p>
          )}
        </section>

        <section className="hangman-stage hangman-stage--play">
          <div className="outfit-guess-board playing">
            <OutfitGuessImage outfit={currentOutfit} />
          </div>
          <p className="wrong-count">
            Wrong guesses: {wrongGuesses} / {MAX_WRONG_GUESSES}
          </p>
        </section>

        <WordDisplay word={currentOutfit.name} guessedLetters={guessedLetters} />

        <div className="keyboard" role="group" aria-label="Letter keyboard">
          {ALPHABET.map((letter) => {
            const guessed = guessedLetters.has(letter);
            const inWord = getLettersInWord(currentOutfit.name).has(letter);
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

        <div className="peely-footer">
          <img
            src={HANGMAN_IMAGES[peelyStage]}
            alt={`Peely damage stage ${peelyStage} of ${MAX_WRONG_GUESSES}`}
            className="peely-image"
          />
        </div>
      </div>
    );
  }

  if (
    (gameState === GAME_STATES.WON || gameState === GAME_STATES.LOST) &&
    currentOutfit
  ) {
    return (
      <div className="hangman-game hangman-game--result">
        <header className="game-header play-header">
          <h1 className="attempts-left-heading">
            Attempts left today: {guessesRemaining} / {guessesLimit}
          </h1>
          <p className="discovery-count">
            Catalogue: {discoveredCount} / {outfits.length} skins discovered
          </p>
          <button
            type="button"
            className="secondary-button play-catalogue-button"
            onClick={onOpenCatalogue}
          >
            Skin Catalogue
          </button>
        </header>

        <div className="peely-footer">
          <img
            src={HANGMAN_IMAGES[peelyStage]}
            alt={`Peely damage stage ${peelyStage} of ${MAX_WRONG_GUESSES}`}
            className="peely-image"
          />
        </div>

        <section className="hangman-stage hangman-stage--play">
          <div className="outfit-guess-board">
            {gameState === GAME_STATES.WON ? (
              <div className="skin-reveal-panel">
                <span className="skin-reveal-number">#{currentOutfit.number}</span>
                <OutfitGuessImage outfit={currentOutfit} reveal />
              </div>
            ) : (
              <OutfitGuessImage outfit={currentOutfit} />
            )}
          </div>
        </section>

        <WordDisplay word={currentOutfit.name} guessedLetters={guessedLetters} />

        <div className="result-panel">
          {gameState === GAME_STATES.WON ? (
            <>
              <p className="result-message win">
                You guessed it! The outfit was {currentOutfit.name}.
              </p>
              <p className="catalogue-unlock">
                Catalogue #{currentOutfit.number} — added to your skin catalogue!
              </p>
            </>
          ) : (
            <p className="result-message lose">Game over! The outfit was {currentOutfit.name}.</p>
          )}
          {remainingOutfits.length > 0 ? (
            guessesRemaining > 0 ? (
              <p className="play-again-prompt">Would you like to play again?</p>
            ) : (
              <p className="play-again-prompt">
                Out of daily attempts (wins and losses both count) — visit the Shop or wait for 6:00
                AM CST.
              </p>
            )
          ) : (
            <p className="play-again-prompt">You have discovered every outfit in the catalogue!</p>
          )}
          <div className="result-actions">
            {remainingOutfits.length > 0 && guessesRemaining > 0 ? (
              <button type="button" className="primary-button" onClick={startGame}>
                Play Again
              </button>
            ) : remainingOutfits.length > 0 ? (
              <button type="button" className="primary-button" onClick={onOpenShop}>
                Open Shop
              </button>
            ) : null}
            <button type="button" className="secondary-button" onClick={returnToMenu}>
              Main Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="hangman-game">
      <header className="game-header">
        <img
          src={collectionComplete ? COMPLETE_IMAGE : TITLE_IMAGE}
          alt={collectionComplete ? COMPLETE_ALT : 'Fortnite Hangman'}
          className="game-title-image"
        />
        <p className="subtitle">Guess the outfit name before Peely gets bananated!</p>
        {!collectionComplete ? (
          <GuessStatus
            economy={economy}
            onEconomyChange={onEconomyChange}
            showResetHint
          />
        ) : null}
      </header>

      {collectionComplete ? (
        <CollectionCompleteScreen
          showImage={false}
          onOpenCatalogue={onOpenCatalogue}
          onOpenSidekicks={onOpenSidekicks}
          onOpenShop={onOpenShop}
          onOpenFortSort={onOpenFortSort}
          onOpenTrail={onOpenTrail}
          onOpenHelp={onOpenHelp}
        />
      ) : (
        <div className="action-panel">
          {remainingOutfits.length > 0 ? (
            <>
              <p className="prompt">Ready to guess a Fortnite outfit?</p>
              {guessesRemaining > 0 ? (
                <button type="button" className="primary-button" onClick={startGame}>
                  Start Game
                </button>
              ) : (
                <>
                  <GuessStatus economy={economy} onEconomyChange={onEconomyChange} />
                  <p className="prompt">
                    Buy more attempts in the Shop with weebucks, or wait for the daily reset. Wins
                    and losses both use an attempt.
                  </p>
                  <button type="button" className="primary-button" onClick={onOpenShop}>
                    Open Shop
                  </button>
                </>
              )}
              <p className="discovery-count">
                Catalogue: {discoveredCount} / {outfits.length} skins discovered
              </p>
              <MenuLinks
                onOpenCatalogue={onOpenCatalogue}
                onOpenSidekicks={onOpenSidekicks}
                onOpenShop={onOpenShop}
                onOpenFortSort={onOpenFortSort}
                onOpenTrail={onOpenTrail}
                onOpenHelp={onOpenHelp}
              />
            </>
          ) : (
            <>
              <p className="prompt">You have discovered every outfit in the catalogue. Great job!</p>
              <p className="discovery-count">
                Catalogue: {discoveredCount} / {outfits.length} skins discovered
              </p>
              <MenuLinks
                onOpenCatalogue={onOpenCatalogue}
                onOpenSidekicks={onOpenSidekicks}
                onOpenShop={onOpenShop}
                onOpenFortSort={onOpenFortSort}
                onOpenTrail={onOpenTrail}
                onOpenHelp={onOpenHelp}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
