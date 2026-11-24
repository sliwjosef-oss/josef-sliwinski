import { useState } from 'react';
import {
  BASE_BOOST_BETS,
  BASE_DAILY_BET_RUNS,
  BASE_DAILY_TRAIL_RUNS,
  BASE_STAR_BETS,
  BET_WIN_POINTS,
  BOOST_BET_BONUS_DICE,
  CATALOG_COMPLETE_BONUS,
  DAILY_GUESS_BASE,
  DAILY_TRAIL_RUNS_TIER1,
  STAR_BET_BONUS_DICE,
  SUPER_BET_ROUND_BONUS,
  TOURNAMENT_WIN_POINTS,
  TRAIL_FALLEN_PAYOUT,
  TRAIL_FALLEN_PAYOUT_TIER1,
  TRAIL_FALLEN_XP,
  TRAIL_SURVIVOR_PAYOUT,
  TRAIL_SURVIVOR_PAYOUT_TIER1,
  TRAIL_SURVIVOR_XP,
} from '../utils/economy';
import { FIVE_STAR_NAMES, THREE_STAR_NAMES } from '../fortSort/simulate';
import { LEVEL_XP_THRESHOLDS, MAX_SKIN_LEVEL } from '../utils/skinLevels';

const SECTIONS = [
  { id: 'skins', title: 'Collecting skins' },
  { id: 'sidekicks', title: 'Collecting sidekicks' },
  { id: 'weebucks', title: 'Weebucks' },
  { id: 'shop', title: 'Shop' },
  { id: 'betting', title: 'Betting' },
  { id: 'trail', title: 'Battle Bus Trail' },
  { id: 'levels', title: 'Skin levels' },
];

