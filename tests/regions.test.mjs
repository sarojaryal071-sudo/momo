import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fillRegion, formatPrice, merge, renderRegion } from '../scripts/lib/render.mjs';

const read = (p) => readFile(new URL(`../${p}`, import.meta.url), 'utf8');
const seed = JSON.parse(await read('frontend/data/products.seed.json'));
const content = {};
for (const p of seed) {
  try { content[p.slug] = JSON.parse(await read(`frontend/content/products/${p.slug}.json`)); } catch { /* no content file */ }
}
const products = merge(seed, content);

test('formatPrice shows pounds', () => {
  assert.equal(formatPrice(1000), '£10');
  assert.equal(formatPrice(1050), '£10.50');
});

for (const [page, file] of [['index', 'index.html'], ['shop', 'shop.html']]) {
  test(`${file} fallback region matches the seed data`, async () => {
    const html = await read(`frontend/${file}`);
    assert.equal(fillRegion(html, renderRegion(page, products)), html);
  });
}
