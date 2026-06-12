import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIRS = [
  join(__dirname, '..', 'public', 'hangman'),
  join(__dirname, '..', '..', 'fort-hang', 'hangman'),
];
const BUNDLE_DIR = join(__dirname, '..', 'src', 'assets', 'hangman');

const SIZE = 500;
const OUTLINE = '#141414';
const OUTLINE_W = 4;

const STAGES = [
  'Victory',
  'Uneasy',
  'Stressed',
  'Hit',
  'Hurting',
  'Critical',
  'Eliminated',
];

function actionLines(stage) {
  if (stage >= 5) return '';
  const opacity = 0.5 - stage * 0.07;
  return `
    <g opacity="${opacity}" stroke="#FFF3B0" stroke-width="4" stroke-linecap="round">
      <line x1="250" y1="280" x2="60" y2="50"/>
      <line x1="250" y1="280" x2="440" y2="60"/>
      <line x1="250" y1="280" x2="460" y2="270"/>
      <line x1="250" y1="280" x2="430" y2="430"/>
      <line x1="250" y1="280" x2="250" y2="470"/>
      <line x1="250" y1="280" x2="70" y2="410"/>
      <line x1="250" y1="280" x2="50" y2="240"/>
    </g>
  `;
}

function rainDrops(stage) {
  if (stage < 5) return '';
  const opacity = stage === 5 ? 0.35 : 0.55;
  return `
    <g opacity="${opacity}" stroke="#7DD3FC" stroke-width="2.5" stroke-linecap="round">
      <line x1="90" y1="60" x2="86" y2="78"/>
      <line x1="140" y1="90" x2="136" y2="108"/>
      <line x1="360" y1="70" x2="356" y2="88"/>
      <line x1="400" y1="110" x2="396" y2="128"/>
      <line x1="180" y1="40" x2="176" y2="58"/>
      <line x1="320" y1="50" x2="316" y2="68"/>
    </g>
  `;
}

function background(stage) {
  const darkening = stage * 0.08;
  const bgColors = [
    ['#FFE566', '#FFB703', '#F08C00'],
    ['#FFE566', '#FFB703', '#F08C00'],
    ['#FFD84D', '#F5A623', '#E07800'],
    ['#F5C842', '#E8941A', '#C86A00'],
    ['#D4A82A', '#B87A14', '#8B5A0A'],
    ['#8B7355', '#6B5344', '#4A3728'],
    ['#6B5B4A', '#4A3F35', '#2D2520'],
  ];
  const [top, mid, bottom] = bgColors[stage];
  const shadowOpacity = Math.max(0.1, 0.42 - stage * 0.05);

  return `
    <defs>
      <linearGradient id="peelBg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${top}"/>
        <stop offset="55%" stop-color="${mid}"/>
        <stop offset="100%" stop-color="${bottom}"/>
      </linearGradient>
    </defs>
    <rect width="${SIZE}" height="${SIZE}" fill="url(#peelBg)"/>
    <rect width="${SIZE}" height="${SIZE}" fill="#1E1033" opacity="${darkening}"/>
    ${actionLines(stage)}
    ${rainDrops(stage)}
    <ellipse cx="250" cy="420" rx="68" ry="12" fill="#C58B12" opacity="${shadowOpacity}"/>
  `;
}

function peelTop(stage, droop = 0) {
  const spread = 20 + stage * 3;
  const peelColor = stage >= 5 ? '#C9A227' : '#F7D031';
  const innerColor = stage >= 6 ? '#E8D5A0' : '#FFF8E7';

  return `
    <g>
      <path d="M -6 ${-82 + droop} Q 0 ${-112 + droop} 6 ${-82 + droop} L 0 ${-52 + droop} Z" fill="${peelColor}" stroke="${OUTLINE}" stroke-width="${OUTLINE_W}" stroke-linejoin="round"/>
      <path d="M -${spread} ${-72 + droop} Q -${spread + 6} ${-102 + droop} -${spread - 8} ${-66 + droop} L -6 ${-52 + droop} Z" fill="${peelColor}" stroke="${OUTLINE}" stroke-width="${OUTLINE_W}" stroke-linejoin="round"/>
      <path d="M ${spread} ${-72 + droop} Q ${spread + 6} ${-102 + droop} ${spread - 8} ${-66 + droop} L 6 ${-52 + droop} Z" fill="${peelColor}" stroke="${OUTLINE}" stroke-width="${OUTLINE_W}" stroke-linejoin="round"/>
      <path d="M -${spread - 2} ${-68 + droop} Q 0 ${-86 + droop} ${spread - 2} ${-68 + droop} L 0 ${-48 + droop} Z" fill="${innerColor}" stroke="${OUTLINE}" stroke-width="2"/>
      <ellipse cx="0" cy="${-96 + droop}" rx="9" ry="7" fill="#5C3B1E" stroke="${OUTLINE}" stroke-width="2"/>
      ${stage >= 4 ? `<path d="M -14 ${-64 + droop} Q 0 ${-44 + droop} 16 ${-60 + droop}" fill="none" stroke="#9A6318" stroke-width="2" opacity="0.6"/>` : ''}
    </g>
  `;
}