export default function HelpScreen({ onBack, onDeleteAllData }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  return (
    <div className="help-screen">
      <header className="catalogue-header">
        <h1>Help</h1>
        <p className="subtitle">How FortHang, the Shop, and Betting fit together.</p>
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
          Unlock sidekicks in the Shop. Rolls can duplicate. Rare collabs are 10%; SpongeBob, PAC-MAN,
          and The Knight are 1% ultra rare. Unowned sidekicks show as silhouettes. Rolls come in packs
          of 1, 3, or 5, and the Sidekick Catalogue tracks unique kinds and total copies.
        </p>
      </section>

      <section id="help-weebucks" className="help-section">
        <h2>Weebucks</h2>
        <p>
          Weebucks are the FortHang currency. Earn them mainly in Betting when your bet skins win
          matches. Extra sources include tournament-win bonuses and the catalogue-complete reward.
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
            <strong>Betting upgrades</strong> — permanently unlock better Betting tools and
            payouts (more slots, stronger dice, higher Top 8 / Top 64 / tournament rewards, Simulate
            all, Select random, seeding, extra lives, and more daily betting runs).
          </li>
        </ul>
        <p>Many upgrades unlock in tiers — buy the earlier one before the next appears as Available.</p>
      </section>

      <section id="help-betting" className="help-section">
        <h2>Betting</h2>
        <p>
          Betting is a ranking and tournament playground. Only skins you have discovered in FortHang can
          enter. The main mode is Betting. Ranking, Bracket, and Simulate are side modes, opened from
          Modes.
        </p>
        <ul>
          <li>
            <strong>Ranking</strong> — pick skins and sort them favorite to least favorite.
          </li>
          <li>
            <strong>Bracket</strong> — pick skins and manually choose winners in a double-elimination
            bracket.
          </li>
          <li>
            <strong>Simulate</strong> — dice decide each matchup. Each side rolls Nd100 and keeps the
            highest.
          </li>
          <li>
            <strong>Betting</strong> — every discovered skin enters a simulated double-elim. You pick
            which skins to bet on.
          </li>
        </ul>
        <p>Dice counts, before any bet bonus:</p>
        <ul>
          <li>
            <strong>1</strong> — Other, General Collaborations, Sports
          </li>
          <li>
            <strong>2</strong> — default
          </li>
          <li>
            <strong>3</strong> — DC, Icon, Other Collab, Marvel, Gaming Legends, Star Wars; also{' '}
            {[...THREE_STAR_NAMES].join(', ')}
          </li>
          <li>
            <strong>4</strong> — TV, WWE, Anime, and Cartoon Legends
          </li>
          <li>
            <strong>5</strong> — star skins: {[...FIVE_STAR_NAMES].join(', ')}
          </li>
        </ul>
        <p>Finished tournaments can be saved and reopened from the Saved list.</p>
        <p>
          All discovered skins enter. Pick up to {BASE_STAR_BETS} super bet skins (+{STAR_BET_BONUS_DICE}{' '}
          dice, +{SUPER_BET_ROUND_BONUS} weebuck on every round payout, 2× XP) and up to {BASE_BOOST_BETS}{' '}
          bet skins (+{BOOST_BET_BONUS_DICE} dice). Shop upgrades can raise those caps and dice bonuses.
          Placement XP is 1st 200, 2nd–4th 100, 5th–7th 50, and 25 otherwise. Levels raise roll floors
          (level 1: no 1–5, level 3: no 1–10, level 5: no 1–20). Base payout is {BET_WIN_POINTS} weebucks
          per bet win. Winning the tournament pays {TOURNAMENT_WIN_POINTS} weebucks. Bets lock until
          Monday at midnight America/Chicago. Daily runs start at {BASE_DAILY_BET_RUNS} and can be raised
          in the Shop.
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

      <section id="help-trail" className="help-section">
        <h2>Battle Bus Trail</h2>
        <p>
          An Oregon Trail–style Battle Royale run. Fight, Loot, Rest, or Rotate each turn while the
          Storm closes and enemies show up.
        </p>
        <ul>
          <li>
            <strong>Squad</strong> — pick 4 discovered skins before you drop in. An owned sidekick
            is optional. The top row shows live HP (green) and shield (blue) bars; fallen members
            are crossed out.
          </li>
          <li>
            <strong>Daily runs</strong> — {BASE_DAILY_TRAIL_RUNS} per day by default (shop can raise
            to {DAILY_TRAIL_RUNS_TIER1}).
          </li>
          <li>
            <strong>Event images</strong> — encounters show skin icons from Anime, Cartoon, Star
            Wars, Marvel, Icon, Gaming Legends, Sports, and Space Explorer pools. Solos show 1
            skin, squads show up to 4. Bosses use a random collab skin. Loot drops show an item
            card (icons from fortnite.gg when available).
          </li>
          <li>
            <strong>Payout</strong> — {TRAIL_SURVIVOR_PAYOUT} weebucks per surviving squad member,{' '}
            {TRAIL_FALLEN_PAYOUT} per fallen member (sidekick counts). Shop can raise those to{' '}
            {TRAIL_SURVIVOR_PAYOUT_TIER1} / {TRAIL_FALLEN_PAYOUT_TIER1}.
          </li>
          <li>
            <strong>XP</strong> — skins earn {TRAIL_SURVIVOR_XP} XP if they survive, {TRAIL_FALLEN_XP}{' '}
            XP if they fall. Level 2+ skins start with +10 HP; level 4 skins take 5% less fight
            damage; level 5 skins start with +20 HP.
          </li>
          <li>
            <strong>Shop</strong> — Trail upgrades (storm/fight resist, daily runs, payouts) plus
            boss loot packs (Bending, Lightsabers, Infinity Blade, Kamehameha, Mythic Goldfish).
          </li>
        </ul>
      </section>

      <section id="help-levels" className="help-section">
        <h2>Skin levels</h2>
        <p>
          Bet skins earn XP from tournament place at the end of a betting run. Super bets earn double
          XP. Battle Bus Trail also awards skin XP for surviving or falling.
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
        <p>Battle Bus Trail bonuses also scale with skin level:</p>
        <ul>
          <li>
            <strong>Level 2–4</strong> — +10 HP at the start of a run (110 max)
          </li>
          <li>
            <strong>Level 4+</strong> — take 5% less damage from fights
          </li>
          <li>
            <strong>Level 5</strong> — +20 HP at the start of a run (120 max)
          </li>
        </ul>
        <p>Check a skin’s level and XP in the Skin Catalogue.</p>
      </section>

      <footer className="catalogue-footer">
        <button type="button" className="danger-button" onClick={() => setShowDeleteConfirm(true)}>
          Delete All Data
        </button>
      </footer>
      {showDeleteConfirm ? (
        <DeleteAllDataConfirm
          onConfirm={() => {
            setShowDeleteConfirm(false);
            onDeleteAllData?.();
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      ) : null}
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
          levels, Betting saves, and resets daily hangman attempts and betting runs.
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
