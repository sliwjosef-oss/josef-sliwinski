// Binary insertion sort driven by recorded decisions, favorite first.
// decisions[k] === true means the incoming skin beat the skin it was compared against.
export function replay(order, decisions) {
  if (order.length < 2) return { sorted: [...order], done: true, used: 0 };

  const sorted = [order[0]];
  let index = 1;
  let lo = 0;
  let hi = sorted.length;
  let used = 0;

  while (index < order.length) {
    if (lo >= hi) {
      sorted.splice(lo, 0, order[index]);
      index += 1;
      lo = 0;
      hi = sorted.length;
      continue;
    }
    const mid = (lo + hi) >> 1;
    if (used >= decisions.length) {
      return { sorted, done: false, used, index, lo, hi, challenger: order[index], opponent: sorted[mid] };
    }
    if (decisions[used]) hi = mid;
    else lo = mid + 1;
    used += 1;
  }

  return { sorted, done: true, used };
}

function comparisonsToInsert(rangeSize) {
  return rangeSize <= 0 ? 0 : Math.ceil(Math.log2(rangeSize + 1));
}

export function estimateRemaining(state, total) {
  if (state.done) return 0;
  let remaining = comparisonsToInsert(state.hi - state.lo);
  for (let size = state.index + 1; size < total; size += 1) {
    remaining += comparisonsToInsert(size);
  }
  return remaining;
}

export function normalizeName(name) {
  return name
    .normalize('NFKC')
    .replace(/[\u2018\u2019\u0060\u00b4]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function looseName(name) {
  return normalizeName(name).replace(/[^a-z0-9]/g, '');
}

export function parsePastedNames(text) {
  const seen = new Set();
  const names = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/^\s*\d+\s*[.)]\s+/, '').trim();
    if (!line) continue;
    const key = normalizeName(line);
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(line);
  }
  return names;
}

export function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
