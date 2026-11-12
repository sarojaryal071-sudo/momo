// The only data layer the admin screens use (D-048). Two implementations, chosen by siteConfig.backend:
//  - mock: data in this browser's localStorage (js/mock-backend.js, shared with the public site in mock mode)
//  - supabase: written in Step 3; until then every call says it is not connected.
import { siteConfig } from '../../js/site-config.js';
import { createMock, fetchSeed, STORE_KEY } from '../../js/mock-backend.js';
import { DEMO_ACCOUNTS, SESSION_KEY } from './admin-config.js';

const storage = () => { try { return globalThis.localStorage ?? null; } catch { return null; } };
const store = createMock({ storage: storage(), loadSeed: () => fetchSeed('../data/') });

const mockApi = {
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
};

const notConnected = () => { throw new Error('Supabase is not connected yet (Step 3).'); };
const supabaseApi = Object.fromEntries(['login', 'logout', 'currentUser', 'listOrders', 'setOrderStatus', 'getSettings', 'saveSettings', 'listProducts', 'prepList', 'onChange'].map((name) => [name, notConnected]));
supabaseApi.backend = 'supabase';

export const api = siteConfig.backend === 'supabase' ? supabaseApi : mockApi;