function peelyFace(stage) {
  const faces = [
    {
      eyes: '<path d="M -20 -14 H -8" stroke="#141414" stroke-width="5" stroke-linecap="round"/><path d="M 8 -14 H 20" stroke="#141414" stroke-width="5" stroke-linecap="round"/>',
      mouth: '<path d="M -22 8 Q 0 28 22 8 Z" fill="#8B1E1E" stroke="#141414" stroke-width="3"/><path d="M -16 10 Q 0 20 16 10" fill="none" stroke="#5C1010" stroke-width="2" opacity="0.4"/>',
      extra: '',
    },
    {
      eyes: '<circle cx="-16" cy="-14" r="3.5" fill="#141414"/><path d="M 8 -16 H 18" stroke="#141414" stroke-width="5" stroke-linecap="round"/>',
      mouth: '<path d="M -14 12 Q 0 20 14 12" fill="none" stroke="#141414" stroke-width="4" stroke-linecap="round"/>',
      extra: '<ellipse cx="26" cy="-20" rx="3" ry="5" fill="#7DD3FC" stroke="#141414" stroke-width="1.5"/>',
    },
    {
      eyes: '<circle cx="-16" cy="-14" r="4" fill="#141414"/><circle cx="16" cy="-14" r="4" fill="#141414"/>',
      mouth: '<path d="M -16 10 Q 0 18 16 10" fill="none" stroke="#141414" stroke-width="4" stroke-linecap="round"/>',
      extra: '<ellipse cx="28" cy="-22" rx="3.5" ry="6" fill="#7DD3FC" stroke="#141414" stroke-width="1.5"/><ellipse cx="22" cy="-10" rx="2.5" ry="4" fill="#7DD3FC" stroke="#141414" stroke-width="1.5"/>',
    },
    {
      eyes: '<path d="M -20 -12 L -12 -18 M -12 -12 L -20 -18" stroke="#141414" stroke-width="4" stroke-linecap="round"/><circle cx="16" cy="-14" r="5" fill="#FFFFFF" stroke="#141414" stroke-width="2"/><circle cx="16" cy="-14" r="2" fill="#141414"/>',
      mouth: '<ellipse cx="0" cy="14" rx="12" ry="9" fill="#8B1E1E" stroke="#141414" stroke-width="3"/>',
      extra: '<ellipse cx="30" cy="-18" rx="4" ry="7" fill="#7DD3FC" stroke="#141414" stroke-width="1.5"/>',
    },
    {
      eyes: '<path d="M -18 -16 Q -14 -8 -10 -16" fill="none" stroke="#141414" stroke-width="4" stroke-linecap="round"/><path d="M 10 -16 Q 14 -8 18 -16" fill="none" stroke="#141414" stroke-width="4" stroke-linecap="round"/>',
      mouth: '<path d="M -18 16 Q 0 8 18 16" fill="none" stroke="#141414" stroke-width="4" stroke-linecap="round"/>',
      extra: '<path d="M -28 -8 Q -26 4 -28 16" fill="none" stroke="#7DD3FC" stroke-width="2.5" stroke-linecap="round"/><path d="M 30 -6 Q 32 6 30 18" fill="none" stroke="#7DD3FC" stroke-width="2.5" stroke-linecap="round"/>',
    },
    {
      eyes: '<line x1="-18" y1="-14" x2="-10" y2="-14" stroke="#141414" stroke-width="4"/><line x1="10" y1="-14" x2="18" y2="-14" stroke="#141414" stroke-width="4"/>',
      mouth: '<path d="M -12 18 L 12 18" fill="none" stroke="#141414" stroke-width="4" stroke-linecap="round"/>',
      extra: '<path d="M -30 -6 Q -28 8 -30 22" fill="none" stroke="#7DD3FC" stroke-width="2.5" stroke-linecap="round"/><path d="M 32 -4 Q 34 10 32 24" fill="none" stroke="#7DD3FC" stroke-width="2.5" stroke-linecap="round"/>',
    },
    {
      eyes: '<path d="M -18 -12 L -10 -20 M -10 -12 L -18 -20" stroke="#141414" stroke-width="4" stroke-linecap="round"/><path d="M 10 -12 L 18 -20 M 18 -12 L 10 -20" stroke="#141414" stroke-width="4" stroke-linecap="round"/>',
      mouth: '<path d="M -8 16 Q 0 10 8 16" fill="none" stroke="#141414" stroke-width="3" stroke-linecap="round"/>',
      extra: '',
    },
  ];

  const face = faces[stage];
  return `
    <g id="face">
      ${face.eyes}
      ${face.mouth}
      ${face.extra}
    </g>
  `;
}

