// The rules the database will enforce in Step 3 (D-045, D-047, D-048), tested on the demo backend.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { adminProducts, allergenUsage, buildInitialState, deleteAllergen, fullPickupDates, ingredientNames, listAllergens, listOrders, placeOrder, prepList, RuleError, saveAllergen, saveProduct, saveSettings, setOrderStatus } from '../frontend/js/mock-backend.js';

const read = (p) => JSON.parse(readFileSync(new URL(`../frontend/data/${p}`, import.meta.url), 'utf8'));
const seed = { products: read('products.seed.json'), pickup: read('pickup.seed.json') };
const MONDAY = new Date('2026-11-09T12:00:00Z');
const SAT = '2026-11-14';
const SUN = '2026-11-15';
const fresh = () => buildInitialState(seed, MONDAY, { samples: false });
const stock = (state, slug) => state.products.find((p) => p.slug === slug).stock_quantity;
const base = { name: 'Asha', phone: '07413 069241' };
const place = (state, extra = {}, now = MONDAY) => placeOrder(state, { ...base, items: [{ slug: 'chicken-momo', qty: 2 }], pickupDate: SAT, pickupTime: '11:00', ...extra }, now);
const code = (fn) => { try { fn(); } catch (e) { return e instanceof RuleError ? e.code : `other:${e.message}`; } return 'none'; };

test('a standard order takes stock; a customised line does not', () => {
  const s = fresh();
  place(s, { items: [{ slug: 'chicken-momo', qty: 3 }] });
  assert.equal(stock(s, 'chicken-momo'), 24 - 3);
  place(s, { items: [{ slug: 'chicken-momo', qty: 2, options: ['hot'] }] });
  assert.equal(stock(s, 'chicken-momo'), 21);
});

test('prices come from the data: options add their price change, unknown or doubled options are refused', () => {
  const s = fresh();
  s.products.find((p) => p.slug === 'veg-momo').option_groups[1].options.find((o) => o.id === 'hot').price_delta_pence = 50;
  const r = place(s, { items: [{ slug: 'veg-momo', qty: 2, options: ['hot'] }] });
  assert.equal(r.totalPence, 2 * 1050);
  assert.equal(r.order.items[0].customised, true);
  assert.equal(code(() => place(s, { items: [{ slug: 'veg-momo', qty: 1, options: ['nonsense'] }] })), 'option');
  assert.equal(code(() => place(s, { items: [{ slug: 'veg-momo', qty: 1, options: ['mild', 'hot'] }] })), 'option');
  assert.equal(code(() => place(s, { items: [{ slug: 'chicken-momo', qty: 1, options: ['no-such'] }], pickupDate: null })), 'option');
});

test('order numbers are day then month with a counter that restarts each day', () => {
  const s = fresh();
  assert.equal(place(s).orderNumber, 'SS-0911-01');
  assert.equal(place(s).orderNumber, 'SS-0911-02');
  assert.equal(place(s, {}, new Date('2026-11-10T09:00:00Z')).orderNumber, 'SS-1011-01');
});

test('name and a UK phone are required; an empty cart is refused', () => {
  const s = fresh();
  assert.equal(code(() => place(s, { name: ' ' })), 'name');
  assert.equal(code(() => place(s, { phone: '12345' })), 'phone');
  assert.equal(code(() => place(s, { items: [] })), 'empty');
});

test('cancelling returns stock once; cancelling again does not return it twice', () => {
  const s = fresh();
  const { order } = place(s, { items: [{ slug: 'veg-momo', qty: 4 }] });
  assert.equal(stock(s, 'veg-momo'), 20);
  setOrderStatus(s, order.id, 'cancelled', MONDAY);
  assert.equal(stock(s, 'veg-momo'), 24);
  setOrderStatus(s, order.id, 'cancelled', MONDAY);
  assert.equal(stock(s, 'veg-momo'), 24);
});

test('re-opening takes stock again, and fails without changing anything when stock is short', () => {
  const s = fresh();
  const { order } = place(s, { items: [{ slug: 'veg-momo', qty: 4 }] });
  setOrderStatus(s, order.id, 'cancelled', MONDAY);
  s.products.find((p) => p.slug === 'veg-momo').stock_quantity = 3; // someone else bought most of it
  assert.equal(code(() => setOrderStatus(s, order.id, 'confirmed', MONDAY)), 'stock');
  assert.equal(s.orders[0].status, 'cancelled');
  assert.equal(stock(s, 'veg-momo'), 3);
  s.products.find((p) => p.slug === 'veg-momo').stock_quantity = 10;
  setOrderStatus(s, order.id, 'confirmed', MONDAY);
  assert.equal(stock(s, 'veg-momo'), 6);
  setOrderStatus(s, order.id, 'confirmed', MONDAY); // same status again changes nothing
  assert.equal(stock(s, 'veg-momo'), 6);
});

