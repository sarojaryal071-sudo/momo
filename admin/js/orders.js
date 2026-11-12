import { api } from './shell.js';
import { ORDERS_REFRESH_SECONDS, SEEN_KEY, STATUS_LABELS, TEMPLATE_BY_STATUS } from './admin-config.js';
import { formatPrice } from '../../js/cart.js';
import { dateLabel, ukParts } from '../../js/pickup.js';
import { ukToday } from '../../js/mock-backend.js';
import { buildLink, describeItems, fillTemplate, toWhatsAppNumber } from '../../js/whatsapp.js';

const root = document.querySelector('[data-orders]');
const emptyNote = document.querySelector('[data-empty]');
const fromInput = document.querySelector('[data-from]');
const toInput = document.querySelector('[data-to]');
const statusSelect = document.querySelector('[data-status]');
const countBox = document.querySelector('[data-new-count]');
const countNumber = document.querySelector('[data-new-number]');
const baseTitle = 'Orders | Admin';

const seen = (() => { try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')); } catch { return new Set(); } })();
const markSeen = (id) => { seen.add(id); try { localStorage.setItem(SEEN_KEY, JSON.stringify([...seen])); } catch { /* ignore */ } };

fromInput.value = ukToday();
let settings = await api.getSettings();
let busy = false; // do not redraw while a confirmation or message box is open

const el = (tag, props = {}, ...kids) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) { if (k === 'role' || k.startsWith('aria-')) node.setAttribute(k, v); else node[k] = v; }
  node.append(...kids.filter((k) => k !== null && k !== undefined));
  return node;
};
const when = (o) => (o.pickup_date ? `${dateLabel(o.pickup_date)}${o.pickup_time ? `, ${o.pickup_time}` : ''}` : 'No pickup date');
const statusOk = (o) => {
  const f = statusSelect.value;
  if (f === 'all') return true;
  if (f === 'active') return o.status !== 'collected' && o.status !== 'cancelled';
  return o.status === f;
};

function messageText(order, status) {
  const key = `wa_template_${TEMPLATE_BY_STATUS[status]}`;
  return fillTemplate(settings[key], {
    name: order.customer_name, order_number: order.order_number, pickup: when(order),
    items: describeItems(order.items), address: settings.pickup_address_text || '',
  });
}

function messageBox(order, card) {
  busy = true;
  const phone = toWhatsAppNumber(order.customer_phone);
  const box = el('div', { className: 'message-box' });
  if (!phone) {
    box.append(el('p', { className: 'error' }, 'This phone number does not look valid, so WhatsApp cannot be opened. Check the number the customer gave.'), el('button', { type: 'button', className: 'btn btn-secondary btn-small', onclick: () => { box.remove(); busy = false; } }, 'Close'));
    card.append(box);
    return;
  }
  if (!settings.pickup_address_text) box.append(el('p', { className: 'error', role: 'alert' }, 'Add your pickup address in Settings. ', el('a', { href: 'settings.html' }, 'Open Settings')));
  const area = el('textarea', { rows: 8, value: messageText(order, order.status), 'aria-label': 'Message to send' });
  area.id = `msg-${order.id}`;
  const send = el('a', { className: 'btn btn-small', target: '_blank', rel: 'noopener noreferrer' }, 'Open WhatsApp');
  const sync = () => { send.href = buildLink(phone, area.value); };
  area.addEventListener('input', sync); sync();
  box.append(el('label', { htmlFor: area.id }, 'Edit the message if you like'), area, el('p', { className: 'hint' }, 'You tap send in WhatsApp.'),
    el('div', { className: 'btn-row' }, send, el('button', { type: 'button', className: 'btn btn-secondary btn-small', onclick: () => { box.remove(); busy = false; } }, 'Close')));
  card.append(box);
  area.focus();
}

function confirmCancel(order, card, showError) {
  busy = true;
  const box = el('div', { className: 'confirm-box', role: 'alertdialog' }, el('p', {}, `Cancel ${order.order_number}? Its stock goes back on the shelf.`));
  const yes = el('button', { type: 'button', className: 'btn btn-danger btn-small', onclick: async () => { await changeStatus(order, 'cancelled', showError); } }, 'Yes, cancel this order');
  const no = el('button', { type: 'button', className: 'btn btn-secondary btn-small', onclick: () => { box.remove(); busy = false; } }, 'Keep it');
  box.append(el('div', { className: 'btn-row' }, yes, no));
  card.append(box);
  no.focus();
}

async function changeStatus(order, status, showError) {
  try {
    await api.setOrderStatus(order.id, status);
    busy = false;
    markSeen(order.id);
    await refresh();
  } catch (err) {
    busy = false;
    showError(err.message);
  }
}

