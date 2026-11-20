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

export function createBracket(entrants) {
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
      const reverse = (round / 2) % 2 === 1;
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
  matches.push(...order);

  return { size, winners, losers, grandFinal, reset, matches };
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