function bruises(stage) {
  if (stage < 2) return '';
  const spots = [];
  const bruiseColor = stage >= 5 ? '#8B5A2E' : '#C58B12';
  if (stage >= 2) spots.push(`<ellipse cx="20" cy="24" rx="8" ry="6" fill="${bruiseColor}" opacity="0.5"/>`);
  if (stage >= 3) spots.push(`<ellipse cx="-26" cy="44" rx="10" ry="7" fill="${bruiseColor}" opacity="0.45"/>`);
  if (stage >= 4) spots.push(`<ellipse cx="8" cy="72" rx="9" ry="7" fill="#9A6318" opacity="0.5"/>`);
  if (stage >= 5) spots.push(`<ellipse cx="-12" cy="90" rx="11" ry="8" fill="#7A4F20" opacity="0.55"/>`);
  if (stage >= 6) spots.push(`<ellipse cx="18" cy="56" rx="14" ry="10" fill="#6B4423" opacity="0.6"/>`);
  return `<g>${spots.join('')}</g>`;
}

function bananaColor(stage) {
  if (stage >= 6) return ['#C9A227', '#A67C1A'];
  if (stage >= 4) return ['#E8C840', '#D4A82A'];
  return ['#FFE566', '#F2C230'];
}

function peelyBody(stage) {
  const layouts = [
    { cx: 250, cy: 278, scale: 1, rot: 0, droop: 0 },
    { cx: 250, cy: 286, scale: 0.99, rot: 2, droop: 2 },
    { cx: 248, cy: 294, scale: 0.98, rot: 5, droop: 4 },
    { cx: 242, cy: 304, scale: 0.97, rot: 10, droop: 6 },
    { cx: 236, cy: 316, scale: 0.96, rot: 14, droop: 10 },
    { cx: 228, cy: 328, scale: 0.94, rot: 18, droop: 14 },
    { cx: 250, cy: 352, scale: 0.88, rot: -90, droop: 8 },
  ];

  const poses = [
    {
      leftArm: 'M -42 -8 C -58 -36 -68 -68 -58 -88',
      rightArm: 'M 42 -8 C 58 -36 68 -68 58 -88',
      leftLeg: 'M -18 108 Q -22 158 -20 198',
      rightLeg: 'M 18 108 Q 38 140 58 168',
      leftHand: [-58, -88],
      rightHand: [58, -88],
      leftFoot: [-20, 198],
      rightFoot: [58, 168],
    },
    {
      leftArm: 'M -42 -4 C -54 -24 -60 -52 -54 -72',
      rightArm: 'M 42 -4 C 54 -24 60 -52 54 -72',
      leftLeg: 'M -18 108 Q -22 156 -18 196',
      rightLeg: 'M 18 108 Q 32 148 42 188',
      leftHand: [-54, -72],
      rightHand: [54, -72],
      leftFoot: [-18, 196],
      rightFoot: [42, 188],
    },
    {
      leftArm: 'M -42 0 C -50 -16 -54 -42 -48 -62',
      rightArm: 'M 42 0 C 50 -16 54 -42 48 -62',
      leftLeg: 'M -18 108 Q -20 154 -16 194',
      rightLeg: 'M 18 108 Q 28 144 34 186',
      leftHand: [-48, -62],
      rightHand: [48, -62],
      leftFoot: [-16, 194],
      rightFoot: [34, 186],
    },
    {
      leftArm: 'M -42 4 C -48 -4 -50 -28 -40 -48',
      rightArm: 'M 42 4 C 52 -6 58 -30 52 -50',
      leftLeg: 'M -18 108 Q -18 152 -12 192',
      rightLeg: 'M 18 108 Q 24 142 26 184',
      leftHand: [-40, -48],
      rightHand: [52, -50],
      leftFoot: [-12, 192],
      rightFoot: [26, 184],
    },
    {
      leftArm: 'M -42 8 C -44 -2 -40 -22 -30 -36',
      rightArm: 'M 42 8 C 48 -4 52 -24 44 -40',
      leftLeg: 'M -18 108 Q -14 150 -6 190',
      rightLeg: 'M 18 108 Q 20 138 16 180',
      leftHand: [-30, -36],
      rightHand: [44, -40],
      leftFoot: [-6, 190],
      rightFoot: [16, 180],
    },
    {
      leftArm: 'M -42 12 C -38 2 -30 -10 -20 -20',
      rightArm: 'M 42 12 C 46 0 50 -16 42 -30',
      leftLeg: 'M -18 108 Q -10 146 0 186',
      rightLeg: 'M 18 108 Q 14 134 6 176',
      leftHand: [-20, -20],
      rightHand: [42, -30],
      leftFoot: [0, 186],
      rightFoot: [6, 176],
    },
    {
      leftArm: 'M -62 36 C -82 48 -96 58 -104 66',
      rightArm: 'M 62 36 C 82 48 96 58 104 66',
      leftLeg: 'M -22 64 L -48 88',
      rightLeg: 'M 22 64 L 48 88',
      leftHand: [-104, 66],
      rightHand: [104, 66],
      leftFoot: [-48, 88],
      rightFoot: [48, 88],
    },
  ];

  const layout = layouts[stage];
  const pose = poses[stage];
  const [bananaTop, bananaBottom] = bananaColor(stage);

  return `
    <g transform="translate(${layout.cx} ${layout.cy}) scale(${layout.scale}) rotate(${layout.rot})" filter="url(#dropShadow)">
      <path d="M 0 -52 Q 54 12 50 112 Q 44 198 0 214 Q -44 198 -50 112 Q -54 12 0 -52 Z" fill="url(#banana)" stroke="${OUTLINE}" stroke-width="${OUTLINE_W}" stroke-linejoin="round"/>
      <path d="M -30 -16 Q 0 18 30 -16 Q 26 74 0 88 Q -26 74 -30 -16 Z" fill="#FCE97A" opacity="${stage >= 5 ? 0.15 : 0.35}"/>
      ${bruises(stage)}
      ${peelyFace(stage)}
      ${peelTop(stage, layout.droop)}
      <path d="${pose.leftArm}" fill="none" stroke="url(#banana)" stroke-width="20" stroke-linecap="round"/>
      <path d="${pose.rightArm}" fill="none" stroke="url(#banana)" stroke-width="20" stroke-linecap="round"/>
      <ellipse cx="${pose.leftHand[0]}" cy="${pose.leftHand[1]}" rx="11" ry="9" fill="#5C3B1E" stroke="${OUTLINE}" stroke-width="2"/>
      <ellipse cx="${pose.rightHand[0]}" cy="${pose.rightHand[1]}" rx="11" ry="9" fill="#5C3B1E" stroke="${OUTLINE}" stroke-width="2"/>
      <path d="${pose.leftLeg}" fill="none" stroke="url(#banana)" stroke-width="22" stroke-linecap="round"/>
      <path d="${pose.rightLeg}" fill="none" stroke="url(#banana)" stroke-width="22" stroke-linecap="round"/>
      <ellipse cx="${pose.leftFoot[0]}" cy="${pose.leftFoot[1]}" rx="13" ry="9" fill="#5C3B1E" stroke="${OUTLINE}" stroke-width="2"/>
      <ellipse cx="${pose.rightFoot[0]}" cy="${pose.rightFoot[1]}" rx="13" ry="9" fill="#5C3B1E" stroke="${OUTLINE}" stroke-width="2"/>
    </g>
  `;
}

