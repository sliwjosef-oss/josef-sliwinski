import {
  BASE_BOOST_BETS,
  BASE_DAILY_BET_RUNS,
  BASE_STAR_BETS,
  BET_WIN_POINTS,
  BOOST_BET_BONUS_DICE,
  CATALOG_COMPLETE_BONUS,
  DAILY_GUESS_BASE,
  STAR_BET_BONUS_DICE,
  SUPER_BET_ROUND_BONUS,
  TOURNAMENT_WIN_POINTS,
} from '../utils/economy';
import { LEVEL_XP_THRESHOLDS, MAX_SKIN_LEVEL } from '../utils/skinLevels';

const SECTIONS = [
  { id: 'skins', title: 'Collecting skins' },
  { id: 'sidekicks', title: 'Collecting sidekicks' },
  { id: 'weebucks', title: 'Weebucks' },
  { id: 'shop', title: 'Shop' },
  { id: 'fortsort', title: 'FortSort' },
  { id: 'betting', title: 'Betting' },
  { id: 'levels', title: 'Skin levels' },
];

export default function HelpScreen({ onBack }) {
  return (
    <div className="help-screen">
      <header className="catalogue-header">
        <h1>Help</h1>
        <p className="subtitle">How FortHang, the Shop, and FortSort fit together.</p>
        <div className="header-actions">
          <button type="button" className="secondary-button" onClick={onBack}>
            Back to Hangman
          </button>
        </div>
      </header>

      <nav className="help-toc" aria-label="Help topics">
        {SECTIONS.map((section) => (
          <a key={section.id} className="help-toc-link" href={`#help-${section.id}`}>
            {section.title}
          </a>
        ))}
      </nav>

      <section id="help-skins" className="help-section">
        <h2>Collecting skins</h2>
        <p>
          FortHang is hangman with Fortnite outfit names. Each round spends one skin attempt. You get{' '}
          {DAILY_GUESS_BASE} free attempts per day (resets at 6:00 AM America/Chicago). Wins and losses
          both use an attempt.
        </p>
        <p>
          Guess letters before Peely is fully bananated. Season and flavor hints appear while you play.
          A correct name adds that outfit to your Skin Catalogue. Only undiscovered skins are offered
          for hangman rounds.
        </p>
        <p>
          Discovering every skin awards a one-time catalogue-complete bonus of{' '}
          {CATALOG_COMPLETE_BONUS.toLocaleString()} weebucks.
        </p>
      </section>

      <section id="help-sidekicks" className="help-section">
        <h2>Collecting sidekicks</h2>
        <p>
          Sidekicks are collected in the Shop by spending weebucks on sidekick rolls (1, 3, or 5 at a
          time). Each roll has a 10% rare chance and a 1% ultra-rare chance. Duplicates are allowed —
          your Sidekick Catalogue tracks unique kinds and total copies.
        </p>
      </section>

      <section id="help-weebucks" className="help-section">
        <h2>Weebucks</h2>
        <p>
          Weebucks are the FortHang currency. Earn them mainly in FortSort Betting mode when your bet
          skins win matches. Extra sources include tournament-win bonuses and the catalogue-complete
          reward.
        </p>
        <p>
          Spend weebucks in the Shop on more hangman attempts, sidekick rolls, and betting upgrades.
        </p>
      </section>

      <section id="help-shop" className="help-section">
        <h2>Shop</h2>
        <p>The Shop has three kinds of purchases:</p>
        <ul>
          <li>
            <strong>Skin attempt packs</strong> — add hangman attempts for today (they stack until the
            6:00 AM CST reset).
          </li>
          <li>
            <strong>Sidekick rolls</strong> — random sidekick pulls, including rares and ultra-rares.
          </li>
          <li>
            <strong>Betting upgrades</strong> — permanently unlock better FortSort betting tools and
            payouts (more slots, stronger dice, higher Top 8 / Top 64 / tournament rewards, Simulate
            all, Select random, seeding, extra lives, and more daily betting runs).
          </li>
        </ul>
        <p>Many upgrades unlock in tiers — buy the earlier one before the next appears as Available.</p>
      </section>

      <section id="help-fortsort" className="help-section">
        <h2>FortSort</h2>
        <p>FortSort is a ranking / tournament playground for skins you have already discovered.</p>
        <ul>
          <li>
            <strong>Rank</strong> — pick skins and sort them favorite to least favorite.
          </li>
          <li>
            <strong>Bracket</strong> — pick skins and manually choose winners in a double-elimination
            bracket.
          </li>
          <li>
            <strong>Simulate</strong> — dice decide each matchup. Series and star skins roll more
            d100s and keep the highest.
          </li>
          <li>
            <strong>Betting</strong> — every discovered skin enters a simulated double-elim. You pick
            which skins to bet on (see Betting below).
          </li>
        </ul>
        <p>Finished tournaments can be saved and reopened from the Saved list.</p>
      </section>

      <section id="help-betting" className="help-section">
        <h2>Betting</h2>
        <p>
          Betting uses weebucks and daily runs (base {BASE_DAILY_BET_RUNS} per day, upgradeable). Each
          run starts a full field of discovered skins. You choose up to {BASE_STAR_BETS} super bet
          (upgradeable) and {BASE_BOOST_BETS} bet skins (upgradeable).
        </p>
        <ul>
          <li>
            <strong>Super bets</strong> — +{STAR_BET_BONUS_DICE} dice by default (shop can raise to
            +5), +{SUPER_BET_ROUND_BONUS} weebuck on every round payout, and 2× placement XP. Optional
            shop unlock: one extra life per super bet per run (first loss flips to a win).
          </li>
          <li>
            <strong>Bets</strong> — +{BOOST_BET_BONUS_DICE} dice by default (shop can raise to +3).
          </li>
          <li>
            <strong>Base payout</strong> — {BET_WIN_POINTS} weebucks per bet-skin win. Shop upgrades
            raise Top 8 and Top 64 wins, and the tournament-win bonus (starts at{' '}
            {TOURNAMENT_WIN_POINTS}).
          </li>
          <li>
            <strong>Locks</strong> — skins you bet stay locked until Monday 00:00 America/Chicago.
          </li>
          <li>
            <strong>Seeding</strong> — with the shop unlock, super bets take the top seeds, then bet
            skins, then everyone else.
          </li>
        </ul>
        <p>
          The betting status panel tracks your picks, eliminations, places, rolls, and any extra-life
          💖 flips.
        </p>
      </section>

      <section id="help-levels" className="help-section">
        <h2>Skin levels</h2>
        <p>
          Bet skins earn XP from tournament place at the end of a betting run. Super bets earn double
          XP.
        </p>
        <ul>
          <li>1st place: 200 XP</li>
          <li>2nd–4th: 100 XP</li>
          <li>5th–7th: 50 XP</li>
          <li>Everyone else who entered as a bet: 25 XP</li>
        </ul>
        <p>
          Levels go from 0 to {MAX_SKIN_LEVEL}. Level 1 costs 100 XP. Each next level costs 100 XP
          more than the one before it, so level 2 costs 200 (300 total) and level 3 costs 300 (600
          total). Totals to reach each level: {LEVEL_XP_THRESHOLDS.slice(1).join(', ')}.
        </p>
        <p>Higher levels raise a skin’s minimum d100 roll in Simulate / Betting:</p>
        <ul>
          <li>
            <strong>Level 1+</strong> — rolls below 6 are raised to 6
          </li>
          <li>
            <strong>Level 3+</strong> — rolls below 11 are raised to 11
          </li>
          <li>
            <strong>Level 5</strong> — rolls below 21 are raised to 21
          </li>
        </ul>
        <p>Check a skin’s level and XP in the Skin Catalogue.</p>
      </section>
    </div>
  );
}
