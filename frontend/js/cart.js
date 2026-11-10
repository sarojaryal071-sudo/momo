// Cart: slug, quantity and chosen option ids only, in localStorage (strictly necessary, no cookies). Prices come from data/products.json.
import { siteConfig } from './site-config.js';

const KEY = 'ss-cart';

export function formatPrice(pence) {
  const pounds = pence / 100;
  return '£' + (Number.isInteger(pounds) ? String(pounds) : pounds.toFixed(2));
}

const clamp = (qty, max) => Math.min(max, Math.max(1, Math.floor(Number(qty)) || 1));

function defaultStorage() {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

// A line is one product with one set of chosen options. Only non-default options are stored.
const cleanOptions = (options) => [...new Set((Array.isArray(options) ? options : []).filter((o) => typeof o === 'string' && o))].sort();
export const lineKey = (slug, options) => [slug, ...cleanOptions(options)].join('|');
const withOptions = (slug, qty, options) => {
  const o = cleanOptions(options);
  return o.length ? { slug, qty, options: o } : { slug, qty };
};

export function createCart({ storage = defaultStorage(), maxQty = siteConfig.limits.maxQtyPerItem, maxItems = siteConfig.limits.maxLineItems } = {}) {
  let memory = [];
  const read = () => {
    try {
      const raw = storage && storage.getItem(KEY);
      if (!raw) return memory;
      const data = JSON.parse(raw);
      if (!Array.isArray(data)) return [];
      return data.filter((i) => i && typeof i.slug === 'string').map((i) => withOptions(i.slug, clamp(i.qty, maxQty), i.options));
    } catch { return memory; }
  };
  const write = (items) => {
    memory = items;
    try { if (storage) storage.setItem(KEY, JSON.stringify(items)); } catch { /* keep the in-memory copy */ }
  };
  const same = (i, slug, options) => lineKey(i.slug, i.options) === lineKey(slug, options);
  return {
    items: read,
    count: () => read().reduce((n, i) => n + i.qty, 0),
    qtyOf: (slug, options = []) => read().filter((i) => same(i, slug, options)).reduce((n, i) => n + i.qty, 0),
    add(slug, qty = 1, options = []) {
      const items = read();
      const found = items.find((i) => same(i, slug, options));
      if (found) found.qty = clamp(found.qty + qty, maxQty);
      else if (items.length >= maxItems) return false;
      else items.push(withOptions(slug, clamp(qty, maxQty), options));
      write(items);
      return true;
    },
    setQty(slug, qty, options = []) { write(read().map((i) => (same(i, slug, options) ? withOptions(slug, clamp(qty, maxQty), options) : i))); },
    remove(slug, options = []) { write(read().filter((i) => !same(i, slug, options))); },
    clear() { write([]); },
  };
}

let shared;
export const getCart = () => (shared ??= createCart());

// Joins cart items with product data. Unit price = base price + the chosen options' price changes.
// Missing, unavailable, unpriced or sold-out products are flagged and not counted.
export function buildLines(items, products, maxQty = siteConfig.limits.maxQtyPerItem) {
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  return items.map(({ slug, qty, options = [] }) => {
    const product = bySlug.get(slug) || null;
    const all = product ? (product.option_groups || []).flatMap((g) => g.options || []) : [];
    const chosen = options.map((id) => all.find((o) => o.id === id)).filter(Boolean);
    const customised = chosen.some((o) => !o.is_default);
    const stock = product && Number.isInteger(product.stock_quantity) ? product.stock_quantity : null;
    const usesStock = stock !== null && !customised; // customised lines are made to order
    const soldOut = usesStock && stock === 0;
    const unavailable = !product || !product.available || product.price_pence == null || soldOut;
    const unitPence = unavailable ? 0 : product.price_pence + chosen.reduce((sum, o) => sum + (o.price_delta_pence || 0), 0);
    return {
      slug, qty, options, product, unavailable, soldOut, customised, unitPence,
      optionText: chosen.map((o) => o.label).join(', '),
      maxQty: usesStock ? Math.min(stock, maxQty) : maxQty,
      overStock: usesStock && qty > stock,
      linePence: unavailable ? 0 : unitPence * qty,
    };
  });
}

export const cartTotal = (lines) => lines.reduce((sum, l) => sum + l.linePence, 0);

export function updateHeaderCount(doc = document) {
  const n = getCart().count();
  doc.querySelectorAll('[data-cart-count]').forEach((el) => { el.textContent = String(n); });
  doc.querySelectorAll('[data-cart-link]').forEach((el) => el.setAttribute('aria-label', `Cart, ${n} ${n === 1 ? 'item' : 'items'}`));
}
