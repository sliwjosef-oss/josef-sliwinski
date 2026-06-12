import { sortOutfitsByNumber } from './seasonSort';

export const SERIES_GROUPS = [
  { key: 'dc', label: 'DC' },
  { key: 'marvel', label: 'Marvel' },
  { key: 'icon', label: 'Icon' },
  { key: 'gaming-legends', label: 'Gaming Legends' },
  { key: 'star-wars', label: 'Star Wars' },
  { key: 'cartoon', label: 'Cartoon' },
  { key: 'other', label: 'Other' },
];

const SERIES_ORDER = new Map(SERIES_GROUPS.map((group, index) => [group.key, index]));

const CARTOON_OUTFIT_NAMES = new Set([
  'Rick Sanchez',
  'Mecha Morty',
  'Mr. Meeseeks',
  'Queen Summer',
  'Pickle Rick',
  'Rick Prime',
  'Space Beth',
  'Peter Griffin',
  'The Giant Chicken',
  'Cleveland Brown',
  'Lois Griffin',
  'Hank Hill',
  'Peggy Hill',
  'Bob Belcher',
  'Linda Belcher',
  'Danny Fenton',
  'Sam Manson',
  'Ed',
  'Mordecai',
  'Skips',
  'Eric Cartman',
  'Stan Marsh',
  'Kyle Broflovski',
  'Butters Stotch',
  'Kenny McCormick',
  'Homer Simpson',
  'Tighty Whities Homer',
  'Marge Simpson',
  'Lisa Simpson',
  'Bart Simpson',
  'Krusty the Clown',
  'Ned Flanders',
  'Scratchy',
  'Moe Szyslak',
  'Ben Tennyson',
  'Gwen Tennyson',
  'Invincible',
  'Omni-Man',
  'Atom Eve',
  'Dupli-Kate',
  'Allen the Alien',
  'Leonardo',
  'Michelangelo',
  'Donatello',
  'Raphael',
  'Shredder',
  'Super Shredder',
  "April O'Neil",
  'Casey Jones',
  'Bebop',
  'Rocksteady',
  "Krang's Android",
  'Korra',
  'Aang',
  'Katara',
  'Zuko',
  'Toph Beifong',
  'Avatar State Aang',
  'Buzz Lightyear',
  'Emperor Zurg',
  'Dr. Doofenshmirtz',
  'Buff Perry',
  'Frozone',
  'Mr. Incredible',
  'Mrs. Incredible',
  'Bugs Bunny',
  'Daffy Duck',
  'Lola Bunny',
  'Hercules',
  'Hades (Lord of the Dead)',
  'Megara',
  'He-Man',
  'She-Ra',
  'Skeletor',
  'Scooby-Doo',
  'Fred Jones',
  'Daphne Blake',
  'Velma Dinkley',
  'Shaggy Rogers',
  'Beavis',
  'Butt-Head',
  'Finn the Human',
  'Jake the Dog',
  'Princess Bubblegum',
  'Marceline',
  'Fionna the Human',
  'Cake the Cat',
  'Ice King',
  'The Earl of Lemongrab',
  'Hero Baymax',
  'Jack Skellington',
  'Sally',
  'Philip J. Fry',
  'Turanga Leela',
  'Bender Bending Rodríguez',
  'Pomni',
  'Jax',
]);

export function getCatalogueSeriesKey(outfit) {
  if (CARTOON_OUTFIT_NAMES.has(outfit.name)) return 'cartoon';

  const raw = String(outfit.series ?? '').trim().toLowerCase();
  if (!raw) return 'other';
  if (raw.includes('dc')) return 'dc';
  if (raw.includes('marvel')) return 'marvel';
  if (raw.includes('icon')) return 'icon';
  if (raw.includes('gaming legends')) return 'gaming-legends';
  if (raw.includes('star wars')) return 'star-wars';
  return 'other';
}

export function groupOutfitsBySeries(outfits) {
  const buckets = new Map(SERIES_GROUPS.map((group) => [group.key, []]));

  for (const outfit of outfits) {
    buckets.get(getCatalogueSeriesKey(outfit)).push(outfit);
  }

  return SERIES_GROUPS.filter((group) => buckets.get(group.key).length > 0)
    .sort((a, b) => SERIES_ORDER.get(a.key) - SERIES_ORDER.get(b.key))
    .map((group) => ({
      key: group.key,
      label: group.label,
      outfits: sortOutfitsByNumber(buckets.get(group.key)),
    }));
}
