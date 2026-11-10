// Cart: slug and quantity only, in localStorage (strictly necessary, no cookies). Prices come from data/products.json.
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

export function createCart({ storage = defaultStorage(), maxQty = siteConfig.limits.maxQtyPerItem, maxItems = siteConfig.limits.maxLineItems } = {}) {
  let memory = [];
  const read = () => {
    try {
      const raw = storage && storage.getItem(KEY);
      if (!raw) return memory;
      const data = JSON.parse(raw);
      if (!Array.isArray(data)) return [];
      return data.filter((i) => i && typeof i.slug === 'string').map((i) => ({ slug: i.slug, qty: clamp(i.qty, maxQty) }));
    } catch { return memory; }
  };
  const write = (items) => {
    memory = items;
    try { if (storage) storage.setItem(KEY, JSON.stringify(items)); } catch { /* keep the in-memory copy */ }
  };
  return {
    items: read,
    count: () => read().reduce((n, i) => n + i.qty, 0),
    add(slug, qty = 1) {
      const items = read();
      const found = items.find((i) => i.slug === slug);
      if (found) found.qty = clamp(found.qty + qty, maxQty);
      else if (items.length >= maxItems) return false;
      else items.push({ slug, qty: clamp(qty, maxQty) });
      write(items);
      return true;
    },
    setQty(slug, qty) { write(read().map((i) => (i.slug === slug ? { slug, qty: clamp(qty, maxQty) } : i))); },
    remove(slug) { write(read().filter((i) => i.slug !== slug)); },
    clear() { write([]); },
  };
}

let shared;
export const getCart = () => (shared ??= createCart());

// Joins cart items with product data. Missing, unavailable or unpriced products are flagged and not counted.
export function buildLines(items, products) {
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  return items.map(({ slug, qty }) => {
    const product = bySlug.get(slug) || null;
    const unavailable = !product || !product.available || product.price_pence == null;
    return { slug, qty, product, unavailable, linePence: unavailable ? 0 : product.price_pence * qty };
  });
}

export const cartTotal = (lines) => lines.reduce((sum, l) => sum + l.linePence, 0);

export function updateHeaderCount(doc = document) {
  const n = getCart().count();
  doc.querySelectorAll('[data-cart-count]').forEach((el) => { el.textContent = String(n); });
  doc.querySelectorAll('[data-cart-link]').forEach((el) => el.setAttribute('aria-label', `Cart, ${n} ${n === 1 ? 'item' : 'items'}`));
}
