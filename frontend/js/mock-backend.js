// Demo backend (D-048), developer-facing only. The rules the database will enforce in Step 3 live here, in one place, as pure functions over a
// plain state object, so tests and Step 3 can compare behaviour. A small store keeps the state in localStorage, shared by
// the public site and the admin panel in the same browser. It is a demo: nothing here is a security control.
import { getPickupOptions, noticeText, ukParts } from './pickup.js';
import { siteConfig } from './site-config.js';
import { toWhatsAppNumber } from './whatsapp.js';
import { SETTING_FIELDS, slugify, validateException, validateGroup, validateIngredients, validatePhoto, validateProduct, validateRule, validateSlot } from './admin-rules.js';

export const STORE_KEY = 'ss-store-v2';
export const STATUSES = ['new', 'confirmed', 'ready', 'collected', 'cancelled'];
export const ORDER_PREFIX = 'SS';
export const DEFAULT_CLOSED_MESSAGE = 'We are not taking orders right now. Please check back soon.';
export const DEFAULT_TEMPLATES = {
  confirmed: 'Hi {name}, your order {order_number} is confirmed.\n{items}\nPickup: {pickup}\nAddress: {address}\nPay cash when you pick up. Thank you!',
  ready: 'Hi {name}, your order {order_number} is ready for pickup.\n{items}\nAddress: {address}\nPay cash when you pick up.',
  cancelled: 'Hi {name}, sorry, we had to cancel your order {order_number}. Please message us if you would like to order again.',
  collected: 'Hi {name}, thank you for collecting your order {order_number}. We hope you enjoy your momo!',
};

export class RuleError extends Error {
  constructor(code, message) { super(message); this.name = 'RuleError'; this.code = code; }
}

const clone = (x) => JSON.parse(JSON.stringify(x));
const pad2 = (n) => String(n).padStart(2, '0');
const isoDate = (parts) => `${parts.y}-${pad2(parts.m)}-${pad2(parts.d)}`;
export const ukToday = (now = new Date()) => isoDate(ukParts(now));

const pickupConfig = (state) => ({
  settings: { min_lead_hours: state.settings.min_lead_hours, max_days_ahead: state.settings.max_days_ahead },
  rules: state.pickup.rules,
  exceptions: state.pickup.exceptions,
});

// ---------- queries ----------
export const activeOrders = (state) => state.orders.filter((o) => o.status !== 'cancelled');

export function ordersOnDay(state, date) {
  return activeOrders(state).filter((o) => o.pickup_date === date).length;
}

// Public: dates (only dates) that have reached the daily limit.
export function fullPickupDates(state, from, to) {
  const limit = state.settings.max_orders_per_day;
  if (limit == null) return [];
  const counts = new Map();
  for (const o of activeOrders(state)) if (o.pickup_date) counts.set(o.pickup_date, (counts.get(o.pickup_date) || 0) + 1);
  return [...counts].filter(([d, n]) => n >= limit && (!from || d >= from) && (!to || d <= to)).map(([d]) => d).sort();
}

// Public: what the cart needs to know.
export function publicState(state) {
  const s = state.settings;
  return { orderingOpen: s.ordering_open, closedMessage: s.ordering_closed_message, fullDates: fullPickupDates(state), customMinLeadHours: s.custom_min_lead_hours };
}

// Orders for the admin list. Orders without a pickup date are always included.
export function listOrders(state, { from = null, to = null, statuses = null } = {}) {
  const wanted = statuses && statuses.length ? new Set(statuses) : null;
  return state.orders
    .filter((o) => (!wanted || wanted.has(o.status)) && (!o.pickup_date || ((!from || o.pickup_date >= from) && (!to || o.pickup_date <= to))))
    .sort((a, b) => (a.pickup_date || '').localeCompare(b.pickup_date || '') || (a.pickup_time || '').localeCompare(b.pickup_time || '') || a.created_at.localeCompare(b.created_at))
    .map(clone);
}

