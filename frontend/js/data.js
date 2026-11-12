// Loads product and pickup data. products.json is written by the build; the seed files are the local-dev fallback.
// With the real backend (siteConfig.backend === 'supabase') the pickup rules, public settings and stock are read at runtime
// with the publishable key, so a static page never shows stale rules or stock (architecture section 11).
import { siteConfig } from './site-config.js';
import { isLive, restGet, settingsMap } from './supabase-rest.js';

const getJson = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
};

// slug -> quantity for every product whose stock is tracked; null when the real backend is not in use or cannot be read.
export async function loadRuntimeStock() {
  if (!isLive()) return null;
  try {
    const rows = await restGet('product_stock?select=quantity,product:products(slug)');
    return new Map(rows.filter((r) => r.product).map((r) => [r.product.slug, r.quantity]));
  } catch { return null; }
}

export async function loadProducts() {
  let products;
  try { products = await getJson('data/products.json'); } catch { products = await getJson('data/products.seed.json'); }
  const stock = await loadRuntimeStock();
  if (stock) for (const p of products) p.stock_quantity = stock.has(p.slug) ? stock.get(p.slug) : null;
  return products;
}

const hhmm = (t) => (t ? String(t).slice(0, 5) : null);

export async function loadPickup() {
  if (!isLive()) return getJson('data/pickup.seed.json');
  const keys = 'min_lead_hours,max_days_ahead,custom_min_lead_hours,low_stock_threshold,max_qty_per_item';
  const [rules, exceptions, rows] = await Promise.all([
    restGet('pickup_rules?select=weekday,start_time,end_time,slot_minutes,active'),
    restGet('pickup_exceptions?select=date,kind,start_time,end_time,slot_minutes'),
    restGet(`settings?select=key,value&key=in.(${keys})`),
  ]);
  const s = settingsMap(rows);
  if (Number.isFinite(Number(s.custom_min_lead_hours))) siteConfig.customMinLeadHours = Number(s.custom_min_lead_hours);
  if (Number.isFinite(Number(s.low_stock_threshold))) siteConfig.lowStockThreshold = Number(s.low_stock_threshold);
  if (Number.isFinite(Number(s.max_qty_per_item))) siteConfig.limits.maxQtyPerItem = Number(s.max_qty_per_item);
  return {
    settings: { min_lead_hours: Number(s.min_lead_hours) || 24, max_days_ahead: Number(s.max_days_ahead) || 14 },
    rules: rules.map((r) => ({ ...r, start_time: hhmm(r.start_time), end_time: hhmm(r.end_time) })),
    exceptions: exceptions.map((e) => ({ ...e, start_time: hhmm(e.start_time), end_time: hhmm(e.end_time) })),
  };
}
