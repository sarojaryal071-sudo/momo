// Done page: the order as a paper receipt, from sessionStorage. Nothing opens automatically (D-036).
import './menu.js';
import { formatPrice, updateHeaderCount } from './cart.js';

updateHeaderCount();
const $ = (sel) => document.querySelector(sel);
const number = new URLSearchParams(location.search).get('o') || '';
let order = null;
try { order = JSON.parse(sessionStorage.getItem('ss-last-order')); } catch { /* none */ }
if (order && order.orderNumber !== number) order = null;

const numberText = number ? `Your order number is ${number}.` : 'We could not find your order number.';
$('[data-done-number-lead]').textContent = numberText;

const placedText = (iso) => new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/London' }).format(new Date(iso));

if (order) {
  $('[data-done-number]').textContent = `No. ${number}`;
  if (order.placedAt) $('[data-done-placed]').textContent = placedText(order.placedAt);
  $('[data-done-name]').textContent = order.name || '-';
  $('[data-done-pickup]').textContent = order.pickup || 'To be agreed';
  const list = $('[data-done-lines]');
  for (const l of order.lines) {
    const li = document.createElement('li');
    const qty = document.createElement('span');
    qty.className = 'receipt-qty';
    qty.textContent = `${l.qty} \u00d7`;
    const name = document.createElement('span');
    name.className = 'receipt-name';
    name.textContent = l.name;
    const small = [l.unitLabel, l.optionText ? `Customised: ${l.optionText}` : ''].filter(Boolean).join(' \u00b7 ');
    if (small) {
      const sub = document.createElement('small');
      sub.textContent = small;
      name.append(sub);
    }
    const price = document.createElement('span');
    price.className = 'receipt-price';
    price.textContent = formatPrice(l.linePence);
    li.append(qty, name, price);
    list.append(li);
  }
  $('[data-done-total]').textContent = formatPrice(order.totalPence);
  if (order.pickup) $('[data-done-when]').textContent = order.pickup;
  $('[data-done-summary]').hidden = false;
  $('[data-done-actions]').hidden = false;

  $('[data-print]').addEventListener('click', () => window.print()); // the browser's print dialog also saves as PDF
  $('[data-download]').addEventListener('click', () => {
    const w = 38;
    const row = (left, right) => left + ' '.repeat(Math.max(1, w - left.length - right.length)) + right;
    const text = [
      'STEAM & SPICE', 'Order receipt', `No. ${number}`, order.placedAt ? placedText(order.placedAt) : '', '-'.repeat(w),
      `Name: ${order.name || '-'}`, `Pickup: ${order.pickup || 'To be agreed'}`, '-'.repeat(w),
      ...order.lines.flatMap((l) => [row(`${l.qty} x ${l.name}`, formatPrice(l.linePence)), ...(l.optionText ? [`   Customised: ${l.optionText}`] : [])]),
      '-'.repeat(w), row('TOTAL', formatPrice(order.totalPence)), '-'.repeat(w),
      'Pickup only. Pay cash when you pick up.', 'Not confirmed until we message you.', '',
    ].filter((x, i) => x !== '' || i > 4).join('\n');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `steam-and-spice-${number}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  });
} else {
  $('[data-done-missing]').hidden = false;
}
