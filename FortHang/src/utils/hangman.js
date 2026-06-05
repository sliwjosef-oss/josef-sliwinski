import { hasValidSeason, resolveAssetPath } from './outfits';
import { isSkinGuessed } from './progress';

export const MAX_WRONG_GUESSES = 6;
export const HANGMAN_IMAGES = Array.from(
  { length: MAX_WRONG_GUESSES + 1 },
  (_, i) => resolveAssetPath(`hangman/hangman_${i}.png`)
);

export function isLetter(char) {
  return /[a-zA-Z]/.test(char);
}

export function getLettersInWord(word) {
  const letters = new Set();
  for (const char of word) {
    if (isLetter(char)) {
      letters.add(char.toUpperCase());
    }
  }
  return letters;
}

export function isWordComplete(word, guessedLetters) {
  for (const char of word) {
    if (isLetter(char) && !guessedLetters.has(char.toUpperCase())) {
      return false;
    }
  }
  return true;
}

export function shuffleArray(items) {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function getPlayableOutfits(outfits, guessedSkinIds = []) {
  return outfits
    .filter(hasValidSeason)
    .filter((outfit) => getLettersInWord(outfit.name).size > 0)
    .filter((outfit) => !isSkinGuessed(guessedSkinIds, outfit));
}

export function createOutfitQueue(outfits) {
  const queue = shuffleArray(outfits);

  return {
    next() {
      if (queue.length === 0) return null;
      return queue.pop();
    },
    remaining() {
      return queue.length;
    },
    total() {
      return outfits.length;
    },
  };
}

export function formatHint(outfit) {
  const parts = [];

  if (outfit.introductionText) {
    parts.push(outfit.introductionText);
  } else if (outfit.chapter && outfit.season) {
    parts.push(`Introduced in Chapter ${outfit.chapter}, Season ${outfit.season}.`);
  }

  if (outfit.setText) {
    parts.push(outfit.setText);
  }

  return parts;
}
