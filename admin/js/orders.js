import { api } from './shell.js';
import { FILTER_KEY, ORDERS_REFRESH_SECONDS, SEEN_KEY, STATUS_LABELS, TEMPLATE_BY_STATUS, NEXT_STATUS } from './admin-config.js';
import { formatPrice } from '../../js/cart.js';
import { ukToday } from '../../js/mock-backend.js';
import { addDays, endOfWeek, shortDate } from './dates.js';
import { buildLink, describeItems, fillTemplate, toWhatsAppNumber } from '../../js/whatsapp.js';

const root = document.querySelector('[data-orders]');
const emptyNote = document.querySelector('[data-empty]');
const fromInput = document.querySelector('[data-from]');
const toInput = document.querySelector('[data-to]');
const statusSelect = document.querySelector('[data-status]');
const whenSelect = document.querySelector('[data-when]');
const customBox = document.querySelector('[data-custom]');
const countBadge = document.querySelector('[data-new-count]');
const countNumber = document.querySelector('[data-new-number]');
const baseTitle = 'Orders | Admin';

const seen = (() => { try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')); } catch { return new Set(); } })();
const markSeen = (id) => { seen.add(id); try { localStorage.setItem(SEEN_KEY, JSON.stringify([...seen])); } catch { /* ignore */ } };

const view = { status: 'active', range: 'upcoming' };
let settings = await api.getSettings();
let busy = false; // do not redraw while a confirmation or message box is open

const el = (tag, props = {}, ...kids) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) { if (k === 'role' || k.startsWith('aria-')) node.setAttribute(k, v); else node[k] = v; }
  node.append(...kids.filter((k) => k !== null && k !== undefined));
  return node;
};
const when = (o) => (o.pickup_date ? `${shortDate(o.pickup_date)}${o.pickup_time ? `, ${o.pickup_time}` : ''}` : 'No pickup date');
const statusOk = (o) => {
  if (view.status === 'all') return true;
  if (view.status === 'active') return o.status !== 'collected' && o.status !== 'cancelled';
  return o.status === view.status;
};

// The date window for the list. Orders without a pickup date are always listed (the rules module keeps them).
function window_() {
  const today = ukToday();
  if (view.range === 'today') return { from: today, to: today };
  if (view.range === 'tomorrow') { const d = addDays(today, 1); return { from: d, to: d }; }
  if (view.range === 'week') return { from: today, to: endOfWeek(today) };
  if (view.range === 'past') return { from: null, to: addDays(today, -1) };
  if (view.range === 'custom') return { from: fromInput.value || null, to: toInput.value || null };
  return { from: today, to: null };
}

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
  const close = el('button', { type: 'button', className: 'btn btn-secondary btn-small', onclick: () => { box.remove(); busy = false; } }, 'Close');
  if (!phone) {
    box.append(el('p', { className: 'error' }, 'This phone number does not look valid, so WhatsApp cannot be opened. Check the number the customer gave.'), close);
    card.append(box);
    return;
  }
  if (!settings.pickup_address_text) box.append(el('p', { className: 'error', role: 'alert' }, 'Add your pickup address in Settings. ', el('a', { href: 'settings.html' }, 'Open Settings')));
  const area = el('textarea', { rows: 8, value: messageText(order, order.status), 'aria-label': 'Message to send' });
  area.id = `msg-${order.id}`;
  const send = el('a', { className: 'btn btn-small', target: '_blank', rel: 'noopener noreferrer' }, 'Open WhatsApp');
  const sync = () => { send.href = buildLink(phone, area.value); };
  area.addEventListener('input', sync); sync();
  box.append(el('label', { htmlFor: area.id }, 'Edit the message if you like'), area, el('p', { className: 'hint' }, 'You tap send in WhatsApp.'), el('div', { className: 'btn-row' }, send, close));
  card.append(box);
  area.focus();
}

