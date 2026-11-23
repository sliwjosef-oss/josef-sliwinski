import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const apiPath =
  process.argv[2] ||
  'C:/Users/josefs/.cursor/projects/c-Users-josefs-Documents-Tests-FortHang/agent-tools/5d063b2a-f8a2-448f-b9c8-753a50cf8d79.txt';

const parsed = JSON.parse(readFileSync(apiPath, 'utf8'));
const items = Array.isArray(parsed.data) ? parsed.data : [];

const EXCLUDED = new Set(['random', 'null', 'tbd', '']);

const sidekicks = items
  .filter((item) => String(item.type?.value || '').toLowerCase() === 'sidekick')
  .filter((item) => !EXCLUDED.has(String(item.name || '').trim().toLowerCase()))
  .sort((a, b) => String(a.added || '').localeCompare(String(b.added || '')) || a.name.localeCompare(b.name));

const catalogue = sidekicks.map((item, index) => {
  const icon =
    item.images?.smallIcon ||
    item.images?.icon ||
    item.images?.featured ||
    null;
  return {
    id: item.id,
    number: index + 1,
    name: item.name,
    description: item.description || '',
    releaseText: item.introduction?.text || item.set?.text || item.rarity?.displayValue || 'Fortnite Sidekick',
    series: item.series?.value || null,
    setName: item.set?.value || null,
    added: item.added || null,
    icon,
    rarityApi: item.rarity?.value || null,
  };
});

writeFileSync(join(root, 'public/sidekicks.json'), `${JSON.stringify(catalogue, null, 2)}\n`);
writeFileSync(
  join(root, 'scripts/sidekick-extract-summary.json'),
  JSON.stringify(
    {
      count: catalogue.length,
      sample: catalogue[0] || null,
      names: catalogue.map((item) => item.name),
    },
    null,
    2,
  ),
);

console.log(`Wrote ${catalogue.length} sidekicks`);
console.log(`Sample icon: ${catalogue[0]?.icon || 'none'}`);
