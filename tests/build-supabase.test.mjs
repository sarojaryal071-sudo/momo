// The build against a fake Supabase (a local HTTP server that answers like the REST API and the storage bucket).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { mapProducts } from '../scripts/lib/supabase.mjs';

const OPT = (id, label, is_default = false, price = 0) => ({ id, label, price_delta_pence: price, is_default, sort_order: 1, active: true });
const rows = (extra = {}) => [{
  slug: 'chicken-momo', name: 'Frozen chicken momo', kind: 'pack', category: null, unit_label: '40 pieces', price_pence: 1050, available: true, photo_path: 'chicken.jpg', photo_alt: 'A bag of chicken momo',
  sort_order: 1, ingredients_text: 'Chicken, onion', allergens: ['gluten'], allergen_note: null,
  product_option_groups: [{ id: 'g1', label: 'Spice level', kind: 'single', sort_order: 1, active: true, product_options: [OPT('o1', 'Mild'), OPT('o2', 'Hot', false, 50)] }],
  product_stock: { quantity: 7 }, ...extra,
}, { slug: 'unpriced', name: 'No price yet', kind: 'addon', unit_label: '', price_pence: null, available: false, sort_order: 2, product_option_groups: [], product_stock: null }];

async function withServer(handler, fn) {
  const server = createServer(handler);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  try { return await fn(`http://127.0.0.1:${server.address().port}`); } finally { await new Promise((r) => server.close(r)); }
}
// Asynchronous on purpose: the fake Supabase server runs in this process, which must stay free to answer the build's requests.
const build = (url, extraEnv = {}) => new Promise((resolve) => {
  const out = mkdtempSync(join(tmpdir(), 'ss-dist-'));
  execFile(process.execPath, ['scripts/build.mjs'], { encoding: 'utf8', env: { ...process.env, DIST_DIR: out, SITE_URL: 'https://example.test', SITE_BACKEND: 'supabase', SUPABASE_URL: url, SUPABASE_ANON_KEY: 'sb_publishable_test', ...extraEnv } },
    (error, stdout, stderr) => resolve({ status: error ? error.code ?? 1 : 0, stdout, stderr, out }));
});
const jpeg = await sharp({ create: { width: 600, height: 400, channels: 3, background: '#cc8844' } }).jpeg().toBuffer();
const api = (data, seen = []) => (req, res) => {
  seen.push({ url: req.url, key: req.headers.apikey });
  if (req.url.startsWith('/rest/v1/products')) { res.setHeader('content-type', 'application/json'); return res.end(JSON.stringify(data)); }
  if (req.url.startsWith('/storage/v1/object/public/product-images/')) { res.setHeader('content-type', 'image/jpeg'); return res.end(jpeg); }
  res.statusCode = 404; res.end('{}');
};

test('mapProducts keeps active options, the stock and drops products without a price', () => {
  const [p, ...rest] = mapProducts(rows());
  assert.equal(rest.length, 0);
  assert.equal(p.stock_quantity, 7);
  assert.deepEqual(p.option_groups[0].options.map((o) => [o.label, o.price_delta_pence]), [['Mild', 0], ['Hot', 50]]);
});

test('a live build writes products.json, the product cards, the photos and the public config', async () => {
  const seen = [];
  await withServer(api(rows(), seen), async (url) => {
    const r = await build(url);
    assert.equal(r.status, 0, r.stderr + r.stdout);
    const json = JSON.parse(readFileSync(join(r.out, 'data/products.json'), 'utf8'));
    assert.equal(json.length, 1);
    assert.equal(json[0].price_pence, 1050);
    assert.equal(json[0].photo, 'products/chicken-momo');
    assert.equal(json[0].option_groups[0].options[1].id, 'o2');
    assert.ok(existsSync(join(r.out, 'assets/products/chicken-momo.webp')) && existsSync(join(r.out, 'assets/products/chicken-momo-400.webp')));
    const shop = readFileSync(join(r.out, 'shop.html'), 'utf8');
    assert.match(shop, /Frozen chicken momo/);
    assert.match(shop, /alt="A bag of chicken momo"/);
    assert.match(shop, /Ingredients and allergens/);
    assert.match(shop, /Gluten/);
    const cfg = readFileSync(join(r.out, 'js/site-config.js'), 'utf8');
    assert.match(cfg, /backend: 'supabase'/);
    assert.match(cfg, /supabaseAnonKey: 'sb_publishable_test'/);
    assert.ok(seen.every((s) => s.key === 'sb_publishable_test'), 'every request carries the publishable key and nothing else');
  });
});

test('a failed or empty fetch fails the build', async () => {
  await withServer((req, res) => { res.statusCode = 500; res.end('x'); }, async (url) => assert.notEqual((await build(url)).status, 0));
  await withServer(api([]), async (url) => { const r = await build(url); assert.notEqual(r.status, 0); assert.match(r.stderr, /no active products/); });
});

test('a photo without alt text fails the build', async () => {
  await withServer(api(rows({ photo_alt: null })), async (url) => { const r = await build(url); assert.notEqual(r.status, 0); assert.match(r.stderr, /alt text/); });
});

test('the real backend without the variables fails the build instead of using stale data', async () => {
  const r = await build('', { SUPABASE_URL: '', SUPABASE_ANON_KEY: '' });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /SUPABASE_ANON_KEY/);
});
