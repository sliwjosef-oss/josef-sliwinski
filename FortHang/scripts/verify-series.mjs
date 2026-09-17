import { readFileSync, writeFileSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = join(__dirname, '..', 'src', 'utils');

/** Vite resolves extensionless imports; Node does not, so shim them for this check. */
function loadModule(name) {
  const source = readFileSync(join(SRC_DIR, `${name}.js`), 'utf8').replace(
    /from '\.\/([\w-]+)'/g,
    "from './$1.js'"
  );
  const tempPath = join(SRC_DIR, `__verify_${name}.mjs`);
  writeFileSync(tempPath, source);
  return { tempPath, url: pathToFileURL(tempPath).href };
}

const season = loadModule('seasonSort');
const series = loadModule('seriesSort');

try {
  const { getCatalogueSeriesKey } = await import(series.url);
  const outfits = JSON.parse(
    readFileSync(join(__dirname, '..', 'public', 'outfits.json'), 'utf8')
  );

  const expected = {
    'Samurai Jack': 'cartoon',
    'Stan Smith': 'cartoon',
    'Francine Smith': 'cartoon',
    'Kisuke Urahara': 'anime-legends',
    'Yoruichi Shihoin': 'anime-legends',
    'Sonic the Hedgehog': 'gaming-legends',
    'Shadow the Hedgehog': 'gaming-legends',
    'Knuckles the Echidna': 'gaming-legends',
    'Dr. Eggman': 'gaming-legends',
    'Walter Irons': 'gaming-legends',
    Soul: 'gaming-legends',
    'Metalhead Meow Skulls': 'kitties',
    'The Prophecy': 'the-seven',
    'Ultima King': 'knights',
    'Kinetic Catalyst': 'fox-clan',
    'Fractal Brite Bomber': 'briters-and-bombers',
    'Fractal Midas': 'midas-family',
    Bunnybone: 'easter-valentines',
    Galaxon: 'astral-entities',
    'Pond Guardian Froggory': 'animals',
    Odysseus: 'tv-legends',
    Agamemnon: 'tv-legends',
    'Kickoff Yeddy': 'other-collab-skins',
  };

  let failures = 0;
  for (const [name, want] of Object.entries(expected)) {
    const outfit = outfits.find((item) => item.name === name);
    const got = outfit ? getCatalogueSeriesKey(outfit) : 'MISSING';
    if (got !== want) failures += 1;
    console.log(`${got === want ? 'ok  ' : 'FAIL'}  ${name.padEnd(24)} ${got}`);
  }

  console.log(failures ? `${failures} mismatch(es)` : 'all assignments correct');
  process.exitCode = failures ? 1 : 0;
} finally {
  rmSync(series.tempPath, { force: true });
  rmSync(season.tempPath, { force: true });
}
