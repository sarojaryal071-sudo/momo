import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createMock } from '../frontend/js/mock-backend.js';
import { OrderRejected, getOrderingState, submitOrder } from '../frontend/js/order-gateway.js';

const read = (p) => JSON.parse(readFileSync(new URL(`../frontend/data/${p}`, import.meta.url), 'utf8'));
const seed = { products: read('products.seed.json'), pickup: read('pickup.seed.json') };
const NOW = new Date('2026-11-09T12:00:00Z'); // a Monday
const config = () => ({ gatewayTimeoutMs: 50, backend: 'mock', mock: { delayMs: 1, store: createMock({ loadSeed: async () => seed, now: () => NOW }) } });
const order = (extra = {}) => ({ items: [{ slug: 'chicken-momo', qty: 1 }], name: 'Test', phone: '07413 069241', ...extra });

test('mock gateway saves the order and returns a day-month number', async () => {
  const c = config();
  const r = await submitOrder(order(), c);
  assert.match(r.orderNumber, /^SS-0911-\d{2}$/);
  assert.equal(r.totalPence, 1000);
  assert.equal(r.emailed, false);
  const saved = await c.mock.store.listOrders();
  assert.ok(saved.some((o) => o.order_number === r.orderNumber && o.source === 'website'));
});

test('a rule that says no becomes OrderRejected with a customer message', async () => {
  const c = config();
  await c.mock.store.saveSettings({ ordering_open: false, ordering_closed_message: 'Closed for now.' });
  await assert.rejects(submitOrder(order(), c), (e) => e instanceof OrderRejected && e.code === 'paused' && e.message === 'Closed for now.');
  assert.equal((await getOrderingState(c)).orderingOpen, false);
});

test('the honeypot is dropped silently and nothing is saved', async () => {
  const c = config();
  const before = (await c.mock.store.listOrders()).length;
  const r = await submitOrder(order({ website: 'spam' }), c);
  assert.match(r.orderNumber, /^SS-/);
  assert.equal((await c.mock.store.listOrders()).length, before);
});

test('a slow gateway times out', async () => {
  const c = config();
  c.mock.delayMs = 500;
  await assert.rejects(submitOrder(order(), c), /timeout/);
});

test('unknown and unbuilt backends fail', async () => {
  await assert.rejects(submitOrder({}, { ...config(), backend: 'nope' }), /Unknown backend/);
  await assert.rejects(submitOrder({}, { ...config(), backend: 'supabase' }), /Step 3/);
});