test('stock never goes below zero and a sold-out item cannot be ordered', () => {
  const s = fresh();
  s.products.find((p) => p.slug === 'veg-momo').stock_quantity = 2;
  assert.equal(code(() => place(s, { items: [{ slug: 'veg-momo', qty: 3 }] })), 'stock');
  place(s, { items: [{ slug: 'veg-momo', qty: 2 }] });
  assert.equal(stock(s, 'veg-momo'), 0);
  assert.equal(code(() => place(s, { items: [{ slug: 'veg-momo', qty: 1 }] })), 'stock');
});

test('pause: refused with the message, then open again', () => {
  const s = fresh();
  saveSettings(s, { ordering_open: false, ordering_closed_message: 'Back on Friday.' });
  assert.throws(() => place(s), (e) => e.code === 'paused' && e.message === 'Back on Friday.');
  assert.equal(s.orders.length, 0);
  saveSettings(s, { ordering_open: true });
  assert.equal(code(() => place(s)), 'none');
});

test('daily limit: a full day is refused and listed, a cancelled order frees it', () => {
  const s = fresh();
  saveSettings(s, {}); // no-op
  s.settings.max_orders_per_day = 2;
  place(s);
  const second = place(s);
  assert.deepEqual(fullPickupDates(s), [SAT]);
  assert.equal(code(() => place(s)), 'day_full');
  assert.equal(code(() => place(s, { pickupDate: SUN, pickupTime: '10:00' })), 'none');
  setOrderStatus(s, second.order.id, 'cancelled', MONDAY);
  assert.deepEqual(fullPickupDates(s), []);
  assert.equal(code(() => place(s)), 'none');
});

test('lead time: a customised order needs the longer notice, a standard one does not', () => {
  const s = fresh();
  const friday = new Date('2026-11-13T09:00:00Z'); // 24 h notice reaches Saturday 10:00; 48 h does not
  assert.equal(code(() => place(s, { items: [{ slug: 'chicken-momo', qty: 1 }], pickupDate: SAT, pickupTime: '10:30' }, friday)), 'none');
  assert.equal(code(() => place(s, { items: [{ slug: 'chicken-momo', qty: 1, options: ['hot'] }], pickupDate: SAT, pickupTime: '10:30' }, friday)), 'pickup');
  assert.equal(code(() => place(s, { items: [{ slug: 'chicken-momo', qty: 1, options: ['hot'] }], pickupDate: SUN, pickupTime: '10:30' }, friday)), 'none');
  assert.equal(code(() => place(s, { pickupDate: '2026-11-17', pickupTime: '10:00' })), 'pickup'); // a Tuesday is not a pickup day
});

test('the honeypot is dropped silently', () => {
  const s = fresh();
  assert.deepEqual(place(s, { website: 'x' }), { dropped: true });
  assert.equal(s.orders.length, 0);
});

test('a fresh state has no orders; the developer seed: list and prep list grouped by date, cancelled left out, options counted', () => {
  const s = buildInitialState(seed, MONDAY, { samples: true }); // the developer seed, not reachable from the UI
  const all = listOrders(s);
  assert.equal(all.filter((o) => !o.pickup_date).length, 1);
  assert.ok(all.every((o) => o.sample));
  const days = [...new Set(all.map((o) => o.pickup_date).filter(Boolean))];
  const prep = prepList(s, days[0], days[0]);
  assert.ok(prep.orders >= 1);
  const hot = prep.options.find((o) => o.label === 'Hot');
  assert.equal(hot.qty, 2);
  assert.ok(prep.customised.some((c) => c.options.includes('Hot')));
  const cancelled = all.find((o) => o.status === 'cancelled');
  assert.ok(!prepList(s, cancelled.pickup_date, cancelled.pickup_date).customised.some((c) => c.order_number === cancelled.order_number));
});

test('sample orders hold their stock', () => {
  const s = buildInitialState(seed, MONDAY);
  const std = (slug) => s.orders.filter((o) => o.status !== 'cancelled').flatMap((o) => o.items).filter((l) => l.slug === slug && !l.customised).reduce((n, l) => n + l.qty, 0);
  assert.equal(stock(s, 'veg-momo'), 24 - std('veg-momo'));
});

test('the default state has no orders (D-052); only the developer seed adds them', () => {
  assert.equal(listOrders(buildInitialState(seed, MONDAY)).length, 0);
  assert.ok(listOrders(buildInitialState(seed, MONDAY, { samples: true })).length > 0);
});