function confirmCancel(order, card, showError) {
  busy = true;
  const box = el('div', { className: 'confirm-box', role: 'alertdialog', 'aria-label': 'Cancel this order' }, el('p', {}, `Cancel ${order.order_number}? Its stock goes back on the shelf.`));
  const yes = el('button', { type: 'button', className: 'btn btn-danger btn-small', onclick: () => changeStatus(order, 'cancelled', showError) }, 'Yes, cancel this order');
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
  const customised = order.items.some((l) => l.customised);

  const badge = el('span', { className: 'status-badge' }, STATUS_LABELS[order.status]);
  badge.dataset.status = order.status;
  article.append(
    el('div', { className: 'order-top' }, el('span', { className: 'order-number' }, order.order_number),
      order.source === 'manual' ? el('span', { className: 'tag tag-manual' }, 'Manual') : null, badge),
    el('p', { className: 'pickup-line' }, when(order), customised ? el('span', { className: 'tag tag-custom' }, 'Customised') : null),
    el('p', { className: 'order-who' }, el('strong', {}, order.customer_name), ' · ', el('a', { href: `tel:${order.customer_phone.replace(/[^\d+]/g, '')}` }, order.customer_phone)),
    el('ul', { className: 'order-lines' }, ...order.items.map((l) => el('li', {}, `${l.qty} × ${l.name}`, l.options.length ? el('span', { className: 'opts' }, l.options.map((o) => o.label).join(', ')) : null))),
  );
  if (order.notes) article.append(el('p', { className: 'order-notes' }, `Note: ${order.notes}`));

  const open = () => { markSeen(order.id); article.removeAttribute('data-fresh'); };
  const actions = el('div', { className: 'order-actions' });
  const next = NEXT_STATUS[order.status];
  if (next) actions.append(el('button', { type: 'button', className: 'btn btn-small', onclick: () => { err.textContent = ''; changeStatus(order, next.status, showError); } }, next.label));
  actions.append(el('button', { type: 'button', className: 'btn btn-secondary btn-small', disabled: !phone, onclick: () => { open(); messageBox(order, article); } }, 'Message'));

  const more = el('details', { className: 'more' }, el('summary', { 'aria-label': `More actions for ${order.order_number}` }, 'More'));
  const list = el('div', { className: 'more-list' });
  for (const status of ['new', 'confirmed', 'ready', 'collected']) {
    if (status === order.status || status === next?.status) continue;
    list.append(el('button', { type: 'button', className: 'menu-item', onclick: () => { more.open = false; err.textContent = ''; changeStatus(order, status, showError); } }, `Set to ${STATUS_LABELS[status]}`));
  }
  if (order.status !== 'cancelled') list.append(el('button', { type: 'button', className: 'menu-item danger', onclick: () => { more.open = false; err.textContent = ''; confirmCancel(order, article, showError); } }, 'Cancel order'));
  more.append(list);
  actions.append(more);

  article.append(el('div', { className: 'order-foot' }, el('span', { className: 'order-total' }, formatPrice(order.total_pence)), actions));
  if (!phone) article.append(el('p', { className: 'hint error' }, 'The phone number is not valid, so Message is switched off.'));
  article.append(err);
  article.addEventListener('click', () => { if (fresh) open(); }, { once: true });
  return article;
}

async function refresh() {
  if (busy) return;
  settings = await api.getSettings();
  const { from, to } = window_();
  const all = await api.listOrders({ from, to });
  const everything = await api.listOrders({});
  const newCount = everything.filter((o) => o.status === 'new').length;
  countNumber.textContent = String(newCount);
  countBadge.hidden = newCount === 0;
  document.title = newCount ? `(${newCount}) ${baseTitle}` : baseTitle;

  const shown = all.filter(statusOk);
  root.replaceChildren();
  const groups = new Map();
  for (const o of shown) { const key = o.pickup_date || ''; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(o); }
  const keys = [...groups.keys()].sort((a, b) => (a === '' ? 1 : b === '' ? -1 : a.localeCompare(b)));
  for (const key of keys) {
    const orders = groups.get(key);
    const section = el('section', {}, el('h2', { className: 'order-day' }, key ? shortDate(key, true) : 'No pickup date', el('span', {}, `${orders.length} order${orders.length === 1 ? '' : 's'}`)));
    for (const o of orders) section.append(card(o));
    root.append(section);
  }
  emptyNote.textContent = everything.length ? 'No orders match these filters.' : 'No orders yet. New orders appear here as soon as they are placed.';
  emptyNote.hidden = shown.length > 0;
}

// Filters: two dropdowns (D-053). The choice survives a reload.
const saveFilters = () => { try { localStorage.setItem(FILTER_KEY, JSON.stringify({ ...view, from: fromInput.value, to: toInput.value })); } catch { /* ignore */ } };
const showFilters = () => { statusSelect.value = view.status; whenSelect.value = view.range; customBox.hidden = view.range !== 'custom'; };
try {
  const saved = JSON.parse(localStorage.getItem(FILTER_KEY) || 'null');
  if (saved) {
    if ([...statusSelect.options].some((o) => o.value === saved.status)) view.status = saved.status;
    if ([...whenSelect.options].some((o) => o.value === saved.range)) view.range = saved.range;
    fromInput.value = saved.from || ''; toInput.value = saved.to || '';
  }
} catch { /* start with the defaults */ }
showFilters();
const onFilter = () => { view.status = statusSelect.value; view.range = whenSelect.value; showFilters(); saveFilters(); busy = false; refresh(); };
statusSelect.addEventListener('change', onFilter);
whenSelect.addEventListener('change', onFilter);
for (const input of [fromInput, toInput]) input.addEventListener('change', onFilter);
document.addEventListener('click', (e) => { document.querySelectorAll('.more[open]').forEach((d) => { if (!d.contains(e.target)) d.open = false; }); });
api.onChange(() => refresh());
setInterval(refresh, ORDERS_REFRESH_SECONDS * 1000);
await refresh();
