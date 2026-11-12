import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allowedOrigin, clientIp, ownerEmail, parseOrderBody } from '../backend/supabase/functions/_shared/validate.ts';

const UUID = '11111111-2222-4333-8444-555555555555';
const base = (extra = {}) => ({ items: [{ slug: 'chicken-momo', qty: 2, options: [UUID] }], name: ' Asha ', phone: '07700 900123', ...extra });

test('a well-formed order is copied into a payload with only slug, quantity and option ids', () => {
  const r = parseOrderBody(base({ notes: 'ring', pickupDate: '2026-11-14', pickupTime: '10:30', total_pence: 1, unit_price_pence: 1 }));
  assert.equal(r.ok, true);
  assert.deepEqual(r.payload.items, [{ slug: 'chicken-momo', qty: 2, options: [UUID] }]);
  assert.equal(r.payload.name, 'Asha');
  assert.equal('total_pence' in r.payload, false);
  assert.equal(r.honeypot, false);
});
test('a price sent inside an item is dropped', () => {
  const r = parseOrderBody({ ...base(), items: [{ slug: 'veg-momo', qty: 1, unit_price_pence: 1, price_pence: 1 }] });
  assert.deepEqual(r.payload.items, [{ slug: 'veg-momo', qty: 1, options: [] }]);
});
test('a filled honeypot is flagged', () => assert.equal(parseOrderBody(base({ website: 'spam' })).honeypot, true));
test('bad shapes are refused', () => {
  for (const body of [null, 'x', {}, { items: [] }, base({ items: [{ slug: 5, qty: 1 }] }), base({ items: [{ slug: 'a', qty: 'many' }] }),
    base({ items: [{ slug: 'a', qty: 1, options: ['not-a-uuid'] }] }), base({ items: Array(21).fill({ slug: 'a', qty: 1 }) }), base({ name: 'x'.repeat(500) }),
    base({ pickupDate: 'tomorrow' }), base({ pickupTime: '10.30' })]) {
    assert.equal(parseOrderBody(body).ok, false, JSON.stringify(body).slice(0, 60));
  }
});
test('empty optional fields are fine', () => assert.equal(parseOrderBody(base({ notes: '', pickupDate: '', pickupTime: null })).ok, true));
test('only the site origins may call the function', () => {
  assert.equal(allowedOrigin('https://a.github.io', 'https://a.github.io, https://shop.example/'), 'https://a.github.io');
  assert.equal(allowedOrigin('https://shop.example', 'https://a.github.io, https://shop.example/'), 'https://shop.example');
  assert.equal(allowedOrigin('https://evil.test', 'https://a.github.io'), null);
  assert.equal(allowedOrigin(null, 'https://a.github.io'), null);
  assert.equal(allowedOrigin('https://a.github.io', ''), null);
});
test('the client ip is the first forwarded address', () => {
  const h = (m) => ({ get: (k) => m[k] ?? null });
  assert.equal(clientIp(h({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' })), '1.2.3.4');
  assert.equal(clientIp(h({})), 'unknown');
});
test('the owner email is plain text with the order details and no HTML', () => {
  const m = ownerEmail({ order_number: 'SS-1311-01', total_pence: 2050, items: [{ qty: 2, name: 'Frozen chicken momo', unit_label: '40 pieces', unit_price_pence: 1025, options: [{ label: 'Hot' }], customised: true }], name: '<b>Asha</b>', phone: '07700 900123', notes: 'ring', pickupDate: '2026-11-14', pickupTime: '10:30' }, 'https://x.test/admin/');
  assert.equal(m.subject, 'New order SS-1311-01 (£20.50)');
  assert.match(m.text, /2 x Frozen chicken momo \(40 pieces\) \[Hot\] - customised {2}£20\.50/);
  assert.match(m.text, /Pickup: 2026-11-14 at 10:30/);
  assert.match(m.text, /Name: <b>Asha<\/b>/);
});