// Totals for the kitchen: per product, per option and the customised lines. Cancelled orders are left out.
export function prepList(state, from, to) {
  const orders = activeOrders(state).filter((o) => o.pickup_date && o.pickup_date >= from && o.pickup_date <= (to || from));
  const products = new Map();
  const options = new Map();
  const customised = [];
  for (const o of orders) {
    for (const l of o.items) {
      const p = products.get(l.slug) || { slug: l.slug, name: l.name, unit_label: l.unit_label, qty: 0, customisedQty: 0 };
      p.qty += l.qty;
      if (l.customised) p.customisedQty += l.qty;
      products.set(l.slug, p);
      for (const opt of l.options) {
        const key = `${l.slug}|${opt.group}|${opt.label}`;
        const entry = options.get(key) || { slug: l.slug, product: l.name, group: opt.group, label: opt.label, qty: 0 };
        entry.qty += l.qty;
        options.set(key, entry);
      }
      if (l.customised) customised.push({ order_number: o.order_number, name: o.customer_name, pickup_date: o.pickup_date, pickup_time: o.pickup_time, qty: l.qty, product: l.name, options: l.options.map((x) => x.label) });
    }
  }
  return { orders: orders.length, products: [...products.values()], options: [...options.values()], customised };
}

// ---------- stock ----------
const standardQty = (order) => {
  const map = new Map();
  for (const l of order.items) if (!l.customised) map.set(l.slug, (map.get(l.slug) || 0) + l.qty);
  return map;
};
const productOf = (state, slug) => state.products.find((p) => p.slug === slug);

function takeStock(state, order) {
  for (const [slug, qty] of standardQty(order)) {
    const p = productOf(state, slug);
    if (p && p.stock_quantity != null) p.stock_quantity -= qty;
  }
  order.stock_taken = true;
}
function returnStock(state, order) {
  for (const [slug, qty] of standardQty(order)) {
    const p = productOf(state, slug);
    if (p && p.stock_quantity != null) p.stock_quantity += qty;
  }
  order.stock_taken = false;
}

// ---------- placing an order ----------
function nextNumber(state, orderDate) {
  const [, m, d] = orderDate.split('-');
  state.counters[orderDate] = (state.counters[orderDate] || 0) + 1;
  return `${state.settings.order_prefix || ORDER_PREFIX}-${d}${m}-${pad2(state.counters[orderDate])}`;
}

function buildLine(state, raw) {
  const { limits } = siteConfig;
  const product = productOf(state, raw.slug);
  if (!product || !product.available || product.active === false || product.price_pence == null) throw new RuleError('product', 'One of the items is no longer available.');
  const qty = Math.floor(Number(raw.qty));
  if (!(qty >= 1 && qty <= limits.maxQtyPerItem)) throw new RuleError('quantity', `Choose between 1 and ${limits.maxQtyPerItem} of each item.`);
  const ids = [...new Set(raw.options || [])];
  const chosen = [];
  const perGroup = new Map();
  for (const id of ids) {
    const group = (product.option_groups || []).find((g) => g.active !== false && (g.options || []).some((o) => o.id === id && o.active !== false));
    if (!group) throw new RuleError('option', 'One of the options is not valid for that item.');
    const option = group.options.find((o) => o.id === id);
    perGroup.set(group.id, (perGroup.get(group.id) || 0) + 1);
    if (group.kind === 'single' && perGroup.get(group.id) > 1) throw new RuleError('option', `Choose only one ${group.label.toLowerCase()}.`);
    chosen.push({ group: group.label, label: option.label, price_delta_pence: option.price_delta_pence || 0, is_default: Boolean(option.is_default) });
  }
  const unit = product.price_pence + chosen.reduce((sum, o) => sum + o.price_delta_pence, 0);
  return {
    slug: product.slug, name: product.name, unit_label: product.unit_label, qty, unit_price_pence: unit,
    options: chosen.map(({ group, label, price_delta_pence }) => ({ group, label, price_delta_pence })),
    customised: chosen.some((o) => !o.is_default),
  };
}

