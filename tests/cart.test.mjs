import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLines, cartTotal, createCart, formatPrice } from '../frontend/js/cart.js';

const memoryStorage = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };
const products = [
  { slug: 'a', name: 'A', unit_label: '40 pieces', price_pence: 1000, available: true },
  { slug: 'b', name: 'B', unit_label: '1 pot', price_pence: 150, available: true },
  { slug: 'c', name: 'C', unit_label: '1 pot', price_pence: null, available: false },
];

test('formatPrice', () => {
  assert.equal(formatPrice(1000), '£10');
  assert.equal(formatPrice(1050), '£10.50');
  assert.equal(formatPrice(111), '£1.11');
});

test('cart add, setQty, remove, clear, count', () => {
  const cart = createCart({ storage: memoryStorage(), maxQty: 10, maxItems: 20 });
  cart.add('a'); cart.add('a', 2); cart.add('b');
  assert.equal(cart.count(), 4);
  cart.setQty('a', 5);
  assert.equal(cart.count(), 6);
  cart.remove('b');
  assert.deepEqual(cart.items(), [{ slug: 'a', qty: 5 }]);
  cart.clear();
  assert.equal(cart.count(), 0);
});

test('quantity is held between 1 and the maximum', () => {
  const cart = createCart({ storage: memoryStorage(), maxQty: 10, maxItems: 20 });
  cart.add('a', 8); cart.add('a', 8);
  assert.equal(cart.items()[0].qty, 10);
  cart.setQty('a', 0);
  assert.equal(cart.items()[0].qty, 1);
});

test('line item limit and corrupt storage', () => {
  const cart = createCart({ storage: memoryStorage(), maxQty: 10, maxItems: 2 });
  assert.equal(cart.add('a'), true);
  assert.equal(cart.add('b'), true);
  assert.equal(cart.add('c'), false);
  const bad = createCart({ storage: { getItem: () => '{not json', setItem() {} } });
  assert.deepEqual(bad.items(), []);
  assert.equal(createCart({ storage: null }).add('a'), true);
});

test('totals skip unavailable and unknown items', () => {
  const lines = buildLines([{ slug: 'a', qty: 2 }, { slug: 'b', qty: 1 }, { slug: 'c', qty: 1 }, { slug: 'zzz', qty: 1 }], products);
  assert.equal(cartTotal(lines), 2150);
  assert.deepEqual(lines.map((l) => l.unavailable), [false, false, true, true]);
});
