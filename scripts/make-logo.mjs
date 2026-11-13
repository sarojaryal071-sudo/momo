// One-off: turns docs/design/logo/logo-source-transparent.png into every logo file the site and admin use (Step 4p, D-068).
// Run `npm run logo`; the outputs are committed. The source is a rendered image: it is only cropped, resized and placed, never redrawn.
import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';

const SRC = 'docs/design/logo/logo-source-transparent.png';
const IMG = 'frontend/assets/img';
const ICONS = 'frontend/assets/icons';
const ADMIN = 'admin/assets';
const PAPER = { r: 255, g: 255, b: 255, alpha: 1 }; // the site's white page base
const SOLID = 128; // an alpha above this counts as drawn (below it is the soft halo of the render)
const PAD = 14; // transparent margin kept around the crops, in source pixels

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const solid = (x, y) => data[(y * W + x) * 4 + 3] > SOLID;
const bbox = (y0, y1) => {
  let x0 = W, x1 = -1, top = H, bottom = -1;
  for (let y = y0; y <= y1; y++) for (let x = 0; x < W; x++) if (solid(x, y)) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < top) top = y; if (y > bottom) bottom = y; }
  return { x0, x1, top, bottom };
};
const rowHas = (y) => { for (let x = 0; x < W; x++) if (solid(x, y)) return true; return false; };

// the mark is everything above the first empty band between the wave and the wordmark
let y = 0; while (!rowHas(y)) y++;
const markTop = y; while (rowHas(y)) y++;
const markBottom = y - 1;
const full = bbox(0, H - 1); const mark = bbox(markTop, markBottom);
const crop = (b) => ({ left: Math.max(0, b.x0 - PAD), top: Math.max(0, b.top - PAD), width: Math.min(W, b.x1 + PAD + 1) - Math.max(0, b.x0 - PAD), height: Math.min(H, b.bottom + PAD + 1) - Math.max(0, b.top - PAD) });
const fullBuf = await sharp(SRC).extract(crop(full)).png().toBuffer();
const markCrop = crop(mark); markCrop.height = Math.min(markCrop.height, (markBottom + 1 + Math.floor((rowGapEnd()) )) - markCrop.top);
function rowGapEnd() { let g = markBottom + 1, n = 0; while (!rowHas(g)) { g++; n++; } return Math.floor(n / 2); }
const markBuf = await sharp(SRC).extract(markCrop).png().toBuffer();

await mkdir(IMG, { recursive: true }); await mkdir(ICONS, { recursive: true });
const webp = (buf, width, file) => sharp(buf).resize({ width }).webp({ quality: 90, alphaQuality: 100 }).toFile(file);
for (const w of [240, 480, 960]) await webp(fullBuf, w, `${IMG}/logo-full-${w}.webp`);
for (const w of [64, 128, 256]) await webp(markBuf, w, `${IMG}/logo-mark-${w}.webp`);

// icons: the mark centred on a solid square with padding (no transparency)
const square = async (size, file, ratio = 0.7) => {
  const inner = await sharp(markBuf).resize({ width: Math.round(size * ratio), height: Math.round(size * ratio), fit: 'inside' }).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: PAPER } }).composite([{ input: inner, gravity: 'centre' }]).png().toFile(file);
};
await square(32, `${ICONS}/favicon-32.png`, 0.92);
await square(180, `${ICONS}/favicon-180.png`, 0.72);
await square(512, `${ICONS}/icon-512.png`, 0.66); // 66%: stays inside a maskable icon's safe zone
await mkdir(ADMIN, { recursive: true });
await square(180, `${ADMIN}/apple-touch-icon.png`, 0.72); await square(192, `${ADMIN}/icon-192.png`, 0.66); await square(512, `${ADMIN}/icon-512.png`, 0.66);

// share image 1200x630: the full lockup centred on the page white
const lockup = await sharp(fullBuf).resize({ height: 540, fit: 'inside' }).toBuffer();
await sharp({ create: { width: 1200, height: 630, channels: 4, background: PAPER } }).composite([{ input: lockup, gravity: 'centre' }]).webp({ quality: 88 }).toFile(`${IMG}/og-share.webp`);
console.log('logo files written; mark crop', markCrop, 'full crop', crop(full));