// input: { items: [{ slug, qty, options: [ids] }], name, phone, notes, pickupDate, pickupTime, source, website }
// Prices always come from the product data, never from the caller. Returns { orderNumber, totalPence, order } or { dropped }.
export function placeOrder(state, input, now = new Date()) {
  const { limits } = siteConfig;
  const s = state.settings;
  const manual = input.source === 'manual';
  if (!manual && input.website) return { dropped: true }; // honeypot: dropped silently
  if (!manual && !s.ordering_open) throw new RuleError('paused', s.ordering_closed_message || DEFAULT_CLOSED_MESSAGE);
  if (!Array.isArray(input.items) || !input.items.length) throw new RuleError('empty', 'Your cart is empty.');
  if (input.items.length > limits.maxLineItems) throw new RuleError('too_many', `At most ${limits.maxLineItems} different items per order.`);

  const name = String(input.name || '').trim().slice(0, limits.nameMax);
  const phoneRaw = String(input.phone || '').trim().slice(0, limits.phoneMax);
  if (!manual) {
    if (!name) throw new RuleError('name', 'Enter your name.');
    if (!toWhatsAppNumber(phoneRaw)) throw new RuleError('phone', 'Enter a UK phone number, for example 07123 456789.');
  }
  const lines = input.items.map((raw) => buildLine(state, raw));

  // Standard lines are frozen stock and must be in stock. Customised lines are made to order.
  const need = new Map();
  for (const l of lines) if (!l.customised) need.set(l.slug, (need.get(l.slug) || 0) + l.qty);
  for (const [slug, qty] of need) {
    const p = productOf(state, slug);
    if (p.stock_quantity != null && qty > p.stock_quantity) throw new RuleError('stock', p.stock_quantity === 0 ? `${p.name} is sold out.` : `Only ${p.stock_quantity} of ${p.name} left.`);
  }

  const pickupDate = input.pickupDate || null;
  const pickupTime = input.pickupTime || null;
  if (pickupDate && !manual) {
    const customised = lines.some((l) => l.customised);
    const day = getPickupOptions(pickupConfig(state), now, { customised, customLeadHours: s.custom_min_lead_hours }).find((o) => o.date === pickupDate);
    if (!day) {
      throw new RuleError('pickup', customised ? `Customised orders need ${noticeText(s.custom_min_lead_hours)}' notice. Please choose a later day.` : 'That pickup day is not available. Please choose another.');
    }
    if (pickupTime && !day.times.some((t) => t.value === pickupTime)) throw new RuleError('pickup', 'That pickup time is not available. Please choose another.');
    if (s.max_orders_per_day != null && ordersOnDay(state, pickupDate) >= s.max_orders_per_day) throw new RuleError('day_full', 'That day is full. Please choose another day.');
  }

  const order = insertOrder(state, {
    lines, name, phone: phoneRaw, notes: String(input.notes || '').trim().slice(0, limits.notesMax),
    pickupDate, pickupTime: pickupDate ? pickupTime : null, source: manual ? 'manual' : 'website', now,
  });
  return { orderNumber: order.order_number, totalPence: order.total_pence, order: clone(order) };
}

// Writes the order and takes its stock. Also used for the sample orders, which skip the checks above.
function insertOrder(state, { lines, name, phone, notes, pickupDate, pickupTime, source, now, status = 'new', sample = false }) {
  const orderDate = ukToday(now);
  const order = {
    id: globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `o${now.getTime()}${Math.floor(Math.random() * 1e6)}`,
    order_number: nextNumber(state, orderDate), order_date: orderDate,
    pickup_date: pickupDate || null, pickup_time: pickupTime || null,
    customer_name: name || null, customer_phone: phone || null, notes: notes || null,
    items: lines, total_pence: lines.reduce((sum, l) => sum + l.unit_price_pence * l.qty, 0),
    status, source, sample, stock_taken: false, created_at: now.toISOString(), updated_at: now.toISOString(),
  };
  if (status !== 'cancelled') takeStock(state, order);
  state.orders.push(order);
  return order;
}

// ---------- status changes: the only way a status changes ----------
export function setOrderStatus(state, id, status, now = new Date()) {
  const order = state.orders.find((o) => o.id === id);
  if (!order) throw new RuleError('not_found', 'That order was not found.');
  if (!STATUSES.includes(status)) throw new RuleError('status', 'Unknown status.');
  if (order.status === status) return clone(order); // never applied twice
  if (status === 'cancelled') {
    if (order.stock_taken) returnStock(state, order);
  } else if (order.status === 'cancelled') {
    for (const [slug, qty] of standardQty(order)) {
      const p = productOf(state, slug);
      if (p && p.stock_quantity != null && qty > p.stock_quantity) {
        throw new RuleError('stock', `Not enough stock to re-open this order: only ${p.stock_quantity} of ${p.name} left.`);
      }
    }
    takeStock(state, order);
  }
  order.status = status;
  order.updated_at = now.toISOString();
  return clone(order);
}

