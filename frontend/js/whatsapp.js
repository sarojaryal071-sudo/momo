// WhatsApp message and link. A website cannot send the message: the customer taps send in WhatsApp.
import { formatPrice } from './cart.js';
import { siteConfig } from './site-config.js';

const UK_PREFIX = '44';
const UK_NUMBER_RE = /^44\d{9,10}$/;

// lines: [{ qty, name, unitLabel, linePence, optionText? }]. Empty optional parts are left out; options are listed under their line.
export function buildMessage({ orderNumber, lines, totalPence, pickup, name, phone, notes }) {
  const out = [orderNumber ? `Hi! Order ${orderNumber}` : "Hi! I'd like to place an order"];
  for (const l of lines) {
    out.push(`- ${l.qty} x ${l.name}${l.unitLabel ? ` (${l.unitLabel})` : ''} ${formatPrice(l.linePence)}`);
    if (l.optionText) out.push(`  Customised: ${l.optionText}`);
  }
  out.push(`Total ${formatPrice(totalPence)}`);
  if (pickup) out.push(`Pickup: ${pickup}`);
  if (name) out.push(`Name: ${name}`);
  if (phone) out.push(`Phone: ${phone}`);
  if (notes) out.push(`Notes: ${notes}`);
  out.push('Pay cash on pickup.');
  return out.join('\n');
}

export const buildLink = (number, message) => `https://wa.me/${number}?text=${encodeURIComponent(message)}`;

// Builds the link, trimming the notes first if the encoded link would be too long.
export function buildOrderLink(parts, number = siteConfig.whatsappNumber, max = siteConfig.limits.waLinkMax) {
  let notes = parts.notes || '';
  let link = buildLink(number, buildMessage({ ...parts, notes }));
  while (link.length > max && notes.length > 0) {
    notes = notes.slice(0, Math.max(0, notes.length - Math.ceil(notes.length / 4) - 1));
    link = buildLink(number, buildMessage({ ...parts, notes }));
  }
  return { message: buildMessage({ ...parts, notes }), link };
}

// UK phone to WhatsApp digits: strip spaces and punctuation, leading 0 becomes 44, remove +. Returns null if not a UK number.
export function toWhatsAppNumber(phone) {
  if (!phone) return null;
  let digits = String(phone).replace(/\(0\)/g, '').replace(/[^\d+]/g, '').replace(/^\+/, '');
  if (digits.startsWith('0044')) digits = digits.slice(2);
  else if (digits.startsWith('0')) digits = UK_PREFIX + digits.slice(1);
  return UK_NUMBER_RE.test(digits) ? digits : null;
}

// WhatsApp digits back to the number as people write it: 447413069241 becomes "07413 069241".
export function toNationalFormat(digits) {
  if (!digits || !digits.startsWith(UK_PREFIX)) return '';
  const rest = digits.slice(UK_PREFIX.length);
  return `0${rest.slice(0, 4)} ${rest.slice(4)}`;
}

// Admin messages (D-045): fills a template such as "Hi {name}, your order {order_number} is confirmed.".
// Unknown placeholders are left as they are so a typo is visible.
export function fillTemplate(template, values) {
  return String(template || '').replace(/\{(name|order_number|pickup|items|address)\}/g, (_, key) => values[key] ?? '');
}

// One line per item for {items}: "- 2 x Frozen chicken momo (40 pieces) (Hot, No onion)".
export function describeItems(items) {
  return items.map((l) => `- ${l.qty} x ${l.name}${l.unit_label ? ` (${l.unit_label})` : ''}${l.options && l.options.length ? ` (${l.options.map((o) => o.label).join(', ')})` : ''}`).join('\n');
}
