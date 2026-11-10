// Done page: order number and summary from sessionStorage, plus one automatic WhatsApp open.
import { formatPrice, updateHeaderCount } from './cart.js';
import { siteConfig } from './site-config.js';

updateHeaderCount();
const AUTO_KEY = 'ss-auto-opened';
const $ = (sel) => document.querySelector(sel);
const number = new URLSearchParams(location.search).get('o') || '';
let order = null;
try { order = JSON.parse(sessionStorage.getItem('ss-last-order')); } catch { /* none */ }
if (order && order.orderNumber !== number) order = null;

$('[data-done-number]').textContent = number ? `Your order number is ${number}.` : 'We could not find your order number.';
if (order) {
  const list = $('[data-done-lines]');
  for (const l of order.lines) {
    const li = document.createElement('li');
    li.className = 'cart-line';
    li.textContent = `${l.qty} x ${l.name}${l.unitLabel ? ` (${l.unitLabel})` : ''} — ${formatPrice(l.linePence)}`;
    list.append(li);
  }
  $('[data-done-total]').textContent = formatPrice(order.totalPence);
  $('[data-done-pickup]').textContent = order.pickup ? `Pickup: ${order.pickup}` : '';
  $('[data-done-summary]').hidden = false;
  const btn = $('[data-done-whatsapp]');
  btn.href = order.link;
  btn.hidden = false;
  let opened = false;
  try { opened = sessionStorage.getItem(AUTO_KEY) === number; sessionStorage.setItem(AUTO_KEY, number); } catch { /* try once anyway */ }
  if (!opened) setTimeout(() => { location.href = order.link; }, siteConfig.autoOpenDelayMs);
} else {
  $('[data-done-missing]').hidden = false;
}