// ---------- settings ----------
const SETTING_LIMITS = { ordering_closed_message: 300, wa_template_confirmed: 1000, wa_template_ready: 1000, wa_template_cancelled: 1000, wa_template_collected: 1000, pickup_address_text: 500 };
export function saveSettings(state, patch) {
  for (const [key, value] of Object.entries(patch)) {
    if (key === 'ordering_open') state.settings.ordering_open = Boolean(value);
    else if (key === 'order_prefix') {
      if (!/^[A-Z]{1,6}$/.test(String(value))) throw new RuleError('setting', 'Order prefix: 1 to 6 capital letters.');
      state.settings.order_prefix = value;
    } else if (key in SETTING_FIELDS) {
      const spec = SETTING_FIELDS[key];
      if (value === null && spec.optional) state.settings[key] = null;
      else if (Number.isInteger(value) && value >= spec.min && value <= spec.max) state.settings[key] = value;
      else throw new RuleError('setting', `${spec.label}: enter a number from ${spec.min} to ${spec.max}.`);
    } else if (key in SETTING_LIMITS) state.settings[key] = String(value ?? '').slice(0, SETTING_LIMITS[key]);
    else throw new RuleError('setting', `Unknown setting: ${key}`);
  }
  return clone(state.settings);
}

// ---------- initial state and sample orders ----------
export function buildInitialState(seed, now = new Date(), { samples = false } = {}) {
  const pickup = clone(seed.pickup);
  const state = {
    version: 1,
    products: clone(seed.products).map((p) => ({ ...p, stock_quantity: p.stock_quantity ?? null })),
    pickup: { rules: pickup.rules, exceptions: pickup.exceptions || [] },
    settings: {
      min_lead_hours: pickup.settings.min_lead_hours, max_days_ahead: pickup.settings.max_days_ahead,
      custom_min_lead_hours: siteConfig.customMinLeadHours, low_stock_threshold: siteConfig.lowStockThreshold,
      ordering_open: true, ordering_closed_message: DEFAULT_CLOSED_MESSAGE, max_orders_per_day: null,
      wa_template_confirmed: DEFAULT_TEMPLATES.confirmed, wa_template_ready: DEFAULT_TEMPLATES.ready, wa_template_cancelled: DEFAULT_TEMPLATES.cancelled,
      pickup_address_text: '',
    },
    orders: [], counters: {},
  };
  if (samples) addSampleOrders(state, now);
  return state;
}

function addSampleOrders(state, now) {
  const free = { settings: { min_lead_hours: 0, max_days_ahead: state.settings.max_days_ahead }, rules: state.pickup.rules, exceptions: state.pickup.exceptions };
  const dates = getPickupOptions(free, now).map((d) => d.date);
  const [d1, d2] = [dates[0] || null, dates[1] || dates[0] || null];
  const line = (slug, qty, optionIds = []) => buildLine(state, { slug, qty, options: optionIds });
  const samples = [
    { name: 'Sample: Asha', phone: '07700 900101', status: 'new', date: d1, time: '10:30', lines: [line('chicken-momo', 2), line('veg-momo', 1)], notes: '' },
    { name: 'Sample: Bikash', phone: '07700 900102', status: 'new', date: d1, time: '12:15', lines: [line('chicken-momo', 2, ['no-onion', 'hot']), line('hot-sauce-pot', 1)], notes: 'Please ring on arrival.' },
    { name: 'Sample: Chandra', phone: '07700 900103', status: 'confirmed', date: d1, time: '14:00', lines: [line('veg-momo', 3)], notes: '' },
    { name: 'Sample: Dipa', phone: '07700 900104', status: 'ready', date: d2, time: '11:00', lines: [line('chicken-momo', 1), line('chutney-pot', 2)], notes: '' },
    { name: 'Sample: Eshan', phone: '07700 900105', status: 'cancelled', date: d2, time: '16:30', lines: [line('veg-momo', 2)], notes: '' },
    { name: 'Sample: Farida', phone: '07700 900106', status: 'new', date: null, time: null, lines: [line('veg-momo', 1, ['no-coriander'])], notes: 'No date chosen yet.' },
  ];
  samples.forEach((x, i) => insertOrder(state, {
    lines: x.lines, name: x.name, phone: x.phone, notes: x.notes, pickupDate: x.date, pickupTime: x.time, source: 'website',
    now: new Date(now.getTime() - (samples.length - i) * 3600000), status: x.status, sample: true,
  }));
}

