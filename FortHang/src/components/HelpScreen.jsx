import { useState } from 'react';
import {
  BASE_BOOST_BETS,
  BASE_DAILY_BET_RUNS,
  BASE_DAILY_TRAIL_RUNS,
  BASE_STAR_BETS,
  BET_WIN_POINTS,
  BOOST_BET_BONUS_DICE,
  CATALOG_COMPLETE_BONUS,
  DAILY_BET_RUNS_TIER1,
  DAILY_BET_RUNS_TIER2,
  DAILY_GUESS_BASE,
  DAILY_LOGIN_BONUS,
  DAILY_TRAIL_RUNS_TIER1,
  DAILY_TRAIL_RUNS_TIER2,
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
          {DAILY_GUESS_BASE} free attempts per day (resets at 6:00 AM Central Time). Wins and losses
          both use an attempt.
        </p>
        <p>
          Guess letters before Peely is fully bananated. Season and flavor hints appear while you play.
          A correct name adds that outfit to your Skin Catalogue. Only undiscovered skins are offered
          for hangman rounds. Battle Bus Trail unlocks at 4 discovered skins, Betting at 16, and the
          Shop at 32.
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
          Opening the game also grants a daily login bonus of {DAILY_LOGIN_BONUS} weebucks once per
          day (same 6:00 AM Central Time reset as hangman attempts).
        </p>
        <p>
          <strong>Battle Bus Trail</strong> also pays weebucks at the end of a ranked run:{' '}
          {TRAIL_SURVIVOR_PAYOUT} per surviving squad member and {TRAIL_FALLEN_PAYOUT} per fallen
          member (sidekick counts). Shop upgrades can raise those to {TRAIL_SURVIVOR_PAYOUT_TIER1} /{' '}
          {TRAIL_FALLEN_PAYOUT_TIER1}. For Fun runs award no weebucks.
        </p>
        <p>
          Spend weebucks in the Shop on more hangman attempts, sidekick rolls, betting upgrades, and
          Battle Bus Trail unlocks.
        </p>
      </section>

      <section id="help-shop" className="help-section">
        <h2>Shop</h2>
        <p>The Shop has three kinds of purchases:</p>
        <ul>
          <li>
            <strong>Skin attempt packs</strong> — add hangman attempts for today (they stack until the
            6:00 AM Central Time reset).
          </li>
          <li>
            <strong>Sidekick rolls</strong> — random sidekick pulls, including rares and ultra-rares.
          </li>
          <li>
            <strong>Betting upgrades</strong> — permanently unlock better Betting tools and
            payouts (more slots, stronger dice, higher Top 8 / Top 64 / tournament rewards, Simulate
            all, Select random, seeding, extra lives, and more Betting runs).
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
          All discovered skins enter. Pick up to {BASE_STAR_BETS} super bet{' '}
          {BASE_STAR_BETS === 1 ? 'skin' : 'skins'} (+{STAR_BET_BONUS_DICE} dice, +{SUPER_BET_ROUND_BONUS}{' '}
          weebucks on every round payout, 2× XP) and up to {BASE_BOOST_BETS} bet{' '}
          {BASE_BOOST_BETS === 1 ? 'skin' : 'skins'} (+{BOOST_BET_BONUS_DICE} dice). Shop upgrades can
          raise those caps and dice bonuses. Placement XP is 1st 200, 2nd–4th 100, 5th–7th 50, and 25
          otherwise. Levels permanently add dice (level 2: +1, level 4: +2, level 5: +3) and raise
          roll floors (level 1: no 1–5, level 3: no 1–10, level 5: no 1–20), even for non-bets.
          Base payout is {BET_WIN_POINTS} weebucks per bet win. Winning the tournament pays{' '}
          {TOURNAMENT_WIN_POINTS} weebucks. Bets lock until Monday at midnight Central Time. Betting
          runs start at {BASE_DAILY_BET_RUNS} and can be raised in the Shop to {DAILY_BET_RUNS_TIER1},
          then {DAILY_BET_RUNS_TIER2}.
        </p>
        <ul>
          <li>
            <strong>Super bets</strong> — +{STAR_BET_BONUS_DICE} dice by default (shop can raise to
            +5), +{SUPER_BET_ROUND_BONUS} weebucks on every round payout, and 2× placement XP. Optional
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
            <strong>Locks</strong> — skins you bet stay locked until Monday 00:00 Central Time.
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
            is optional. After a ranked run, that sidekick needs rest until the next 6:00 AM Central
            reset (same day boundary as hangman attempts) — skins still lock until Monday. The top
            row shows health (♥) and shield (🛡). The shield bar hides at 0. Fallen members are
            crossed out.
          </li>
          <li>
            <strong>Enemy type</strong> — you can see who showed up, but not whether they are bots,
            players, or sweats. The fight panel says Type: ???. A Read is only a guess and can be
            wrong.
          </li>
          <li>
            <strong>Trail runs</strong> — {BASE_DAILY_TRAIL_RUNS} per day by default (shop can raise
            to {DAILY_TRAIL_RUNS_TIER1}, then {DAILY_TRAIL_RUNS_TIER2}). These are separate from
            Betting runs. Ranked Drop in locks those skins until Monday at midnight Central Time.{" "}
            <strong>For Fun</strong> is locked until you buy it in the Shop (5000 weebucks). It
            opens a separate squad select with no locks or Trail-run limit, and awards no weebucks
            or skin XP.
          </li>
          <li>
            <strong>Event images</strong> — encounters show skin icons from Anime Legends, Anime
            Originals, Cartoon Legends, TV Legends, WWE Legends, Star Wars, Marvel, DC, Icon, Gaming
            Legends, Sports, Space Explorers, Peely, Food, Toys, Robots, Animals, Aliens, Midas
            Family, Winterfest, and Fortnightmares pools. Those picks use the full catalogue —
            icons always show, but undiscovered skins are labeled ???. Solos show 1 skin, squads show
            up to 4. Bosses use a random collab skin. Loot drops show an item card (icons from
            fortnite.gg when available).
          </li>
          <li>
            <strong>Payout</strong> — {TRAIL_SURVIVOR_PAYOUT} weebucks per surviving squad member,{' '}
            {TRAIL_FALLEN_PAYOUT} per fallen member (sidekick counts). Shop can raise those to{' '}
            {TRAIL_SURVIVOR_PAYOUT_TIER1} / {TRAIL_FALLEN_PAYOUT_TIER1}.
          </li>
          <li>
            <strong>XP</strong> — skins earn {TRAIL_SURVIVOR_XP} XP if they survive, {TRAIL_FALLEN_XP}{' '}
            XP if they fall. Level 1+ skins take 5% less Storm damage; level 2+ skins start with +10
            HP; level 4 skins take 5% less fight damage; level 5 skins start with +20 HP.
          </li>
          <li>
            <strong>Shop</strong> — Trail upgrades (storm/fight resist, Trail runs, For Fun mode,
            payouts) plus boss loot packs (Bending, Lightsabers, Infinity Blade, Kamehameha, Mythic
            Goldfish), Chug Jugs, and unlockable events (Legendary Supply Drop, Vending Machine,
            Floating Island, Fishing Spot, Slurp Barrel, Pirate Shop Access Token — ranked only)
            for 1000 weebucks each.
          </li>
          <li>
            <strong>Rest</strong> — use a healing item, or search for heals. Both can still draw the
            Storm. Medkits add +100 HP to one squad member you pick, and they do not add shield. Shield Potions
            add +50 shield to one member.
            Slurp Juice, found in chests (about 4%), fills one member's health and shield. Chug
            Splash heals every living squad member, sidekick included, for +20 total — HP first,
            then any leftover fills shield (for example 94 HP gets +6 HP and +14 shield). Chug
            Jugs restore the whole squad and only drop after you unlock them (about 1% per chest). With Vending Machine
            unlocked, Rest has a 5% chance to offer a one-item trade for Epic / Legendary / Mythic loot
            (80% Epic, 20% Legendary or Mythic). Slurp
            Barrel (shop unlock) can rarely appear when searching for heals and restores the whole
            squad to full HP.
          </li>
          <li>
            <strong>Rotate</strong> — Book it covers more ground but has a high chance of an
            open-field ambush, and in the final 10 that ambush always happens. Safer route moves
            slower, never gets ambushed, and takes one tick of Storm damage.
          </li>
          <li>
            <strong>Inventory</strong> — up to 10 item slots (stacks of the same item each use a
            slot). Grenades deal 30–45. Clingers deal 40–55. A Boogie Bomb makes the enemy dance
            for 2 rounds (they deal no damage); each squad member has a 10% chance to dance too.
            A Bush still makes you harder to spot, and it also blocks one sniper shot, then it's
            used up. A Kneecapper is a Leekcapper 10% of the time. Same swing. Pack on the trail
            screen opens your inventory (with item art) and the players list. Living players show
            up once you have seen them. Every player who dies is listed, even if you never met them,
            with their placement and how they died.
          </li>
          <li>
            <strong>Lobby</strong> — before you drop, 95 other players spawn with unique skins in
            squads of 4 (plus one squad of 3). Squads are themed when a series has enough skins
            (Marvel, Star Wars, Fishies, Joneseys, Ravens, Kitties, Team Leaders, Knights, Billiard
            Warriors, Forestry, and the rest). Each squad is Sweats, Players, or Bots. You can still
            run into solos, duos, and trios that split off those squads — but if they ambush you, the
            whole living squad piles in. Random deaths hit the lobby
            every turn. Early on those are usually bots, and sweats almost never drop until the
            lobby is thin. Off-screen, bots are killed by players or sweats. Players and sweats are
            killed by sweats. Some of those deaths are fall damage instead. Squads that already lost
            someone die faster. Third-partying puts both
            full squads on screen. Each round you pick a side to shoot. Their health bar is one
            chunk per living player, and emptying a chunk kills that player even if you flee.
            Those squads also shoot each other.
          </li>
          <li>
            <strong>Choice events</strong> — between turns you may get a decision: check a noisy
            bush (loot or a camping solo), answer a solo teaming wave (free elim, or 70% item / 30%
            betrayal — teaming stops in the final 10), crack a locked vault (2 turns for a guaranteed
            rare while the Storm moves), jump a sky rift (closer to zone or dropped in danger), or
            hop in a car (70% massive ambush on the next squad and farther from the Storm, 30%
            explosion for 100 damage each).
          </li>
          <li>
            <strong>Final 10</strong> — once 10 players are left, the others stop dying on their own
            and teaming offers stop. They only go down if you attack them, or if they ambush you and
            you win the fight. Ambushes jump sharply for looting and resting. Booking it is a
            guaranteed ambush, and anyone you run into usually shoots first. Safer route still only
            takes the Storm tick.
          </li>
        </ul>
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
          <strong>Battle Bus Trail</strong> awards skin XP to squad members after a ranked run
          (For Fun awards none):
        </p>
        <ul>
          <li>Survive the run: {TRAIL_SURVIVOR_XP} XP</li>
          <li>Fall during the run: {TRAIL_FALLEN_XP} XP</li>
        </ul>
        <p>
          Levels go from 0 to {MAX_SKIN_LEVEL}. Level 1 costs 100 XP. Each next level costs 100 XP
          more than the one before it, so level 2 costs 200 (300 total) and level 3 costs 300 (600
          total). Totals to reach each level: {LEVEL_XP_THRESHOLDS.slice(1).join(', ')}.
        </p>
        <p>
          Higher levels permanently add dice (★) in Simulate / Betting, even when the skin is not a
          bet or super bet:
        </p>
        <ul>
          <li>
            <strong>Level 2+</strong> — +1 die
          </li>
          <li>
            <strong>Level 4+</strong> — +2 dice total
          </li>
          <li>
            <strong>Level 5</strong> — +3 dice total
          </li>
        </ul>
        <p>Higher levels also raise a skin’s minimum d100 roll in Simulate / Betting:</p>
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
            <strong>Level 1+</strong> — take 5% less Storm damage
          </li>
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
