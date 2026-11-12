// Admin rules shared by the screens, the demo backend and the tests (D-021, D-046, D-047). Pure functions, no DOM.
// Money is integer pence; the screens show and accept pounds.

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const LIMITS = { nameMax: 120, unitMax: 60, labelMax: 60, textMax: 2000, noteMax: 500, altMax: 200, maxPence: 100000, slotMax: 240 };

// "10", "10.5", "£10.50" -> 1000, 1050. Anything else (empty, negative, letters, 3 decimals) -> null.
export function poundsToPence(text) {
  const t = String(text ?? '').trim().replace(/^£/, '');
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  const pence = Math.round(parseFloat(t) * 100);
  return pence <= LIMITS.maxPence ? pence : null;
}
export const penceToPounds = (p) => (p == null ? '' : p % 100 === 0 ? String(p / 100) : (p / 100).toFixed(2));
export const formatMoney = (p) => (p % 100 === 0 ? `£${p / 100}` : `£${(p / 100).toFixed(2)}`);

const text = (v) => String(v ?? '').trim();

export function validateProduct(p) {
  if (!text(p.name)) return 'Enter a name.';
  if (text(p.name).length > LIMITS.nameMax) return `The name can be at most ${LIMITS.nameMax} characters.`;
  if (p.kind !== 'pack' && p.kind !== 'addon') return 'Choose what kind of item it is.';
  if (text(p.unit_label).length > LIMITS.unitMax) return `The size or pack label can be at most ${LIMITS.unitMax} characters.`;
  if (p.price_pence != null && !(Number.isInteger(p.price_pence) && p.price_pence >= 0 && p.price_pence <= LIMITS.maxPence)) return 'Enter a price of £0 or more.';
  if ((p.available || p.active) && p.price_pence == null) return 'Set a price before the item can be shown or ordered.';
  return null;
}
export function slugify(name) { return text(name).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60); }

// Photo: an uploaded photo (a file name with an image extension) needs alt text; the build refuses one without it. A name without an
// extension is a picture that ships with the site and already has its description in the page.
export const isUploadedPhoto = (path) => /\.(jpe?g|png|webp)$/i.test(path || '');
export function validatePhoto({ photo_path, photo_alt }) {
  if (isUploadedPhoto(photo_path) && !text(photo_alt)) return 'Describe the photo for people who cannot see it (alt text).';
  if (text(photo_alt).length > LIMITS.altMax) return `The description can be at most ${LIMITS.altMax} characters.`;
  return null;
}
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024; // same limit as the storage bucket
export const PHOTO_MAX_EDGE = 1600; // pixels: the photo is shrunk to this before upload
export function validatePhotoFile(file) {
  if (!file) return 'Choose a photo.';
  if (!PHOTO_TYPES.includes(file.type)) return 'Use a JPEG, PNG or WebP photo.';
  if (file.size > PHOTO_MAX_BYTES * 4) return 'That photo is too large. Choose one under 20 MB.'; // the real limit applies after resizing
  return null;
}

export const INGREDIENT_MAX = 60; // characters in one ingredient tag
export const INGREDIENT_TAGS_MAX = 60; // tags on one product
export const ALLERGEN_NAME_MAX = 80;
export const cleanTag = (t) => String(t ?? '').trim().replace(/\s+/g, ' ');

// Ingredients are tags in her order; allergens are ids from the allergen list in the database (nothing is hard-coded here).
export function validateIngredients({ ingredients = [], allergen_ids = [], allergen_note = '' }) {
  if (!Array.isArray(allergen_ids) || allergen_ids.some((a) => typeof a !== 'string' || !a)) return 'Unknown allergen.';
  if (!Array.isArray(ingredients) || ingredients.length > INGREDIENT_TAGS_MAX) return `A product can have at most ${INGREDIENT_TAGS_MAX} ingredients.`;
  const seen = new Set();
  for (const raw of ingredients) {
    const tag = cleanTag(raw);
    if (!tag) return 'An ingredient cannot be empty.';
    if (tag.length > INGREDIENT_MAX) return `"${tag.slice(0, 20)}..." is too long. An ingredient can be at most ${INGREDIENT_MAX} characters.`;
    if (seen.has(tag.toLowerCase())) return `"${tag}" is listed twice.`;
    seen.add(tag.toLowerCase());
  }
  if (text(allergen_note).length > LIMITS.noteMax) return `The note can be at most ${LIMITS.noteMax} characters.`;
  return null;
}

// The safeguard (D-062): a product cannot be shown until she has confirmed the allergen and ingredient information.
export function validateChecked({ active, checked }) {
  return active && !checked ? 'Tick "I have checked the allergen and ingredient information" before this product can be shown in the shop.' : null;
}

