// Cart page: lines, totals, optional details, confirm. Customer text is only ever written with textContent.
import { buildLines, cartTotal, formatPrice, getCart, updateHeaderCount } from './cart.js';
import { loadPickup, loadProducts } from './data.js';
import { submitOrder } from './order-gateway.js';
import { dateLabel, getPickupOptions } from './pickup.js';
import { siteConfig } from './site-config.js';
import { buildOrderLink } from './whatsapp.js';

const { limits } = siteConfig;
const $ = (sel) => document.querySelector(sel);
const emptyBox = $('[data-cart-empty]');
const content = $('[data-cart-content]');
const list = $('[data-cart-lines]');
const form = $('[data-order-form]');
const errorBox = $('[data-order-error]');
const confirmBtn = $('[data-confirm]');
const dateSel = $('#f-date');
const timeSel = $('#f-time');

let products = [];
let pickupOptions = [];

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};

function qtyControl(line) {
  const wrap = el('div', 'qty');
  wrap.setAttribute('role', 'group');
  const name = line.product ? line.product.name : line.slug;
  wrap.setAttribute('aria-label', `Quantity of ${name}`);
  const minus = el('button', 'qty-btn', '−');
  minus.type = 'button';
  minus.setAttribute('aria-label', `Decrease quantity of ${name}`);
  const input = el('input', 'qty-input');
  Object.assign(input, { type: 'number', min: 1, max: limits.maxQtyPerItem, value: line.qty });
  input.inputMode = 'numeric';
  input.setAttribute('aria-label', `Quantity of ${name}`);
  const plus = el('button', 'qty-btn', '+');
  plus.type = 'button';
  plus.setAttribute('aria-label', `Increase quantity of ${name}`);
  const set = (v) => { getCart().setQty(line.slug, v); render(); };
  minus.addEventListener('click', () => set(line.qty - 1));
  plus.addEventListener('click', () => set(line.qty + 1));
  input.addEventListener('change', () => set(input.value));
  wrap.append(minus, input, plus);
  return wrap;
}

function render() {
  const lines = buildLines(getCart().items(), products);
  updateHeaderCount();
  emptyBox.hidden = lines.length > 0;
  content.hidden = lines.length === 0;
  list.replaceChildren();
  for (const line of lines) {
    const li = el('li', 'cart-line');
    const info = el('div');
    info.append(el('h3', '', line.product ? line.product.name : line.slug));
    if (line.unavailable) {
      info.append(el('p', 'error', 'No longer available. It will be removed when you confirm.'));
    } else {
      const sample = line.product.placeholder ? ' (sample price)' : '';
      info.append(el('p', 'menu-meta', `${line.product.unit_label} — ${formatPrice(line.product.price_pence)} each${sample}`));
    }
    li.append(info);
    if (!line.unavailable) li.append(qtyControl(line), el('p', 'line-price', formatPrice(line.linePence)));
    const remove = el('button', 'btn btn-secondary', 'Remove');
    remove.type = 'button';
    remove.append(Object.assign(el('span', 'visually-hidden'), { textContent: `: ${line.product ? line.product.name : line.slug}` }));
    remove.addEventListener('click', () => { getCart().remove(line.slug); render(); });
    li.append(remove);
    list.append(li);
  }
  $('[data-cart-total]').textContent = formatPrice(cartTotal(lines));
}

function fillTimes() {
  const day = pickupOptions.find((o) => o.date === dateSel.value);
  timeSel.replaceChildren(new Option(day ? 'No time chosen' : 'Choose a date first', ''));
  timeSel.disabled = !day;
  if (day) day.times.forEach((t) => timeSel.append(new Option(t.label, t.value)));
}

function readOrder(lines) {
  const data = new FormData(form);
  const clean = (key, max) => String(data.get(key) || '').trim().slice(0, max);
  const pickupDate = String(data.get('pickupDate') || '');
  const pickupTime = String(data.get('pickupTime') || '');
  const time = pickupTime ? (timeSel.selectedOptions[0]?.textContent || pickupTime).split(' to ')[0] : '';
  return {
    items: lines.map((l) => ({ slug: l.slug, qty: l.qty })),
    name: clean('name', limits.nameMax),
    phone: clean('phone', limits.phoneMax),
    notes: clean('notes', limits.notesMax),
    pickupDate, pickupTime,
    website: String(data.get('website') || ''),
    pickupText: pickupDate ? `${dateLabel(pickupDate)}${time ? ` ${time}` : ''}` : '',
  };
}

async function confirm(e) {
  e.preventDefault();
  errorBox.textContent = '';
  const lines = buildLines(getCart().items(), products).filter((l) => !l.unavailable);
  if (!lines.length) { render(); errorBox.textContent = 'There is nothing available in your cart.'; return; }
  const order = readOrder(lines);
  const totalPence = cartTotal(lines);
  const summary = lines.map((l) => ({ qty: l.qty, name: l.product.name, unitLabel: l.product.unit_label, linePence: l.linePence }));
  confirmBtn.disabled = true;
  try {
    const result = await submitOrder({ ...order, totalPenceHint: totalPence });
    const { message, link } = buildOrderLink({ orderNumber: result.orderNumber, lines: summary, totalPence, pickup: order.pickupText, name: order.name, notes: order.notes });
    try { sessionStorage.setItem('ss-last-order', JSON.stringify({ orderNumber: result.orderNumber, lines: summary, totalPence, pickup: order.pickupText, link, message })); } catch { /* the done page copes without it */ }
    getCart().clear();
    location.href = `done.html?o=${encodeURIComponent(result.orderNumber)}`;
  } catch {
    const { link } = buildOrderLink({ lines: summary, totalPence, pickup: order.pickupText, name: order.name, notes: order.notes });
    errorBox.textContent = "We couldn't save your order online. Please send the WhatsApp message so we receive it.";
    $('[data-fail-whatsapp]').href = link;
    $('[data-fail-link]').hidden = false;
    confirmBtn.disabled = false;
    location.href = link;
  }
}

async function init() {
  $('#f-name').maxLength = limits.nameMax;
  $('#f-phone').maxLength = limits.phoneMax;
  $('#f-notes').maxLength = limits.notesMax;
  try {
    products = await loadProducts();
    const pickup = await loadPickup();
    pickupOptions = getPickupOptions(pickup);
    pickupOptions.forEach((o) => dateSel.append(new Option(o.label, o.date)));
    if (!pickup.placeholder) $('#pickup-sample').remove();
  } catch {
    errorBox.textContent = 'We could not load the shop data. Please reload, or call us to order.';
  }
  dateSel.addEventListener('change', fillTimes);
  form.addEventListener('submit', confirm);
  render();
}
init();
