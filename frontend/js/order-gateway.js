// submitOrder(order) -> { orderNumber, totalPence, emailed }. The backend is chosen in site-config.js.
import { createMock, fetchSeed, ORDER_PREFIX, RuleError } from './mock-backend.js';
import { siteConfig } from './site-config.js';
import { callFunction, restGet, rpc, settingsMap } from './supabase-rest.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function withTimeout(promise, ms) {
  let timer;
  const limit = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), ms); });
  return Promise.race([promise, limit]).finally(() => clearTimeout(timer));
}

// A rule said no (paused, sold out, day full, ...). The message is meant for the customer; the order was not saved.
export class OrderRejected extends Error {
  constructor(code, message) { super(message); this.name = 'OrderRejected'; this.code = code; }
}

// Mock (D-048): the demo backend. Orders are saved in this browser, where the admin panel can see them, and the same rules
// as the database apply: pause, stock, lead times, daily limit. Nothing is emailed.
let sharedMock;
const safeStorage = () => { try { return globalThis.localStorage ?? null; } catch { return null; } };
const demoStore = () => (sharedMock ??= createMock({ storage: safeStorage(), loadSeed: () => fetchSeed('data/') }));
const storeOf = (config) => config.mock.store || demoStore();

const mockGateway = {
  async submit(order, config) {
    await wait(config.mock.delayMs);
    try {
      const result = await storeOf(config).placeOrder(order);
      if (result.dropped) return { orderNumber: `${ORDER_PREFIX}-0000-00`, totalPence: 0, emailed: false }; // honeypot: looks like success
      return { orderNumber: result.orderNumber, totalPence: result.totalPence, emailed: false };
    } catch (e) {
      if (e instanceof RuleError) throw new OrderRejected(e.code, e.message);
      throw e;
    }
  },
  async state(config) { return storeOf(config).publicState(); },
};

// Supabase: the place-order edge function does everything (rules, prices, stock, number, email). A rule that says no comes back as
// 422 with a message for the customer; anything else (network, 5xx) throws, and the cart offers the WhatsApp backup.
const supabaseGateway = {
  async submit(order, config) {
    const { items, name, phone, notes, pickupDate, pickupTime, website } = order; // totalPenceHint and the like are never sent
    const res = await callFunction('place-order', { items, name, phone, notes, pickupDate, pickupTime, website }, config);
    let data = null;
    try { data = await res.json(); } catch { /* not JSON */ }
    if (res.ok && data && data.orderNumber) return { orderNumber: data.orderNumber, totalPence: data.totalPence, emailed: Boolean(data.emailed) };
    if ((res.status === 422 || res.status === 429) && data && data.message) throw new OrderRejected(data.code || 'rejected', data.message);
    throw new Error(`place-order: ${res.status}`);
  },
  async state(config) {
    const open = { orderingOpen: true, closedMessage: '', fullDates: [], customMinLeadHours: config.customMinLeadHours };
    try {
      const keys = 'ordering_open,ordering_closed_message,custom_min_lead_hours';
      const [rows, full] = await Promise.all([restGet(`settings?select=key,value&key=in.(${keys})`, config), rpc('full_pickup_dates', {}, config).catch(() => [])]);
      const s = settingsMap(rows);
      return { orderingOpen: s.ordering_open !== false, closedMessage: s.ordering_closed_message || '', fullDates: Array.isArray(full) ? full : [], customMinLeadHours: Number(s.custom_min_lead_hours) || config.customMinLeadHours };
    } catch { return open; } // if the settings cannot be read the cart stays usable; the function still enforces every rule
  },
};

const gateways = { mock: mockGateway, supabase: supabaseGateway };

export async function submitOrder(order, config = siteConfig) {
  const gateway = gateways[config.backend];
  if (!gateway) throw new Error(`Unknown backend: ${config.backend}`);
  return withTimeout(gateway.submit(order, config), config.gatewayTimeoutMs);
}

// What the cart needs before an order: is ordering open (and the message), and which pickup days are full.
export async function getOrderingState(config = siteConfig) {
  const gateway = gateways[config.backend];
  if (!gateway) throw new Error(`Unknown backend: ${config.backend}`);
  return gateway.state(config);
}
