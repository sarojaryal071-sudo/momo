// WhatsApp message and link. A website cannot send the message: the customer taps send in WhatsApp.
import { formatPrice } from './cart.js';
import { siteConfig } from './site-config.js';

const UK_PREFIX = '44';
const UK_NUMBER_RE = /^44\d{9,10}$/;

// lines: [{ qty, name, unitLabel, linePence }]. Empty optional parts are left out.
export function buildMessage({ orderNumber, lines, totalPence, pickup, name, notes }) {
  const out = [orderNumber ? `Hi! Order ${orderNumber}` : "Hi! I'd like to place an order"];
  for (const l of lines) out.push(`- ${l.qty} x ${l.name}${l.unitLabel ? ` (${l.unitLabel})` : ''} ${formatPrice(l.linePence)}`);
  out.push(`Total ${formatPrice(totalPence)}`);
  if (pickup) out.push(`Pickup: ${pickup}`);
  if (name) out.push(`Name: ${name}`);
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
