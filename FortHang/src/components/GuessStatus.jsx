import { useEffect, useState } from 'react';
import {
  DAILY_LOGIN_BONUS,
  claimDailyLoginBonus,
  formatCountdown,
  getDailyGuessLimit,
  getDailyGuessesRemaining,
  getMsUntilGuessReset,
  guessDayKey,
  loadEconomy,
} from '../utils/economy';

export default function GuessStatus({ economy, onEconomyChange, className = '', showResetHint = true }) {
  const remaining = getDailyGuessesRemaining(economy);
  const limit = getDailyGuessLimit(economy);
  const [msLeft, setMsLeft] = useState(() => getMsUntilGuessReset());

  useEffect(() => {
    const tick = () => {
      setMsLeft(getMsUntilGuessReset());
      if (guessDayKey() !== economy?.daily?.dayKey) {
        const result = claimDailyLoginBonus(loadEconomy());
        onEconomyChange?.(result.economy);
        if (result.ok) {
          window.alert(`Daily login bonus: +${DAILY_LOGIN_BONUS} weebucks!`);
        }
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [economy, onEconomyChange]);

  return (
    <div className={`guess-status ${className}`.trim()}>
      <p className="discovery-count guess-status-line">
        Attempts left today: <strong>{remaining}</strong> / {limit}
        {economy.points ? ` · ${economy.points} weebucks` : ''}
      </p>
      {showResetHint && remaining <= 0 ? (
        <p className="guess-reset-countdown" role="status">
          Out of attempts · resets in <strong>{formatCountdown(msLeft)}</strong> (6:00 AM Central Time)
        </p>
      ) : null}
      {showResetHint && remaining > 0 ? (
        <p className="guess-reset-hint">
          One attempt per skin (win or lose) · resets at 6:00 AM Central Time
        </p>
      ) : null}
    </div>
  );
}