// Allergen names: required, at most 80 characters, no duplicates (ignoring capitals). others = the other names in the list.
export function validateAllergenName(name, others = []) {
  const n = cleanTag(name);
  if (!n) return 'Enter a name for the allergen.';
  if (n.length > ALLERGEN_NAME_MAX) return `The name can be at most ${ALLERGEN_NAME_MAX} characters.`;
  if (others.some((o) => cleanTag(o).toLowerCase() === n.toLowerCase())) return `"${n}" is already in the list.`;
  return null;
}

// An option group and its options. A single-choice group with active options needs exactly one default.
export function validateGroup(group, options) {
  if (!text(group.label)) return 'Give the group a name, for example "Spice level".';
  if (text(group.label).length > LIMITS.labelMax) return `The group name can be at most ${LIMITS.labelMax} characters.`;
  if (group.kind !== 'single' && group.kind !== 'multiple') return 'Choose one choice or several choices.';
  const seen = new Set();
  for (const o of options) {
    if (!text(o.label)) return 'Every option needs a name.';
    if (seen.has(text(o.label).toLowerCase())) return `"${text(o.label)}" is listed twice.`;
    seen.add(text(o.label).toLowerCase());
    if (!(Number.isInteger(o.price_delta_pence) && o.price_delta_pence >= 0 && o.price_delta_pence <= LIMITS.maxPence)) return `Set the price change for "${text(o.label)}" to £0 or more.`;
  }
  const active = options.filter((o) => o.active !== false);
  const defaults = active.filter((o) => o.is_default).length;
  if (group.kind === 'single' && active.length && defaults !== 1) return 'A one-choice group needs exactly one default option.';
  if (group.kind === 'multiple' && defaults > 1) return 'Only one option can be the default.';
  return null;
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
export const minutesOf = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
export function validateRule(r) {
  if (!(Number.isInteger(r.weekday) && r.weekday >= 0 && r.weekday <= 6)) return 'Choose a day of the week.';
  if (!HHMM.test(r.start_time || '') || !HHMM.test(r.end_time || '')) return 'Enter the start and end time, for example 10:00.';
  if (minutesOf(r.end_time) <= minutesOf(r.start_time)) return 'The end time must be after the start time.';
  return null;
}
export function validateSlot(minutes) {
  return Number.isInteger(minutes) && minutes >= 1 && minutes <= LIMITS.slotMax ? null : `The time step must be a whole number of minutes from 1 to ${LIMITS.slotMax}.`;
}
export function validateException(e) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date || '')) return 'Choose a date.';
  if (e.kind !== 'closed' && e.kind !== 'extra') return 'Choose closed or extra.';
  if (e.kind === 'extra' || e.start_time || e.end_time) {
    if (!HHMM.test(e.start_time || '') || !HHMM.test(e.end_time || '')) return e.kind === 'extra' ? 'An extra day needs a start and end time.' : 'Enter both times, or leave both empty to close the whole day.';
    if (minutesOf(e.end_time) <= minutesOf(e.start_time)) return 'The end time must be after the start time.';
  }
  if (text(e.note).length > LIMITS.noteMax) return `The note can be at most ${LIMITS.noteMax} characters.`;
  return null;
}

// The settings form. Returns { ok, patch } or { ok: false, errors: { field: message } }. Empty daily limit = no limit.
export const SETTING_FIELDS = {
  min_lead_hours: { label: 'Minimum notice (hours)', min: 0, max: 720 },
  custom_min_lead_hours: { label: 'Notice for customised orders (hours)', min: 0, max: 720 },
  max_days_ahead: { label: 'How many days ahead customers can choose', min: 1, max: 365 },
  max_qty_per_item: { label: 'Most of one item per order', min: 1, max: 100 },
  low_stock_threshold: { label: 'Show "Only N left" at or below', min: 0, max: 1000 },
  max_orders_per_day: { label: 'Daily order limit', min: 1, max: 1000, optional: true },
};
export function parseSettings(values) {
  const patch = {}; const errors = {};
  for (const [key, spec] of Object.entries(SETTING_FIELDS)) {
    const raw = text(values[key]);
    if (raw === '' && spec.optional) { patch[key] = null; continue; }
    if (!/^\d+$/.test(raw)) { errors[key] = `${spec.label}: enter a whole number${spec.optional ? ' or leave it empty' : ''}.`; continue; }
    const n = Number(raw);
    if (n < spec.min || n > spec.max) { errors[key] = `${spec.label}: enter a number from ${spec.min} to ${spec.max}.`; continue; }
    patch[key] = n;
  }
  const prefix = text(values.order_prefix).toUpperCase();
  if (!/^[A-Z]{1,6}$/.test(prefix)) errors.order_prefix = 'Order prefix: 1 to 6 capital letters.';
  else patch.order_prefix = prefix;
  if (!errors.custom_min_lead_hours && !errors.min_lead_hours && patch.custom_min_lead_hours < patch.min_lead_hours) errors.custom_min_lead_hours = 'Customised orders cannot need less notice than normal orders.';
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, patch };
}

