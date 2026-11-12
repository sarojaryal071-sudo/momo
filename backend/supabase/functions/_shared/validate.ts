// Pure helpers shared by the edge functions. Erasable TypeScript only, so the same file runs under Deno and in the Node tests.

export const LIMITS = { maxItems: 20, nameMax: 80, phoneMax: 20, notesMax: 500, slugMax: 80, optionsPerLine: 12, rateLimit: 8, rateWindowSeconds: 600 };

export type OrderPayload = {
  items: { slug: string; qty: number; options: string[] }[];
  name: string; phone: string; notes: string; pickupDate: string | null; pickupTime: string | null;
};
export type Parsed = { ok: true; honeypot: boolean; payload: OrderPayload } | { ok: false; code: string; message: string };

const isText = (v: unknown, max: number): v is string => typeof v === 'string' && v.length <= max;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Checks the SHAPE of the request only. The database function checks every rule (prices, options, stock, pickup, notice, limits).
// Prices sent by the browser are never read: only slug, quantity and option ids are copied into the payload.
export function parseOrderBody(body: unknown): Parsed {
  if (!body || typeof body !== 'object') return { ok: false, code: 'bad_request', message: 'The order could not be read.' };
  const b = body as Record<string, unknown>;
  const honeypot = typeof b.website === 'string' && b.website.trim() !== '';
  if (!Array.isArray(b.items) || b.items.length === 0) return { ok: false, code: 'empty', message: 'Your cart is empty.' };
  if (b.items.length > LIMITS.maxItems) return { ok: false, code: 'too_many', message: `At most ${LIMITS.maxItems} different items per order.` };
  const items: OrderPayload['items'] = [];
  for (const raw of b.items) {
    const r = raw as Record<string, unknown>;
    const options = Array.isArray(r?.options) ? r.options : [];
    if (!r || !isText(r.slug, LIMITS.slugMax) || typeof r.qty !== 'number' || !Number.isFinite(r.qty) || options.length > LIMITS.optionsPerLine
        || !options.every((o) => typeof o === 'string' && UUID_RE.test(o))) {
      return { ok: false, code: 'bad_request', message: 'The order could not be read.' };
    }
    items.push({ slug: r.slug, qty: r.qty, options: options as string[] });
  }
  const text = (v: unknown, max: number) => (v == null ? '' : isText(v, max * 4) ? v.trim().slice(0, max) : null);
  const name = text(b.name, LIMITS.nameMax), phone = text(b.phone, LIMITS.phoneMax), notes = text(b.notes, LIMITS.notesMax);
  if (name === null || phone === null || notes === null) return { ok: false, code: 'bad_request', message: 'The order could not be read.' };
  const date = b.pickupDate == null || b.pickupDate === '' ? null : b.pickupDate;
  const time = b.pickupTime == null || b.pickupTime === '' ? null : b.pickupTime;
  if ((date !== null && !(typeof date === 'string' && DATE_RE.test(date))) || (time !== null && !(typeof time === 'string' && TIME_RE.test(time)))) {
    return { ok: false, code: 'pickup', message: 'That pickup day is not available. Please choose another.' };
  }
  return { ok: true, honeypot, payload: { items, name, phone, notes, pickupDate: date, pickupTime: time } };
}

// CORS: only the site's own origins (the ALLOWED_ORIGINS secret, comma separated). Returns null when the origin is not allowed.
export function allowedOrigin(origin: string | null, allowed: string): string | null {
  if (!origin) return null;
  const list = allowed.split(',').map((s) => s.trim().replace(/\/+$/, '')).filter(Boolean);
  return list.includes(origin.replace(/\/+$/, '')) ? origin : null;
}

export function clientIp(headers: { get(name: string): string | null }): string {
  return (headers.get('cf-connecting-ip') || headers.get('x-forwarded-for') || headers.get('x-real-ip') || 'unknown').split(',')[0].trim();
}
