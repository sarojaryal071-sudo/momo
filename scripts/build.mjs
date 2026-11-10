// Build v1: copy frontend/ and admin/ to dist/, add noindex logic, write sitemap.xml and robots.txt.
// TODO(step-3): fetch products from Supabase, fill build regions, write products.json, convert photos.
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(import.meta.url), '..', '..');
const dist = join(root, 'dist');
const siteUrl = (process.env.SITE_URL || 'http://localhost:8080').replace(/\/+$/, '');
const indexable = process.env.SITE_INDEXABLE === 'true';
const NOINDEX = '<meta name="robots" content="noindex">';
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

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
const skipKeep = { filter: (src) => !src.endsWith('.gitkeep') };
await cp(join(root, 'frontend'), dist, { recursive: true, ...skipKeep });
if (existsSync(join(root, 'admin'))) await cp(join(root, 'admin'), join(dist, 'admin'), { recursive: true, ...skipKeep });

const htmlFiles = (await walk(dist)).filter((f) => f.endsWith('.html'));
const indexablePages = [];
let noindexed = 0;
for (const file of htmlFiles) {
  const rel = relative(dist, file).split('\\').join('/');
  const isAdmin = rel.startsWith('admin/');
  const neverIndex = isAdmin || alwaysNoindex.has(rel);
  if (!neverIndex) indexablePages.push(rel);
  if ((neverIndex || !indexable)) {
    let html = await readFile(file, 'utf8');
    if (!/<meta[^>]+name=["']robots["']/i.test(html)) {
      html = html.replace(/<head[^>]*>/i, (m) => `${m}\n  ${NOINDEX}`);
      await writeFile(file, html);
      noindexed++;
    }
  }
}

const today = new Date().toISOString().slice(0, 10);
const urlFor = (rel) => (rel === 'index.html' ? `${siteUrl}/` : `${siteUrl}/${rel}`);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  indexablePages.sort().map((p) => `  <url><loc>${urlFor(p)}</loc><lastmod>${today}</lastmod></url>\n`).join('') +
  `</urlset>\n`;
await writeFile(join(dist, 'sitemap.xml'), sitemap);
await writeFile(join(dist, 'robots.txt'),
  indexable ? `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n` : `User-agent: *\nDisallow: /\n`);

console.log(`Built dist/ for ${siteUrl}`);
console.log(`Indexable: ${indexable}; HTML pages: ${htmlFiles.length}; noindex added to ${noindexed}; sitemap URLs: ${indexablePages.length}`);