function buildSvg(stage) {
  const [bananaTop, bananaBottom] = bananaColor(stage);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <defs>
    <linearGradient id="banana" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${bananaTop}"/>
      <stop offset="100%" stop-color="${bananaBottom}"/>
    </linearGradient>
    <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#3F2D00" flood-opacity="0.3"/>
    </filter>
  </defs>
  ${background(stage)}
  ${peelyBody(stage)}
</svg>`;
}

async function writeStagePng(stage, pngBuffer, dirs) {
  for (const outputDir of dirs) {
    const filePath = join(outputDir, `hangman_${stage}.png`);
    writeFileSync(filePath, pngBuffer);
  }
}

for (const outputDir of [...OUTPUT_DIRS, BUNDLE_DIR]) {
  mkdirSync(outputDir, { recursive: true });
}

const STAGE0_SOURCE = join(__dirname, 'hangman_0-source.png');
const stage0SourceExists = await sharp(STAGE0_SOURCE).metadata().then(() => true).catch(() => false);

for (let stage = 0; stage <= 6; stage += 1) {
  let pngBuffer;

  if (stage === 0 && stage0SourceExists) {
    pngBuffer = await sharp(STAGE0_SOURCE)
      .resize(SIZE, SIZE, { fit: 'cover', position: 'centre' })
      .png()
      .toBuffer();
  } else {
    const svg = buildSvg(stage);
    pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
  }

  const dirs = stage === 0 ? [...OUTPUT_DIRS, BUNDLE_DIR] : OUTPUT_DIRS;
  await writeStagePng(stage, pngBuffer, dirs);
  console.log(`Created hangman_${stage}.png (${STAGES[stage]})`);
}

console.log('Original banana mascot defeat sequence generated.');