function card(order) {
  const fresh = order.status === 'new' && !seen.has(order.id);
  const article = el('article', { className: 'order' });
  article.dataset.status = order.status;
  if (fresh) article.dataset.fresh = '';
  const err = el('p', { className: 'order-error', role: 'alert' });
  const showError = (m) => { err.textContent = m; };
  const phone = toWhatsAppNumber(order.customer_phone);

  article.append(...[
    el('div', { className: 'order-head' }, el('span', { className: 'order-number' }, order.order_number),
      order.items.some((l) => l.customised) ? el('span', { className: 'tag tag-custom' }, 'Customised') : null,
      order.source === 'manual' ? el('span', { className: 'tag tag-manual' }, 'Manual') : null,
      el('span', { className: 'order-when' }, when(order))),
    el('p', { className: 'order-who' }, el('strong', {}, order.customer_name), ' · ', el('a', { href: `tel:${order.customer_phone.replace(/[^\d+]/g, '')}` }, order.customer_phone)),
    el('ul', { className: 'order-lines' }, ...order.items.map((l) => el('li', {}, `${l.qty} × ${l.name}`, l.options.length ? el('span', { className: 'opts' }, ` (${l.options.map((o) => o.label).join(', ')})`) : null, l.customised ? ' ' : null, l.customised ? el('span', { className: 'tag tag-custom' }, 'Customised') : null))),
    order.notes ? el('p', { className: 'order-notes' }, `Note: ${order.notes}`) : null,
    el('div', { className: 'order-foot' }, el('span', { className: 'order-total' }, formatPrice(order.total_pence)), el('span', { className: 'badge' }, STATUS_LABELS[order.status])),
  ].filter(Boolean));
  const buttons = el('div', { className: 'status-buttons', role: 'group', 'aria-label': `Change status of ${order.order_number}` });
  for (const status of Object.keys(STATUS_LABELS)) {
    const b = el('button', { type: 'button', className: 'btn btn-secondary btn-small' }, STATUS_LABELS[status]);
    b.setAttribute('aria-pressed', String(order.status === status));
    b.addEventListener('click', () => {
      if (order.status === status) return;
      err.textContent = '';
      if (status === 'cancelled') confirmCancel(order, article, showError);
      else changeStatus(order, status, showError);
    });
    buttons.append(b);
  }
  const msg = el('button', { type: 'button', className: 'btn btn-small', disabled: !phone, onclick: () => { markSeen(order.id); article.removeAttribute('data-fresh'); messageBox(order, article); } }, 'Message customer');
  const msgRow = el('div', { className: 'btn-row' }, msg, !phone ? el('span', { className: 'hint error' }, 'The phone number is not valid, so WhatsApp is switched off.') : null);
  article.append(buttons, msgRow, err);
  article.addEventListener('click', () => { if (fresh) { markSeen(order.id); article.removeAttribute('data-fresh'); } }, { once: true });
  return article;
}

async function refresh() {
  if (busy) return;
  settings = await api.getSettings();
  const all = await api.listOrders({ from: fromInput.value || null, to: toInput.value || null });
  const everything = await api.listOrders({});
  const newCount = everything.filter((o) => o.status === 'new').length;
  countNumber.textContent = String(newCount);
  if (newCount) countBox.setAttribute('data-has-new', ''); else countBox.removeAttribute('data-has-new');
  document.title = newCount ? `(${newCount}) ${baseTitle}` : baseTitle;

  const shown = all.filter(statusOk);
  root.replaceChildren();
  const groups = new Map();
  for (const o of shown) { const key = o.pickup_date || ''; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(o); }
  const keys = [...groups.keys()].sort((a, b) => (a === '' ? 1 : b === '' ? -1 : a.localeCompare(b)));
  for (const key of keys) {
    const section = el('section', {}, el('h2', { className: 'order-day' }, key ? dateLabel(key) : 'No pickup date'));
    for (const o of groups.get(key)) section.append(card(o));
    root.append(section);
  }
  emptyNote.textContent = everything.length ? 'No orders match these filters.' : 'No orders yet. New orders appear here as soon as they are placed.';
  emptyNote.hidden = shown.length > 0;
}

for (const input of [fromInput, toInput, statusSelect]) input.addEventListener('change', () => { busy = false; refresh(); });
document.querySelector('[data-all-dates]').addEventListener('click', () => { fromInput.value = ''; toInput.value = ''; busy = false; refresh(); });
api.onChange(() => refresh());
setInterval(refresh, ORDERS_REFRESH_SECONDS * 1000);
await refresh();
