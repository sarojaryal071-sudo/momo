// Cart page: lines, totals, optional details, confirm. Customer text is only ever written with textContent.
import './menu.js';
import { buildLines, cartTotal, formatPrice, getCart, lineKey, updateHeaderCount } from './cart.js';
import { loadPickup, loadProducts } from './data.js';
import { submitOrder } from './order-gateway.js';
import { dateLabel, getPickupOptions, noticeText } from './pickup.js';
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
let pickupConfig = null;

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};

function qtyControl(line) {
  const wrap = el('div', 'qty stepper');
  wrap.setAttribute('role', 'group');
  const name = line.product ? line.product.name : line.slug;
  wrap.setAttribute('aria-label', `Quantity of ${name}`);
  const minus = el('button', 'qty-btn', '\u2212');
  minus.type = 'button';
  minus.setAttribute('aria-label', `Decrease quantity of ${name}`);
  const input = el('input', 'qty-input');
  Object.assign(input, { type: 'number', min: 1, max: line.maxQty, value: line.qty });
  input.inputMode = 'numeric';
  input.setAttribute('aria-label', `Quantity of ${name}`);
  const plus = el('button', 'qty-btn', '+');
  plus.type = 'button';
  plus.setAttribute('aria-label', `Increase quantity of ${name}`);
  plus.disabled = line.qty >= line.maxQty;
  const set = (v) => { getCart().setQty(line.slug, v, line.options); render(); };
  minus.addEventListener('click', () => set(line.qty - 1));
  plus.addEventListener('click', () => set(line.qty + 1));
  input.addEventListener('change', () => set(input.value));
  wrap.append(minus, input, plus);
  return wrap;
}

function render() {
  let lines = buildLines(getCart().items(), products);
  // A quantity above the stock is brought down to the stock, with a message on that line.
  const capped = new Set();
  for (const l of lines) {
    if (l.overStock && !l.unavailable) { getCart().setQty(l.slug, l.maxQty, l.options); capped.add(lineKey(l.slug, l.options)); }
  }
  if (capped.size) lines = buildLines(getCart().items(), products);
  updateHeaderCount();
  emptyBox.hidden = lines.length > 0;
  content.hidden = lines.length === 0;
  list.replaceChildren();
  for (const line of lines) {
    const li = el('li', 'cart-line');
    const info = el('div');
    info.append(el('h3', '', line.product ? line.product.name : line.slug));
    if (line.unavailable) {
      info.append(el('p', 'error', line.soldOut ? 'Sold out. It will be removed when you confirm.' : 'No longer available. It will be removed when you confirm.'));
    } else {
      const sample = line.product.placeholder ? ' (sample price)' : '';
      info.append(el('p', 'menu-meta', `${line.product.unit_label} \u2014 ${formatPrice(line.unitPence)} each${sample}`));
      if (line.customised) {
        const opts = el('p', 'line-options', line.optionText + ' ');
        opts.append(el('span', 'badge', 'Customised'));
        info.append(opts);
      }
      if (capped.has(lineKey(line.slug, line.options))) info.append(el('p', 'error', `Only ${line.maxQty} available, so we changed the quantity.`));
    }
    li.append(info);
    if (!line.unavailable) li.append(qtyControl(line), el('p', 'line-price', formatPrice(line.linePence)));
    const remove = el('button', 'btn btn-secondary', 'Remove');
    remove.type = 'button';
    remove.append(Object.assign(el('span', 'visually-hidden'), { textContent: `: ${line.product ? line.product.name : line.slug}` }));
    remove.addEventListener('click', () => { getCart().remove(line.slug, line.options); render(); });
    li.append(remove);
    list.append(li);
  }
  $('[data-cart-total]').textContent = formatPrice(cartTotal(lines));
  refreshPickup(lines);
}

// The date list follows the cart: a customised item needs the longer notice, nothing else changes it.
function refreshPickup(lines) {
  if (!pickupConfig) return;
  const customised = lines.some((l) => l.customised && !l.unavailable);
  const keep = dateSel.value;
  pickupOptions = getPickupOptions(pickupConfig, new Date(), { customised, customLeadHours: siteConfig.customMinLeadHours });
  dateSel.replaceChildren(new Option('No date chosen', ''));
  pickupOptions.forEach((o) => dateSel.append(new Option(o.label, o.date)));
  dateSel.value = pickupOptions.some((o) => o.date === keep) ? keep : '';
  fillTimes();
  const note = $('[data-lead-note]');
  note.hidden = !customised;
  if (customised) {
    const first = pickupOptions[0];
    note.textContent = `Customised items need ${noticeText(siteConfig.customMinLeadHours)}' notice.${first ? ` Earliest pickup: ${first.label}.` : ' No pickup dates are available yet.'}`;
  }
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
    items: lines.map((l) => ({ slug: l.slug, qty: l.qty, options: l.options })),
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
  const summary = lines.map((l) => ({ qty: l.qty, name: l.product.name, unitLabel: l.product.unit_label, linePence: l.linePence, optionText: l.customised ? l.optionText : '' }));
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
    pickupConfig = await loadPickup();
    if (!pickupConfig.placeholder) $('#pickup-sample').remove();
  } catch {
    errorBox.textContent = 'We could not load the shop data. Please reload, or call us to order.';
  }
  dateSel.addEventListener('change', fillTimes);
  form.addEventListener('submit', confirm);
  render();
}
init();
