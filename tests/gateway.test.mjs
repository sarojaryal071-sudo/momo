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

test('an unknown backend fails', async () => {
  await assert.rejects(submitOrder({}, { ...config(), backend: 'nope' }), /Unknown backend/);
});

// ---- the Supabase gateway (calls the place-order function; no network here, fetch is replaced) ----
const live = () => ({ backend: 'supabase', supabaseUrl: 'https://p.supabase.co', supabaseAnonKey: 'sb_publishable_x', gatewayTimeoutMs: 500, customMinLeadHours: 48, limits: {}, mock: { delayMs: 0 } });
const withFetch = async (impl, fn) => { const real = globalThis.fetch; globalThis.fetch = impl; try { return await fn(); } finally { globalThis.fetch = real; } };
const reply = (status, body) => async () => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

test('supabase gateway posts only the order fields with the publishable key and returns the number', async () => {
  let seen;
  const impl = async (url, init) => { seen = { url, init }; return new Response(JSON.stringify({ orderNumber: 'SS-1311-01', totalPence: 1000, emailed: true }), { status: 200 }); };
  const r = await withFetch(impl, () => submitOrder({ ...order(), totalPenceHint: 1, website: '' }, live()));
  assert.deepEqual(r, { orderNumber: 'SS-1311-01', totalPence: 1000, emailed: true });
  assert.equal(seen.url, 'https://p.supabase.co/functions/v1/place-order');
  assert.equal(seen.init.headers.apikey, 'sb_publishable_x');
  assert.equal('totalPenceHint' in JSON.parse(seen.init.body), false);
});
test('supabase gateway turns a refusal (422 or 429) into OrderRejected and a server error into a plain error', async () => {
  await withFetch(reply(422, { code: 'stock', message: 'Frozen veg momo is sold out.' }), () => assert.rejects(submitOrder(order(), live()), (e) => e instanceof OrderRejected && e.code === 'stock' && e.message === 'Frozen veg momo is sold out.'));
  await withFetch(reply(429, { code: 'rate', message: 'Too many orders' }), () => assert.rejects(submitOrder(order(), live()), (e) => e instanceof OrderRejected && e.code === 'rate'));
  await withFetch(reply(500, { code: 'server' }), () => assert.rejects(submitOrder(order(), live()), (e) => !(e instanceof OrderRejected)));
  await withFetch(async () => { throw new TypeError('network down'); }, () => assert.rejects(submitOrder(order(), live()), /network down/));
});
test('supabase ordering state reads the public settings and the full dates, and stays open when they cannot be read', async () => {
  const impl = async (url) => url.includes('/rpc/full_pickup_dates') ? new Response(JSON.stringify(['2026-11-14']), { status: 200 })
    : new Response(JSON.stringify([{ key: 'ordering_open', value: false }, { key: 'ordering_closed_message', value: 'Back Friday.' }, { key: 'custom_min_lead_hours', value: 72 }]), { status: 200 });
  const s = await withFetch(impl, () => getOrderingState(live()));
  assert.deepEqual(s, { orderingOpen: false, closedMessage: 'Back Friday.', fullDates: ['2026-11-14'], customMinLeadHours: 72 });
  const open = await withFetch(reply(500, {}), () => getOrderingState(live()));
  assert.equal(open.orderingOpen, true);
});