// ---------- the store: localStorage, shared by the public site and the admin in this browser ----------
export async function fetchSeed(base) {
  const get = async (name) => { const res = await fetch(`${base}${name}`); if (!res.ok) throw new Error(`${name}: ${res.status}`); return res.json(); };
  const [products, pickup] = await Promise.all([get('products.seed.json'), get('pickup.seed.json')]);
  return { products, pickup };
}

// ---------- admin: products, options, stock, pickup, notice, publishing (Steps 4b and 4c) ----------
// The same operations the real backend offers through api-supabase.js. Product records keep the shape of the seed file; ids are the slugs.
const RANDOM_ID = () => Math.random().toString(36).slice(2, 10);
const fail = (message, code = 'invalid') => { throw new RuleError(code, message); };
const touched = (state) => { state.site = { ...(state.site || {}), unpublished: true }; };

export function settingsWithDefaults(state) {
  return { order_prefix: ORDER_PREFIX, max_qty_per_item: siteConfig.limits.maxQtyPerItem, wa_template_collected: DEFAULT_TEMPLATES.collected, ...clone(state.settings) };
}

export function adminProducts(state) {
  return state.products.map((p, i) => ({
    id: p.slug, slug: p.slug, name: p.name, kind: p.kind, category: p.category ?? null, unit_label: p.unit_label || '',
    price_pence: p.price_pence ?? null, available: p.available !== false, active: p.active !== false, sort_order: p.sort_order ?? i + 1,
    photo_path: p.photo_path ?? p.photo ?? null, photo_alt: p.photo_alt ?? '', ingredients_text: p.ingredients_text ?? '', allergens: [...(p.allergens || [])], allergen_note: p.allergen_note ?? '',
    stock_quantity: p.stock_quantity ?? null,
    option_groups: (p.option_groups || []).map((g, gi) => ({
      id: g.id, label: g.label, kind: g.kind, sort_order: g.sort_order ?? gi + 1, active: g.active !== false,
      options: (g.options || []).map((o, oi) => ({ id: o.id, label: o.label, price_delta_pence: o.price_delta_pence || 0, is_default: Boolean(o.is_default), sort_order: o.sort_order ?? oi + 1, active: o.active !== false })),
    })).sort((a, b) => a.sort_order - b.sort_order),
  })).sort((a, b) => a.sort_order - b.sort_order);
}

const findProduct = (state, id) => state.products.find((p) => p.slug === id) || fail('That product was not found.', 'not_found');

// Creates (no id) or updates one product. Products are never deleted: switch active off instead.
export function saveProduct(state, input) {
  const price = input.price_pence ?? null;
  const merged = { ...input, price_pence: price };
  const error = validateProduct(merged) || validatePhoto(merged) || validateIngredients({ ingredients_text: input.ingredients_text, allergens: input.allergens || [], allergen_note: input.allergen_note });
  if (error) fail(error);
  let p;
  if (input.id) p = findProduct(state, input.id);
  else {
    let slug = slugify(input.name) || 'item';
    const base = slug; let n = 2;
    while (state.products.some((x) => x.slug === slug)) slug = `${base}-${n++}`;
    p = { slug, option_groups: [], stock_quantity: null, sort_order: Math.max(0, ...state.products.map((x) => x.sort_order ?? 0)) + 1 };
    state.products.push(p);
  }
  Object.assign(p, {
    name: String(input.name).trim(), kind: input.kind, unit_label: String(input.unit_label || '').trim(), price_pence: price,
    available: Boolean(input.available), active: Boolean(input.active), photo_path: input.photo_path || null, photo_alt: String(input.photo_alt || '').trim(),
    ingredients_text: String(input.ingredients_text || '').trim(), allergens: [...(input.allergens || [])], allergen_note: String(input.allergen_note || '').trim(),
  });
  if (p.photo_path) p.photo = p.photo_path;
  touched(state);
  return adminProducts(state).find((x) => x.id === p.slug);
}