test('allergens are an editable list: usage, rename, delete removes it from products, and the check safeguard', () => {
  const s = fresh();
  const list = listAllergens(s);
  assert.equal(list.length, 14);
  const milk = list.find((a) => a.name === 'Milk');
  saveProduct(s, { id: 'chicken-momo', name: 'Frozen chicken momo', kind: 'pack', unit_label: '40 pieces', price_pence: 1000, active: true, available: true, allergen_ids: [milk.id], ingredients: ['Chicken', 'Onion'], allergens_checked_at: '2026-11-13T10:00:00Z' });
  assert.equal(allergenUsage(s, milk.id), 1);
  assert.deepEqual(adminProducts(s).find((p) => p.id === 'chicken-momo').ingredients, ['Chicken', 'Onion']);
  assert.deepEqual(ingredientNames(s), ['Chicken', 'Onion']);
  assert.throws(() => saveAllergen(s, { name: 'MILK' }), /already in the list/);
  saveAllergen(s, { id: milk.id, name: 'Dairy milk' });
  assert.equal(listAllergens(s).find((a) => a.id === milk.id).name, 'Dairy milk');
  saveAllergen(s, { name: 'Kiwi' });
  assert.equal(listAllergens(s).length, 15);
  deleteAllergen(s, milk.id);
  assert.equal(listAllergens(s).length, 14);
  assert.deepEqual(adminProducts(s).find((p) => p.id === 'chicken-momo').allergen_ids, []);
  // not checked: it cannot be shown
  assert.throws(() => saveProduct(s, { id: 'veg-momo', name: 'Frozen veg momo', kind: 'pack', price_pence: 1000, active: true, available: true, allergen_ids: [], ingredients: [] }), /I have checked/);
  assert.ok(saveProduct(s, { id: 'veg-momo', name: 'Frozen veg momo', kind: 'pack', price_pence: 1000, active: false, available: true, allergen_ids: [], ingredients: [] }));
});

// Step 4i: sales summary (D-064)
import { salesBars, salesRange } from '../frontend/js/admin-rules.js';
import { salesSummary } from '../frontend/js/mock-backend.js';
test('sales: only Collected orders count, per pickup day, zero days included', () => {
  const o = (status, pickup_date, total_pence, order_date = '2026-03-01') => ({ status, pickup_date, total_pence, order_date });
  const rows = salesSummary({ orders: [o('collected', '2026-03-02', 1000), o('collected', '2026-03-02', 2050), o('cancelled', '2026-03-02', 999), o('new', '2026-03-02', 999), o('collected', null, 500, '2026-03-04')] }, '2026-03-01', '2026-03-05');
  assert.equal(rows.length, 5);
  assert.deepEqual(rows[1], { day: '2026-03-02', total_pence: 3050, order_count: 2 });
  assert.equal(rows[3].total_pence, 500); assert.equal(rows[0].total_pence, 0);
  assert.throws(() => salesSummary({ orders: [] }, '2026-03-05', '2026-03-01'));
});
test('sales: periods start on Monday, month is the calendar month, custom is validated', () => {
  assert.deepEqual(salesRange('week', '2026-11-15'), { from: '2026-11-09', to: '2026-11-15' }); // a Sunday
  assert.deepEqual(salesRange('week', '2026-11-13'), { from: '2026-11-09', to: '2026-11-15' });
  assert.deepEqual(salesRange('month', '2026-02-10'), { from: '2026-02-01', to: '2026-02-28' });
  assert.ok(salesRange('custom', '2026-11-13', '2026-11-10', '2026-11-01').error);
  assert.ok(salesRange('custom', '2026-11-13', '', '').error);
  assert.deepEqual(salesRange('custom', '2026-11-13', '2026-11-01', '2026-11-01'), { from: '2026-11-01', to: '2026-11-01' });
});
test('sales: a month becomes weekly bars, a week stays daily, totals match', () => {
  const rows = (from, n) => Array.from({ length: n }, (_, i) => ({ day: new Date(Date.UTC(2026, 10, from + i, 12)).toISOString().slice(0, 10), total_pence: 100, order_count: 1 }));
  const week = salesBars(rows(9, 7)); assert.equal(week.bars.length, 7); assert.equal(week.weekly, false);
  const month = salesBars(rows(1, 30)); assert.equal(month.weekly, true); assert.equal(month.total, 3000); assert.equal(month.count, 30);
  assert.equal(month.bars.reduce((s, b) => s + b.total, 0), 3000);
  assert.equal(month.bars[0].to, '2026-11-01'); // Sunday 1 Nov closes the first week
});
