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

// Options, stock and customised lines (D-031)
const optionProducts = [{
  slug: 'm', name: 'M', unit_label: '40 pieces', price_pence: 1000, available: true, stock_quantity: 3,
  option_groups: [
    { id: 'leave-out', label: 'Leave out', kind: 'multiple', options: [{ id: 'no-onion', label: 'No onion', price_delta_pence: 0, is_default: false }] },
    { id: 'spice', label: 'Spice level', kind: 'single', options: [
      { id: 'medium', label: 'Medium', price_delta_pence: 0, is_default: true },
      { id: 'hot', label: 'Hot', price_delta_pence: 50, is_default: false },
    ] },
  ],
}];

test('the same product with different options is a different line', () => {
  const cart = createCart({ storage: memoryStorage(), maxQty: 10, maxItems: 20 });
  cart.add('m', 1); cart.add('m', 1, ['no-onion']); cart.add('m', 2, ['no-onion']); cart.add('m', 1, ['hot', 'no-onion']); cart.add('m', 1, ['no-onion', 'hot']);
  assert.deepEqual(cart.items(), [{ slug: 'm', qty: 1 }, { slug: 'm', qty: 3, options: ['no-onion'] }, { slug: 'm', qty: 2, options: ['hot', 'no-onion'] }]);
  assert.equal(cart.qtyOf('m', ['no-onion']), 3);
  cart.setQty('m', 1, ['no-onion']); cart.remove('m');
  assert.deepEqual(cart.items(), [{ slug: 'm', qty: 1, options: ['no-onion'] }, { slug: 'm', qty: 2, options: ['hot', 'no-onion'] }]);
});

test('unit price adds the option price changes and the line is marked customised', () => {
  const [plain, custom] = buildLines([{ slug: 'm', qty: 2 }, { slug: 'm', qty: 2, options: ['hot', 'no-onion'] }], optionProducts);
  assert.equal(plain.customised, false);
  assert.equal(plain.unitPence, 1000);
  assert.equal(custom.customised, true);
  assert.equal(custom.unitPence, 1050);
  assert.equal(custom.linePence, 2100);
  assert.equal(custom.optionText, 'Hot, No onion');
});

test('stock limits standard lines only', () => {
  const [over, custom] = buildLines([{ slug: 'm', qty: 5 }, { slug: 'm', qty: 5, options: ['no-onion'] }], optionProducts);
  assert.equal(over.overStock, true);
  assert.equal(over.maxQty, 3);
  assert.equal(custom.overStock, false);
  assert.equal(custom.maxQty, 10);
  const sold = buildLines([{ slug: 'm', qty: 1 }, { slug: 'm', qty: 1, options: ['hot'] }], [{ ...optionProducts[0], stock_quantity: 0 }]);
  assert.equal(sold[0].unavailable, true);
  assert.equal(sold[0].soldOut, true);
  assert.equal(sold[1].unavailable, false);
});

test('an option that no longer exists is ignored', () => {
  const [l] = buildLines([{ slug: 'm', qty: 1, options: ['gone'] }], optionProducts);
  assert.equal(l.customised, false);
  assert.equal(l.unitPence, 1000);
});