export function reorderProducts(state, ids) {
  ids.forEach((id, i) => { findProduct(state, id).sort_order = i + 1; });
  touched(state);
}

// Stock is not part of a product edit: it never marks the site as having unpublished changes.
export function setStock(state, id, quantity) {
  const p = findProduct(state, id);
  if (quantity === null) p.stock_quantity = null;
  else if (Number.isInteger(quantity) && quantity >= 0 && quantity <= 100000) p.stock_quantity = quantity;
  else fail('Stock must be a whole number, 0 or more. Leave it empty if you do not count stock.');
  return p.stock_quantity;
}

// One option group with all of its options, replaced as a whole.
export function saveOptionGroup(state, productId, group) {
  const p = findProduct(state, productId);
  const options = (group.options || []).map((o, i) => ({ ...o, price_delta_pence: o.price_delta_pence ?? 0, active: o.active !== false, sort_order: i + 1 }));
  const error = validateGroup(group, options);
  if (error) fail(error);
  p.option_groups ??= [];
  let g = group.id ? p.option_groups.find((x) => x.id === group.id) : null;
  if (!g) { g = { id: `g-${RANDOM_ID()}` }; p.option_groups.push(g); }
  Object.assign(g, { label: String(group.label).trim(), kind: group.kind, active: group.active !== false, sort_order: group.sort_order ?? p.option_groups.length,
    options: options.map((o) => ({ id: o.id || `o-${RANDOM_ID()}`, label: String(o.label).trim(), price_delta_pence: o.price_delta_pence, is_default: Boolean(o.is_default), active: o.active, sort_order: o.sort_order })) });
  touched(state);
  return adminProducts(state).find((x) => x.id === p.slug).option_groups.find((x) => x.id === g.id);
}
export function deleteOptionGroup(state, productId, groupId) {
  const p = findProduct(state, productId);
  p.option_groups = (p.option_groups || []).filter((g) => g.id !== groupId);
  touched(state);
}

// Pickup rules and exceptions (D-038). Rows get ids the first time the admin reads them.
const withIds = (rows) => { rows.forEach((r) => { r.id ??= `r-${RANDOM_ID()}`; }); return rows; };
export const adminPickup = (state) => clone({ rules: withIds(state.pickup.rules), exceptions: withIds(state.pickup.exceptions) });
export function saveRule(state, rule) {
  const error = validateRule(rule) || validateSlot(rule.slot_minutes ?? 1);
  if (error) fail(error);
  const row = { weekday: rule.weekday, start_time: rule.start_time, end_time: rule.end_time, slot_minutes: rule.slot_minutes ?? 1, active: rule.active !== false };
  const existing = rule.id && withIds(state.pickup.rules).find((r) => r.id === rule.id);
  if (existing) Object.assign(existing, row); else state.pickup.rules.push({ id: `r-${RANDOM_ID()}`, ...row });
}
export function deleteRule(state, id) { state.pickup.rules = state.pickup.rules.filter((r) => r.id !== id); }
export function setSlotMinutes(state, minutes) {
  const error = validateSlot(minutes);
  if (error) fail(error);
  state.pickup.rules.forEach((r) => { r.slot_minutes = minutes; });
  state.pickup.exceptions.forEach((e) => { if (e.kind === 'extra') e.slot_minutes = minutes; });
}
export function saveException(state, ex) {
  const error = validateException(ex);
  if (error) fail(error);
  const row = { date: ex.date, kind: ex.kind, start_time: ex.start_time || null, end_time: ex.end_time || null, slot_minutes: ex.slot_minutes ?? 1, note: String(ex.note || '').trim() };
  const existing = ex.id && withIds(state.pickup.exceptions).find((e) => e.id === ex.id);
  if (existing) Object.assign(existing, row); else state.pickup.exceptions.push({ id: `e-${RANDOM_ID()}`, ...row });
}
export function deleteException(state, id) { state.pickup.exceptions = state.pickup.exceptions.filter((e) => e.id !== id); }

