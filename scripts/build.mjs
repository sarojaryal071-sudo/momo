// Build: copy frontend/ and admin/ to dist/, fill marked regions, noindex logic, sitemap, robots, validation.
// TODO(step-3): fetch products from Supabase (fail the build in CI on a failed or empty fetch), write products.json, convert photos.
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fillRegion, merge, renderRegion } from './lib/render.mjs';

const root = resolve(fileURLToPath(import.meta.url), '..', '..');
const dist = join(root, 'dist');
const siteUrl = (process.env.SITE_URL || 'http://localhost:8080').replace(/\/+$/, '');
const indexable = process.env.SITE_INDEXABLE === 'true';
// Until Step 3 there is no Supabase, so products always come from the seed file.
const useSeed = process.argv.includes('--seed') || !process.env.SUPABASE_URL;

// Named constants (D-022).
const NOINDEX = '<meta name="robots" content="noindex">';
const OG_IMAGE = 'assets/img/placeholder-og.webp';
const ORG = { name: 'Steam & Spice', telephone: '+44 7413 069241' };
const TITLE_RANGE = [30, 65];
const DESCRIPTION_RANGE = [120, 165];
// Pages that are never indexed, whatever SITE_INDEXABLE says (SEO rulebook section 5).
const alwaysNoindex = new Set(['cart.html', 'done.html']);

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}
const readJson = async (p) => JSON.parse(await readFile(p, 'utf8'));
const urlFor = (rel) => (rel === 'index.html' ? `${siteUrl}/` : `${siteUrl}/${rel}`);
const escAttr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
const skipKeep = { filter: (src) => !src.endsWith('.gitkeep') };
await cp(join(root, 'frontend'), dist, { recursive: true, ...skipKeep });
if (existsSync(join(root, 'admin'))) await cp(join(root, 'admin'), join(dist, 'admin'), { recursive: true, ...skipKeep });

// Product data merged with developer-owned content.
let products = [];
if (useSeed) {
  const seed = await readJson(join(root, 'frontend/data/products.seed.json'));
  const content = {};
  for (const p of seed) {
    const f = join(root, 'frontend/content/products', `${p.slug}.json`);
    if (existsSync(f)) content[p.slug] = await readJson(f);
  }
  products = merge(seed, content);
}

const htmlFiles = (await walk(dist)).filter((f) => f.endsWith('.html'));
const indexablePages = [];
const errors = [];
const warnings = [];
const titles = new Map();
let noindexed = 0;

for (const file of htmlFiles) {
  const rel = relative(dist, file).split('\\').join('/');
  const isAdmin = rel.startsWith('admin/');
  const neverIndex = isAdmin || alwaysNoindex.has(rel);
  const page = rel.replace(/\.html$/, '');
  let html = await readFile(file, 'utf8');

  if (!isAdmin) {
    if (useSeed && products.length) html = fillRegion(html, renderRegion(page === 'index' ? 'index' : 'shop', products, siteUrl));
    // SEO region: canonical, og:url, og:image, and Organization data on the home page.
    const seo = [
      `<link rel="canonical" href="${urlFor(rel)}">`,
      `<meta property="og:url" content="${urlFor(rel)}">`,
      `<meta property="og:image" content="${siteUrl}/${OG_IMAGE}">`,
      `<meta name="twitter:image" content="${siteUrl}/${OG_IMAGE}">`,
    ];
    if (rel === 'index.html') {
      seo.push(`<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'Organization', name: ORG.name, url: `${siteUrl}/`, telephone: ORG.telephone })}</script>`);
    }
    html = html.replace(/<!-- build:seo -->[\s\S]*?<!-- \/build:seo -->/, `<!-- build:seo -->\n  ${seo.join('\n  ')}\n  <!-- /build:seo -->`);
  }

  if (!neverIndex) indexablePages.push(rel);
  if ((neverIndex || !indexable) && !/<meta[^>]+name=["']robots["']/i.test(html)) {
    html = html.replace(/<head[^>]*>/i, (m) => `${m}\n  ${NOINDEX}`);
    noindexed++;
  }
  await writeFile(file, html);

  // Validation for public pages that could be indexed.
  if (!neverIndex) {
    const title = (html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1];
    const desc = (html.match(/<meta name="description" content="([^"]*)"/i) || [])[1];
    const canonical = (html.match(/<link rel="canonical" href="([^"]*)"/i) || [])[1];
    const h1s = (html.match(/<h1[\s>]/gi) || []).length;
    if (!title) errors.push(`${rel}: missing title`);
    else {
      if (titles.has(title)) errors.push(`${rel}: title duplicates ${titles.get(title)}`);
      titles.set(title, rel);
      const n = title.replace(/&amp;/g, '&').length;
      if (n < TITLE_RANGE[0] || n > TITLE_RANGE[1]) warnings.push(`${rel}: title is ${n} characters`);
    }
    if (!desc) errors.push(`${rel}: missing meta description`);
    else {
      const n = desc.replace(/&amp;/g, '&').length;
      if (n < DESCRIPTION_RANGE[0] || n > DESCRIPTION_RANGE[1]) warnings.push(`${rel}: description is ${n} characters`);
    }
    if (canonical !== urlFor(rel)) errors.push(`${rel}: canonical is "${canonical}", expected ${urlFor(rel)}`);
    if (h1s !== 1) errors.push(`${rel}: ${h1s} h1 elements, expected 1`);
    if (indexable && /TODO:/.test(html)) errors.push(`${rel}: TODO: text remains and SITE_INDEXABLE is true`);
  }
}

const today = new Date().toISOString().slice(0, 10);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  indexablePages.sort().map((p) => `  <url><loc>${urlFor(p)}</loc><lastmod>${today}</lastmod></url>\n`).join('') +
  `</urlset>\n`;
await writeFile(join(dist, 'sitemap.xml'), sitemap);
await writeFile(join(dist, 'robots.txt'),
  indexable ? `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n` : `User-agent: *\nDisallow: /\n`);

console.log(`Built dist/ for ${siteUrl}`);
console.log(`Indexable: ${indexable}; products from seed: ${useSeed}; HTML pages: ${htmlFiles.length}; noindex added to ${noindexed}; sitemap URLs: ${indexablePages.length}`);
for (const w of warnings) console.warn(`WARN  ${w}`);
for (const e of errors) console.error(`ERROR ${e}`);
if (errors.length) process.exit(1);
console.log('Validation passed.');
