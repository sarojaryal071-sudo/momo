// The demo backend for the admin (D-048): data in this browser's localStorage, shared with the public site in mock mode.
// Only used when siteConfig.backend is 'mock' (local work and the automated tests). The build leaves this file out of a
// site that runs on Supabase, so the fixed demo logins below never ship to production.
import { createMock, fetchSeed, STORE_KEY } from '../../js/mock-backend.js';

// Two fixed logins, not shown on the page. They are never a security control.
const DEMO_ACCOUNTS = [
  { label: 'Owner', email: 'owner@demo.test', password: 'owner-demo-1' },
  { label: 'Developer', email: 'dev@demo.test', password: 'dev-demo-1' },
];
const SESSION_KEY = 'ss-demo-session';

const storage = () => { try { return globalThis.localStorage ?? null; } catch { return null; } };
const store = createMock({ storage: storage(), loadSeed: () => fetchSeed('../data/') });

export const mockApi = {
  backend: 'mock',
  async login(email, password) {
    // The same message for a wrong email and a wrong password: nothing reveals whether an email exists.
    const account = DEMO_ACCOUNTS.find((a) => a.email === String(email).trim().toLowerCase() && a.password === password);
    if (!account) throw new Error('Email or password is wrong.');
    storage()?.setItem(SESSION_KEY, JSON.stringify({ email: account.email, label: account.label, at: Date.now() }));
    return { email: account.email, label: account.label };
  },
  async logout() { storage()?.removeItem(SESSION_KEY); },
  async currentUser() {
    try { const raw = storage()?.getItem(SESSION_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
  },
  listOrders: (filter) => store.listOrders(filter),
  setOrderStatus: (id, status) => store.setOrderStatus(id, status),
  getSettings: () => store.getSettings(),
  saveSettings: (patch) => store.saveSettings(patch),
  listProducts: () => store.listProducts(),
  prepList: (from, to) => store.prepList(from, to),
  // Fires when another tab (for example the public shop) changes the data.
  onChange(callback) { window.addEventListener('storage', (e) => { if (e.key === STORE_KEY) callback(); }); },
  async getSiteStatus() { return { state: 'live', unpublished: false, detail: null }; },
  async publish() { return { state: 'live' }; },
};
