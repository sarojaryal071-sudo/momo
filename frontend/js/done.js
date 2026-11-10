// Done page: order number and summary from sessionStorage. Nothing opens automatically (D-036).
import './menu.js';
import { formatPrice, updateHeaderCount } from './cart.js';

updateHeaderCount();
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
    li.textContent = `${l.qty} x ${l.name}${l.unitLabel ? ` (${l.unitLabel})` : ''} \u2014 ${formatPrice(l.linePence)}${l.optionText ? ` \u00b7 Customised: ${l.optionText}` : ''}`;
    list.append(li);
  }
  $('[data-done-total]').textContent = formatPrice(order.totalPence);
  $('[data-done-name]').textContent = order.name ? `Name: ${order.name}` : '';
  $('[data-done-pickup]').textContent = order.pickup ? `Pickup: ${order.pickup}` : '';
  if (order.pickup) $('[data-done-when]').textContent = order.pickup;
  $('[data-done-summary]').hidden = false;
} else {
  $('[data-done-missing]').hidden = false;
}
