// Double-elimination bracket with a grand final and bracket reset.
export const BYE = '__bye__';

function standardSeedOrder(size) {
  let order = [1];
  while (order.length < size) {
    const next = order.length * 2 + 1;
    order = order.flatMap((seed) => [seed, next - seed]);
  }
  return order;
}

// Version 1 brackets cross losers-bracket drops between halves, which ties regions together,
// so only version 2 brackets can be played pool by pool.
export function createBracket(entrants, version = 2) {
  let size = 2;
  while (size < entrants.length) size *= 2;
  const slots = standardSeedOrder(size).map((seed) => entrants[seed - 1] ?? BYE);
  const winnersRounds = Math.log2(size);
  const matches = [];
  const winnersId = (round, index) => `W${round}-${index}`;
  const losersId = (round, index) => `L${round}-${index}`;

  const winners = [];
  for (let round = 1; round <= winnersRounds; round += 1) {
    const list = [];
    const count = size / 2 ** round;
    for (let index = 0; index < count; index += 1) {
      const sources =
        round === 1
          ? [{ seed: slots[index * 2] }, { seed: slots[index * 2 + 1] }]
          : [{ winner: winnersId(round - 1, index * 2) }, { winner: winnersId(round - 1, index * 2 + 1) }];
      list.push({ id: winnersId(round, index), bracket: 'W', round, index, sources });
    }
    winners.push(list);
  }

  const losers = [];
  const losersRounds = winnersRounds > 1 ? 2 * (winnersRounds - 1) : 0;
  for (let round = 1; round <= losersRounds; round += 1) {
    const list = [];
    if (round === 1) {
      for (let index = 0; index < size / 4; index += 1) {
        list.push({
          id: losersId(1, index),
          sources: [{ loser: winnersId(1, index * 2) }, { loser: winnersId(1, index * 2 + 1) }],
        });
      }
    } else if (round % 2 === 0) {
      const dropRound = round / 2 + 1;
      const count = losers[round - 2].length;
      const reverse = version === 1 && (round / 2) % 2 === 1;
      for (let index = 0; index < count; index += 1) {
        const dropIndex = reverse ? count - 1 - index : index;
        list.push({
          id: losersId(round, index),
          sources: [{ winner: losersId(round - 1, index) }, { loser: winnersId(dropRound, dropIndex) }],
        });
      }
    } else {
      const count = losers[round - 2].length / 2;
      for (let index = 0; index < count; index += 1) {
        list.push({
          id: losersId(round, index),
          sources: [{ winner: losersId(round - 1, index * 2) }, { winner: losersId(round - 1, index * 2 + 1) }],
        });
      }
    }
    for (const match of list) Object.assign(match, { bracket: 'L', round, index: list.indexOf(match) });
    losers.push(list);
  }

  const winnersFinal = winnersId(winnersRounds, 0);
  const losersChampion = losersRounds ? { winner: losersId(losersRounds, 0) } : { loser: winnersId(1, 0) };
  const grandFinal = { id: 'GF1', bracket: 'GF', round: 1, index: 0, sources: [{ winner: winnersFinal }, losersChampion] };
  const reset = { id: 'GF2', bracket: 'GF', round: 2, index: 0, sources: [{ winner: 'GF1' }, { loser: 'GF1' }] };

  // Play order keeps every match after the matches that feed it.
  const order = [...winners[0]];
  for (let round = 2; round <= winnersRounds; round += 1) {
    order.push(...winners[round - 1]);
    if (losersRounds) order.push(...losers[2 * round - 4], ...losers[2 * round - 3]);
  }
  order.push(grandFinal, reset);

  const bracket = { version, size, winners, losers, grandFinal, reset, matches };
  bracket.pages = buildPages(bracket);
  bracket.pageOf = new Map();
  bracket.pages.forEach((page, pageIndex) => {
    for (const section of page.sections) {
      for (const round of section.rounds) for (const match of round) bracket.pageOf.set(match.id, pageIndex);
    }
  });

  if (version === 1) matches.push(...order);
  else matches.push(...order.map((match, i) => [bracket.pageOf.get(match.id), i, match]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(([, , match]) => match));

  return bracket;
}

const PHASE_CUTS = [512, 64, 8];
const POOL_SIZE = 64;

function poolName(index, round) {
  let name = '';
  let n = index;
  do {
    name = String.fromCharCode(65 + (n % 26)) + name;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return round === 1 ? `Pool ${name}` : `Pool ${name}1`;
}

// Splits the bracket at the points where Top 512, Top 64 and Top 8 remain
// (half still on the winners side, half on the losers side).
function buildPages(bracket) {
  const { size, winners, losers } = bracket;
  const rounds = winners.length;
  const boundaries = [{ top: size, w: 0, l: 0 }];
  for (const top of PHASE_CUTS) {
    if (top >= size) continue;
    const w = rounds - Math.log2(top / 2);
    boundaries.push({ top, w, l: Math.max(0, 2 * w - 2) });
  }
  boundaries.push({ top: 0, w: rounds, l: losers.length });

  const segments = [];
  for (let i = 0; i < boundaries.length - 1; i += 1) {
    const from = boundaries[i];
    const to = boundaries[i + 1];
    const isLast = i === boundaries.length - 2;
    const isPools = to.top === 64 || to.top === 512;
    segments.push({ from, to, isLast, isPools });
  }

  const poolSegments = segments.filter((segment) => segment.isPools);
  const pages = [];
  for (const segment of segments) {
    const winnersRounds = winners.slice(segment.from.w, segment.to.w);
    const losersRounds = losers.slice(segment.from.l, segment.to.l);
    const finals = segment.isLast ? [[bracket.grandFinal], [bracket.reset]] : [];

    if (!segment.isPools) {
      pages.push({
        phase: `Top ${segment.from.top}`,
        pool: null,
        sections: makeSections(winnersRounds, losersRounds, finals),
      });
      continue;
    }

    const poolRound = poolSegments.indexOf(segment) + 1;
    const phase = `Round ${poolRound} Pools`;
    const pools = segment.from.top / POOL_SIZE;
    for (let pool = 0; pool < pools; pool += 1) {
      const slice = (round) => {
        const per = round.length / pools;
        return round.slice(pool * per, (pool + 1) * per);
      };
      pages.push({
        phase,
        pool: poolName(pool, poolRound),
        sections: makeSections(winnersRounds.map(slice), losersRounds.map(slice), []),
      });
    }
  }
  return pages;
}

function makeSections(winnersRounds, losersRounds, finals) {
  const sections = [];
  if (winnersRounds.length) sections.push({ title: 'Winners Side', rounds: winnersRounds });
  if (losersRounds.length) sections.push({ title: 'Losers Side', rounds: losersRounds });
  if (finals.length) sections.push({ title: 'Finals', rounds: finals });
  return sections;
}

// results: Map or object of matchId -> 0 | 1 (index of the winning participant).
export function resolveBracket(bracket, results) {
  const get = (id) => (results instanceof Map ? results.get(id) : results[id]);
  const outcomes = new Map();
  let current = null;

  const participantFrom = (source) => {
    if ('seed' in source) return source.seed;
    const outcome = outcomes.get(source.winner ?? source.loser);
    if (!outcome || outcome.winnerSlot == null) return null;
    return source.winner ? outcome.winner : outcome.loser;
  };

  for (const match of bracket.matches) {
    const participants = match.sources.map(participantFrom);
    let winnerSlot = null;
    let auto = false;
    let skipped = false;

    if (match.id === 'GF2') {
      const first = outcomes.get('GF1');
      if (first?.winnerSlot === 0) skipped = true;
    }

    if (!skipped && participants.every((p) => p !== null)) {
      if (participants[0] === BYE || participants[1] === BYE) {
        winnerSlot = participants[0] === BYE ? 1 : 0;
        auto = true;
      } else if (get(match.id) != null) {
        winnerSlot = get(match.id);
      } else if (!current) {
        current = match;
      }
    }

    outcomes.set(match.id, {
      match,
      participants,
      winnerSlot,
      auto,
      skipped,
      winner: winnerSlot == null ? null : participants[winnerSlot],
      loser: winnerSlot == null ? null : participants[1 - winnerSlot],
    });
  }

  const first = outcomes.get('GF1');
  const second = outcomes.get('GF2');
  let champion = null;
  let runnerUp = null;
  if (first.winnerSlot === 0) {
    champion = first.winner;
    runnerUp = first.loser;
  } else if (second.winnerSlot != null) {
    champion = second.winner;
    runnerUp = second.loser;
  }

  return { outcomes, current, champion, runnerUp, done: champion !== null };
}

export function roundLabel(bracket, match) {
  if (match.bracket === 'GF') return match.round === 1 ? 'Grand Final' : 'Bracket Reset';
  if (match.bracket === 'W') {
    const fromEnd = bracket.winners.length - match.round;
    if (fromEnd === 0) return 'Winners Final';
    if (fromEnd === 1) return 'Winners Semifinal';
    return `Winners Round ${match.round}`;
  }
  return match.round === bracket.losers.length ? 'Losers Final' : `Losers Round ${match.round}`;
}