// Notice banner (live on the public site without a rebuild)
export const getNotice = (state) => ({ message: '', active: false, ...(state.notice || {}) });
export function saveNotice(state, { message, active }) {
  const text = String(message || '').trim();
  if (text.length > 300) fail('The notice can be at most 300 characters.');
  if (active && !text) fail('Write the notice before switching it on.');
  state.notice = { message: text, active: Boolean(active) };
}

// Publishing: product, option and photo edits set "unpublished changes"; Publish starts a build that takes a moment.
const PUBLISH_SECONDS = 1.5;
export function getSiteStatus(state, now = new Date()) {
  const site = state.site || {};
  const busy = site.publishing_since && now.getTime() - site.publishing_since < PUBLISH_SECONDS * 1000;
  return { state: busy ? 'publishing' : 'live', unpublished: Boolean(site.unpublished), detail: null };
}
export function publish(state, now = new Date()) { state.site = { publishing_since: now.getTime(), unpublished: false }; return { state: 'publishing' }; }

// storage: anything with getItem/setItem/removeItem; without one, the state lives in memory (tests, private windows).
export function createMock({ storage = null, loadSeed, now = () => new Date() } = {}) {
  let memory = null;
  const read = () => {
    try { const raw = storage && storage.getItem(STORE_KEY); if (raw) return JSON.parse(raw); } catch { /* fall through */ }
    return memory ? clone(memory) : null;
  };
  const write = (state) => {
    memory = clone(state);
    try { if (storage) storage.setItem(STORE_KEY, JSON.stringify(state)); } catch { /* the in-memory copy stays */ }
  };
  const load = async () => {
    let state = read();
    if (!state || state.version !== 1) { state = buildInitialState(await loadSeed(), now()); write(state); }
    return state;
  };
  // Runs a change on the state and saves it only when the change succeeds.
  const change = async (fn) => { const state = await load(); const result = fn(state, now()); write(state); return result; };
  const query = async (fn) => fn(await load(), now());
  return {
    query, change,
    reset: async () => { try { storage && storage.removeItem(STORE_KEY); } catch { /* ignore */ } memory = null; await load(); },
    publicState: () => query((s) => publicState(s)),
    placeOrder: (input) => change((s, n) => placeOrder(s, input, n)),
    listOrders: (filter) => query((s) => listOrders(s, filter)),
    setOrderStatus: (id, status) => change((s, n) => setOrderStatus(s, id, status, n)),
    getSettings: () => query((s) => settingsWithDefaults(s)),
    saveSettings: (patch) => change((s) => saveSettings(s, patch)),
    listProducts: () => query((s) => adminProducts(s)),
    saveProduct: (p) => change((s) => saveProduct(s, p)),
    reorderProducts: (ids) => change((s) => reorderProducts(s, ids)),
    setStock: (id, q) => change((s) => setStock(s, id, q)),
    saveOptionGroup: (pid, g) => change((s) => saveOptionGroup(s, pid, g)),
    deleteOptionGroup: (pid, gid) => change((s) => deleteOptionGroup(s, pid, gid)),
    getPickup: () => change((s) => adminPickup(s)),
    saveRule: (r) => change((s) => saveRule(s, r)),
    deleteRule: (id) => change((s) => deleteRule(s, id)),
    setSlotMinutes: (m) => change((s) => setSlotMinutes(s, m)),
    saveException: (e) => change((s) => saveException(s, e)),
    deleteException: (id) => change((s) => deleteException(s, id)),
    getNotice: () => query((s) => getNotice(s)),
    saveNotice: (n) => change((s) => saveNotice(s, n)),
    getSiteStatus: () => query((s, now) => getSiteStatus(s, now)),
    publish: () => change((s, now) => publish(s, now)),
    fullDates: (from, to) => query((s) => fullPickupDates(s, from, to)),
    prepList: (from, to) => query((s) => prepList(s, from, to)),
    pickupConfig: () => query((s) => pickupConfig(s)),
  };
}