// "48 = 2 days" style hint for a number of hours.
export function hoursHint(h) {
  const n = Number(h);
  if (!Number.isFinite(n) || n < 0) return '';
  if (n >= 24 && n % 24 === 0) return `${n} hours = ${n / 24} ${n / 24 === 1 ? 'day' : 'days'}`;
  return `${n} hours`;
}

// ---- export (CSV) ----
const csvCell = (v) => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // a spreadsheet must never run customer text as a formula
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const CSV_HEADER = ['Order number', 'Status', 'Source', 'Placed on', 'Pickup date', 'Pickup time', 'Name', 'Phone', 'Items', 'Customised', 'Notes', 'Total (GBP)'];
export function ordersToCsv(orders) {
  const rows = orders.map((o) => [
    o.order_number, o.status, o.source, o.order_date, o.pickup_date || '', o.pickup_time || '', o.customer_name || '', o.customer_phone || '',
    (o.items || []).map((l) => `${l.qty} x ${l.name}${l.options?.length ? ` [${l.options.map((x) => x.label).join(', ')}]` : ''}${l.customised ? ' (customised)' : ''}`).join('; '),
    (o.items || []).some((l) => l.customised) ? 'yes' : 'no', o.notes || '', (o.total_pence / 100).toFixed(2),
  ]);
  return `﻿${[CSV_HEADER, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n')}\r\n`;
}

// ---- weekly pickup hours (D-063): day chips plus shared opening windows ----
// A week model: { open: Set of weekdays (Sunday = 0), shared: [{ start, end }], custom: { [weekday]: [{ start, end }] }, slot: minutes }.
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Monday first
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DEFAULT_WINDOW = { start: '10:00', end: '18:00' };
const t5 = (t) => String(t || '').slice(0, 5);
const sortWindows = (list) => [...list].sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end));
const keyOf = (list) => sortWindows(list).map((w) => `${w.start}-${w.end}`).join('|');

// Rows from the database (pickup_rules) into the week model. The shared windows are the most common set among open days;
// days with a different set keep their own windows.
export function groupWeek(rules) {
  const byDay = new Map();
  for (const r of rules.filter((x) => x.active !== false)) {
    if (!byDay.has(r.weekday)) byDay.set(r.weekday, []);
    byDay.get(r.weekday).push({ start: t5(r.start_time), end: t5(r.end_time) });
  }
  const slot = rules[0]?.slot_minutes ?? 1;
  if (!byDay.size) return { open: new Set(), shared: [{ ...DEFAULT_WINDOW }], custom: {}, slot };
  const counts = new Map();
  for (const list of byDay.values()) counts.set(keyOf(list), (counts.get(keyOf(list)) || 0) + 1);
  const common = [...counts].sort((a, b) => b[1] - a[1])[0][0];
  let shared = null; const custom = {};
  for (const [day, list] of byDay) { if (keyOf(list) === common) shared ??= sortWindows(list); else custom[day] = sortWindows(list); }
  return { open: new Set(byDay.keys()), shared, custom, slot };
}

// The week model back into one row per open day and window.
export function flattenWeek(week) {
  const rows = [];
  for (const day of WEEK_ORDER) {
    if (!week.open.has(day)) continue;
    for (const w of sortWindows(week.custom[day] ?? week.shared)) rows.push({ weekday: day, start_time: w.start, end_time: w.end, slot_minutes: week.slot ?? 1, active: true });
  }
  return rows;
}

// A window list: every window needs both times, From before To, and no two may overlap. Returns a message or null.
export function validateWindows(list, who = 'The opening windows') {
  if (!list.length) return `${who}: add at least one window.`;
  for (const w of list) {
    if (!HHMM.test(w.start || '') || !HHMM.test(w.end || '')) return `${who}: fill in both times for every window.`;
    if (minutesOf(w.end) <= minutesOf(w.start)) return `${who}: "From" must be before "To" (${w.start} to ${w.end}).`;
  }
  const sorted = sortWindows(list);
  for (let i = 1; i < sorted.length; i++) if (minutesOf(sorted[i].start) < minutesOf(sorted[i - 1].end)) return `${who}: ${sorted[i - 1].start} to ${sorted[i - 1].end} overlaps ${sorted[i].start} to ${sorted[i].end}.`;
  return null;
}
// null when fine. An empty week is not an error (it asks for confirmation on screen): check week.open.size for that.
export function validateWeek(week) {
  if (!week.open.size) return null;
  const usesShared = WEEK_ORDER.some((d) => week.open.has(d) && !week.custom[d]);
  if (usesShared) { const e = validateWindows(week.shared); if (e) return e; }
  for (const d of WEEK_ORDER) if (week.open.has(d) && week.custom[d]) { const e = validateWindows(week.custom[d], `${WEEKDAYS[d]}'s hours`); if (e) return e; }
  return null;
}

