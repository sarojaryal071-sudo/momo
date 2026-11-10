import { test } from 'node:test';
import assert from 'node:assert/strict';
import { submitOrder } from '../frontend/js/order-gateway.js';

const base = { gatewayTimeoutMs: 50, mock: { orderNumber: 'SS-TEST-01', delayMs: 1 } };

test('mock gateway returns a fake number and sends nothing', async () => {
  const r = await submitOrder({ totalPenceHint: 1000 }, { ...base, backend: 'mock' });
  assert.deepEqual(r, { orderNumber: 'SS-TEST-01', totalPence: 1000, emailed: false });
});

test('a slow gateway times out', async () => {
  await assert.rejects(submitOrder({}, { ...base, backend: 'mock', mock: { orderNumber: 'X', delayMs: 500 } }), /timeout/);
});

test('unknown and unbuilt backends fail', async () => {
  await assert.rejects(submitOrder({}, { ...base, backend: 'nope' }), /Unknown backend/);
  await assert.rejects(submitOrder({}, { ...base, backend: 'supabase' }), /Step 3/);
});
