// submitOrder(order) -> { orderNumber, totalPence, emailed }. The backend is chosen in site-config.js.
import { createMock, fetchSeed, ORDER_PREFIX, RuleError } from './mock-backend.js';
import { siteConfig } from './site-config.js';

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

// Supabase: arrives in Step 3 (calls the place-order edge function).
const supabaseGateway = {
  async submit() { throw new Error('The Supabase gateway is not built yet (Step 3).'); },
  async state() { return { orderingOpen: true, closedMessage: '', fullDates: [] }; },
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