const windowsText = (list) => sortWindows(list).map((w) => `${w.start} to ${w.end}`).join(' and ');
// "Open Mon to Fri 10:00 to 18:00", "Open Sat and Sun, 10:00 to 18:00", "Closed all week".
export function weekSummary(week) {
  const days = WEEK_ORDER.filter((d) => week.open.has(d));
  if (!days.length) return 'Closed all week.';
  const runs = []; let run = [];
  const flush = () => { if (run.length >= 3) runs.push(`${DAY_SHORT[run[0]]} to ${DAY_SHORT[run[run.length - 1]]}`); else run.forEach((d) => runs.push(DAY_SHORT[d])); run = []; };
  for (const d of days) { const prev = run[run.length - 1]; if (prev !== undefined && WEEK_ORDER.indexOf(d) === WEEK_ORDER.indexOf(prev) + 1) run.push(d); else { flush(); run = [d]; } }
  flush();
  const list = (xs) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
  const sharedDays = days.filter((d) => !week.custom[d]);
  const parts = [];
  if (sharedDays.length) { const sr = []; let r2 = []; const fl = () => { if (r2.length >= 3) sr.push(`${DAY_SHORT[r2[0]]} to ${DAY_SHORT[r2[r2.length - 1]]}`); else r2.forEach((d) => sr.push(DAY_SHORT[d])); r2 = []; };
    for (const d of sharedDays) { const prev = r2[r2.length - 1]; if (prev !== undefined && WEEK_ORDER.indexOf(d) === WEEK_ORDER.indexOf(prev) + 1) r2.push(d); else { fl(); r2 = [d]; } } fl();
    parts.push(`${list(sr)}, ${windowsText(week.shared)}`); }
  for (const d of days) if (week.custom[d]) parts.push(`${DAY_SHORT[d]}, ${windowsText(week.custom[d])}`);
  return `Open ${parts.join('; ')}.`;
}

// ---------- Sales summary (D-064, Step 4i) ----------
// Weeks run Monday to Sunday. Dates are ISO strings in UK time.
const isoAdd = (iso, n) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const isoDow = (iso) => new Date(`${iso}T12:00:00Z`).getUTCDay(); // 0 = Sunday
export const SALES_PERIODS = [['today', 'Today'], ['week', 'This week'], ['month', 'This month'], ['custom', 'Custom']];
export const SALES_MAX_DAYS = 366;
export const SALES_WEEKLY_BARS_OVER = 14; // longer periods are shown as weekly bars so the bars stay wide enough to tap
export const weekStart = (iso) => isoAdd(iso, -((isoDow(iso) + 6) % 7));
export function salesRange(kind, today, from = '', to = '') {
  if (kind === 'today') return { from: today, to: today };
  if (kind === 'week') { const s = weekStart(today); return { from: s, to: isoAdd(s, 6) }; }
  if (kind === 'month') { const [y, m] = today.split('-'); const last = new Date(Date.UTC(Number(y), Number(m), 0)).getUTCDate(); return { from: `${y}-${m}-01`, to: `${y}-${m}-${String(last).padStart(2, '0')}` }; }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return { error: 'Choose both dates.' };
  if (from > to) return { error: 'The From date must not be after the To date.' };
  if ((new Date(`${to}T12:00:00Z`) - new Date(`${from}T12:00:00Z`)) / 86400000 >= SALES_MAX_DAYS) return { error: 'Choose a range of up to a year.' };
  return { from, to };
}
// rows: [{day, total_pence, order_count}] -> { total, count, bars:[{from,to,total,count}] }. Long periods become Monday-start weekly bars.
export function salesBars(rows) {
  const total = rows.reduce((s, r) => s + Number(r.total_pence), 0);
  const count = rows.reduce((s, r) => s + Number(r.order_count), 0);
  const day = (r) => ({ from: r.day, to: r.day, total: Number(r.total_pence), count: Number(r.order_count) });
  if (rows.length <= SALES_WEEKLY_BARS_OVER) return { total, count, bars: rows.map(day), weekly: false };
  const bars = [];
  for (const r of rows) {
    const key = weekStart(r.day); let b = bars[bars.length - 1];
    if (!b || b.key !== key) { b = { key, from: r.day, to: r.day, total: 0, count: 0 }; bars.push(b); }
    b.to = r.day; b.total += Number(r.total_pence); b.count += Number(r.order_count);
  }
  return { total, count, bars, weekly: true };
}
