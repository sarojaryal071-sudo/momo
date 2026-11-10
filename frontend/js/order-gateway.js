// submitOrder(order) -> { orderNumber, totalPence, emailed }. The backend is chosen in site-config.js.
import { siteConfig } from './site-config.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function withTimeout(promise, ms) {
  let timer;
  const limit = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), ms); });
  return Promise.race([promise, limit]).finally(() => clearTimeout(timer));
}

// Mock: returns a clearly fake number, saves and emails nothing.
const mockGateway = {
  async submit(order, config) {
    await wait(config.mock.delayMs);
    return { orderNumber: config.mock.orderNumber, totalPence: order.totalPenceHint ?? 0, emailed: false };
  },
};

// Supabase: arrives in Step 3 (calls the place-order edge function).
const supabaseGateway = {
  async submit() { throw new Error('The Supabase gateway is not built yet (Step 3).'); },
};

const gateways = { mock: mockGateway, supabase: supabaseGateway };

export async function submitOrder(order, config = siteConfig) {
  const gateway = gateways[config.backend];
  if (!gateway) throw new Error(`Unknown backend: ${config.backend}`);
  return withTimeout(gateway.submit(order, config), config.gatewayTimeoutMs);
}
