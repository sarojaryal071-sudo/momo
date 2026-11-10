// Cart page: lines, totals, details (name and phone required), pickup date and time, place order. Customer text is only ever written with textContent.
import './menu.js';
import { buildLines, cartTotal, formatPrice, getCart, lineKey, updateHeaderCount } from './cart.js';
import { loadPickup, loadProducts } from './data.js';
import { submitOrder } from './order-gateway.js';
import { dateLabel, getPickupOptions, noticeText, pickupHours, pickupMinutes, windowText } from './pickup.js';
import { siteConfig } from './site-config.js';
import { buildOrderLink, toNationalFormat, toWhatsAppNumber } from './whatsapp.js';

const { limits } = siteConfig;
const $ = (sel) => document.querySelector(sel);
const emptyBox = $('[data-cart-empty]');
const content = $('[data-cart-content]');
const list = $('[data-cart-lines]');
const form = $('[data-order-form]');
const errorBox = $('[data-order-error]');
const confirmBtn = $('[data-confirm]');
const dateSel = $('#f-date');
const hourSel = $('#f-hour');
const minuteSel = $('#f-minute');
const nameInput = $('#f-name');
const phoneInput = $('#f-phone');

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

// Small picture in front of the item name: the product photo, or the drawn placeholder until it has one.
function thumbFor(line) {
  const p = line.product;
  const box = el('div', 'cart-thumb card-media');
  if (p && p.photo) {
    if (String(p.photo).startsWith('pack-')) box.classList.add('card-media-multiply'); // opaque shots on white blend into the tile
    const img = document.createElement('img');
    Object.assign(img, { src: `assets/img/${p.photo}-400.webp`, width: 400, height: 400, alt: '', loading: 'lazy' });
    box.append(img);
  } else {
    box.classList.add('card-art', p && p.kind === 'addon' ? 'card-art-bowl' : 'card-art-momo');
  }
  return box;
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
    const info = el('div', 'cart-info');
    const text = el('div', 'cart-text');
    info.append(thumbFor(line), text);
    text.append(el('h3', '', line.product ? line.product.name : line.slug));
    if (line.unavailable) {
      text.append(el('p', 'error', line.soldOut ? 'Sold out. It will be removed when you confirm.' : 'No longer available. It will be removed when you confirm.'));
    } else {
      const sample = line.product.placeholder ? ' (sample price)' : '';
      text.append(el('p', 'menu-meta', `${line.product.unit_label} \u2014 ${formatPrice(line.unitPence)} each${sample}`));
      if (line.customised) {
        const opts = el('p', 'line-options', line.optionText + ' ');
        opts.append(el('span', 'badge', 'Customised'));
        text.append(opts);
      }
      if (capped.has(lineKey(line.slug, line.options))) text.append(el('p', 'error', `Only ${line.maxQty} available, so we changed the quantity.`));
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
  fillHours();
  const note = $('[data-lead-note]');
  note.hidden = !customised;
  if (customised) {
    const first = pickupOptions[0];
    note.textContent = `Customised items need ${noticeText(siteConfig.customMinLeadHours)}' notice.${first ? ` Earliest pickup: ${first.label}.` : ' No pickup dates are available yet.'}`;
  }
}

const selectedDay = () => pickupOptions.find((o) => o.date === dateSel.value);

// Hour and minute lists for the chosen day, inside her window and past the notice period (D-038).
function fillHours() {
  const day = selectedDay();
  hourSel.replaceChildren(new Option('Hour', ''));
  minuteSel.replaceChildren(new Option('Minute', ''));
  hourSel.disabled = !day;
  minuteSel.disabled = true;
  const note = $('[data-window-note]');
  note.hidden = !day;
  if (day) {
    pickupHours(day).forEach((h) => hourSel.append(new Option(h, h)));
    note.textContent = windowText(day);
  }
}

function fillMinutes() {
  const day = selectedDay();
  minuteSel.replaceChildren(new Option('Minute', ''));
  minuteSel.disabled = !day || !hourSel.value;
  if (!minuteSel.disabled) {
    pickupMinutes(day, hourSel.value).forEach((m) => minuteSel.append(new Option(m, m)));
    minuteSel.value = minuteSel.options[1].value; // a time is always complete once an hour is chosen
  }
}

function readOrder(lines) {
  const data = new FormData(form);
  const clean = (key, max) => String(data.get(key) || '').trim().slice(0, max);
  const pickupDate = String(data.get('pickupDate') || '');
  const pickupTime = hourSel.value && minuteSel.value ? `${hourSel.value}:${minuteSel.value}` : '';
  const time = pickupTime;
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

// Name and phone are required. The phone must be a UK number and is shown back so typos are caught (D-036).
function showError(field, input, message) {
  const box = $(`[data-field-error="${field}"]`);
  box.textContent = message;
  box.hidden = !message;
  if (message) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
}

function echoPhone() {
  const digits = toWhatsAppNumber(phoneInput.value);
  $('[data-phone-echo]').textContent = digits ? `We will message you on ${toNationalFormat(digits)}` : '';
  return digits;
}

function validateDetails() {
  const nameOk = nameInput.value.trim().length > 0;
  showError('name', nameInput, nameOk ? '' : 'Enter your name.');
  const phoneOk = Boolean(echoPhone());
  showError('phone', phoneInput, phoneOk ? '' : 'Enter a UK phone number, for example 07123 456789.');
  if (!nameOk) { nameInput.focus(); return false; }
  if (!phoneOk) { phoneInput.focus(); return false; }
  return true;
}

async function confirm(e) {
  e.preventDefault();
  errorBox.textContent = '';
  $('[data-fail-link]').hidden = true;
  if (!validateDetails()) return;
  const lines = buildLines(getCart().items(), products).filter((l) => !l.unavailable);
  if (!lines.length) { render(); errorBox.textContent = 'There is nothing available in your cart.'; return; }
  const order = readOrder(lines);
  const totalPence = cartTotal(lines);
  const summary = lines.map((l) => ({ qty: l.qty, name: l.product.name, unitLabel: l.product.unit_label, linePence: l.linePence, optionText: l.customised ? l.optionText : '' }));
  confirmBtn.disabled = true;
  try {
    const result = await submitOrder({ ...order, totalPenceHint: totalPence });
    try { sessionStorage.setItem('ss-last-order', JSON.stringify({ orderNumber: result.orderNumber, lines: summary, totalPence, pickup: order.pickupText, name: order.name, placedAt: new Date().toISOString() })); } catch { /* the done page copes without it */ }
    getCart().clear();
    location.href = `done.html?o=${encodeURIComponent(result.orderNumber)}`;
  } catch {
    // The order was not saved. The customer can send it by WhatsApp instead; the cart is kept.
    const { link } = buildOrderLink({ lines: summary, totalPence, pickup: order.pickupText, name: order.name, phone: order.phone, notes: order.notes });
    errorBox.textContent = 'We could not place your order online. Please send us the WhatsApp message instead so we receive it.';
    const fail = $('[data-fail-whatsapp]');
    fail.href = link;
    $('[data-fail-link]').hidden = false;
    confirmBtn.disabled = false;
    fail.focus();
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
  dateSel.addEventListener('change', fillHours);
  hourSel.addEventListener('change', fillMinutes);
  phoneInput.addEventListener('input', () => { echoPhone(); if (phoneInput.getAttribute('aria-invalid') && toWhatsAppNumber(phoneInput.value)) showError('phone', phoneInput, ''); });
  nameInput.addEventListener('input', () => { if (nameInput.value.trim()) showError('name', nameInput, ''); });
  form.addEventListener('submit', confirm);
  render();
}
init();
