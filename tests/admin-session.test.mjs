import { test } from 'node:test';
import assert from 'node:assert/strict';

const store = new Map();
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
const { clearLogin, isExpired, markLogin } = await import('../admin/js/session.js');
const { ADMIN_SESSION_DAYS } = await import('../admin/js/admin-config.js');
const DAY = 24 * 60 * 60 * 1000;

test('the session lasts 30 days', () => {
  assert.equal(ADMIN_SESSION_DAYS, 30);
  markLogin();
  const at = Number(store.get('ss-admin-login-at'));
  assert.equal(isExpired(at + 29 * DAY), false);
  assert.equal(isExpired(at + 31 * DAY), true);
});
test('a session with no recorded time starts now instead of being refused, and logging out clears it', () => {
  clearLogin();
  assert.equal(store.has('ss-admin-login-at'), false);
  assert.equal(isExpired(), false);
  assert.equal(store.has('ss-admin-login-at'), true);
  clearLogin();
  assert.equal(store.has('ss-admin-login-at'), false);
});
