import { api } from './shell.js';
import { recordRefresh } from './live-feed.js';
import { FILTER_KEY, ORDERS_REFRESH_SECONDS, SEEN_KEY, TOAST_SECONDS, STATUS_LABELS, TEMPLATE_BY_STATUS, NEXT_STATUS } from './admin-config.js';
import { formatPrice } from '../../js/cart.js';
import { ukToday } from '../../js/mock-backend.js';
import { addDays, endOfWeek, shortDate } from './dates.js';
import { buildLink, describeItems, fillTemplate, toWhatsAppNumber } from '../../js/whatsapp.js';
import { ordersToCsv } from '../../js/admin-rules.js';
import { notifyNewOrder, playSoftSound, soundOn } from './alerts.js';
import { toast } from './dom.js';

const root = document.querySelector('[data-orders]');
const emptyNote = document.querySelector('[data-empty]');
const fromInput = document.querySelector('[data-from]');
const toInput = document.querySelector('[data-to]');
const statusSelect = document.querySelector('[data-status]');
const whenSelect = document.querySelector('[data-when]');
const customBox = document.querySelector('[data-custom]');
const countBadge = document.querySelector('[data-new-count]');
const countNumber = document.querySelector('[data-new-number]');
const liveStatus = document.querySelector('[data-live]');
const baseTitle = 'Orders | Admin';

const seen = (() => { try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')); } catch { return new Set(); } })();
const markSeen = (id) => { seen.add(id); try { localStorage.setItem(SEEN_KEY, JSON.stringify([...seen])); } catch { /* ignore */ } };

const view = { status: 'active', range: 'upcoming' };
let settings = await api.getSettings();
let known = null; // ids of the orders at the last look
let busy = false; // do not redraw while a confirmation or message box is open

const el = (tag, props = {}, ...kids) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) { if (k === 'role' || k.startsWith('aria-')) node.setAttribute(k, v); else node[k] = v; }
  node.append(...kids.filter((k) => k !== null && k !== undefined));
  return node;
};
// Shown on the card: "Today, 17:30", "Tomorrow, 10:00", or "Sat 14 Nov, 10:30". The full date still goes into WhatsApp messages (when).
const dayWord = (iso) => (iso === ukToday() ? 'Today' : iso === addDays(ukToday(), 1) ? 'Tomorrow' : shortDate(iso));
const whenShort = (o) => (o.pickup_date ? `${dayWord(o.pickup_date)}${o.pickup_time ? `, ${o.pickup_time}` : ''}` : 'No pickup date');
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
  if (view.range === 'all') return { from: null, to: null };
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
  if (!settings.pickup_address_text) box.append(el('p', { className: 'error', role: 'alert' }, 'Add your pickup address in Settings. ', el('a', { href: 'settings' }, 'Open Settings')));
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
  const yes = el('button', { type: 'button', className: 'btn btn-danger btn-small', onclick: () => changeStatus(order, 'cancelled', showError, { message: true }) }, 'Yes, cancel this order');
  const no = el('button', { type: 'button', className: 'btn btn-secondary btn-small', onclick: () => { box.remove(); busy = false; } }, 'Keep it');
  box.append(el('div', { className: 'btn-row' }, yes, no));
  card.append(box);
  no.focus();
}

// Saves the status first. With { message: true } WhatsApp then opens with the matching message for that customer (D-056).
// The blank window is opened inside the tap, because browsers only allow a new window straight from a tap; it is pointed at
// WhatsApp once the status is saved. If the browser blocks it, the message box opens on the order instead.
async function changeStatus(order, status, showError, { message = false } = {}) {
  const phone = toWhatsAppNumber(order.customer_phone);
  let win = null;
  if (message && phone) { try { win = window.open('', '_blank'); } catch { win = null; } }
  try {
    await api.setOrderStatus(order.id, status);
  } catch (err) {
    if (win) win.close();
    busy = false;
    showError(err.message);
    return;
  }
  busy = false;
  markSeen(order.id);
  const updated = { ...order, status };
  if (message && phone) {
    const link = buildLink(phone, messageText(updated, status));
    if (win) win.location.href = link;
    if (!settings.pickup_address_text && /\{address\}/.test(settings[`wa_template_${TEMPLATE_BY_STATUS[status]}`] || '')) toast('Add your pickup address in Settings so your messages include it.', { href: 'settings' });
  } else if (message && !phone) {
    toast(`${order.order_number} is ${STATUS_LABELS[status].toLowerCase()}. The phone number is not valid, so WhatsApp was not opened.`);
  }
  await refresh();
  if (message && phone && !win) { const a = root.querySelector(`[data-id="${order.id}"]`); if (a) { busy = true; messageBox(updated, a); } }
}

function card(order) {
  const fresh = order.status === 'new' && !seen.has(order.id);
  const article = el('article', { className: 'order' });
  article.dataset.status = order.status;
  article.dataset.id = order.id;
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
    el('p', { className: 'pickup-line' }, whenShort(order), customised ? el('span', { className: 'tag tag-custom' }, 'Customised') : null),
    el('p', { className: 'order-who' }, el('span', { className: 'person-icon', 'aria-hidden': 'true' }), el('strong', {}, order.customer_name || 'No name'), order.customer_phone ? el('a', { href: `tel:${order.customer_phone.replace(/[^\d+]/g, '')}` }, order.customer_phone) : null),
    el('ul', { className: 'order-lines' }, ...order.items.map((l) => el('li', {}, `${l.qty} × ${l.name}`, l.options.length ? el('span', { className: 'opts' }, l.options.map((o) => o.label).join(', ')) : null))),
  );
  if (order.notes) article.append(el('p', { className: 'order-notes' }, `Note: ${order.notes}`));

  const open = () => { markSeen(order.id); article.removeAttribute('data-fresh'); };
  const actions = el('div', { className: 'order-actions' });
  const next = NEXT_STATUS[order.status];
  if (next) actions.append(el('button', { type: 'button', className: 'btn btn-small', onclick: () => { err.textContent = ''; changeStatus(order, next.status, showError, { message: true }); } }, next.label));

  const more = el('details', { className: 'more' }, el('summary', { 'aria-label': `More actions for ${order.order_number}` }, 'More'));
  const list = el('div', { className: 'more-list' });
  if (phone) list.append(el('button', { type: 'button', className: 'menu-item', onclick: () => { more.open = false; open(); messageBox(order, article); } }, 'Message customer'));
  for (const status of ['new', 'confirmed', 'ready', 'collected']) {
    if (status === order.status || status === next?.status) continue;
    list.append(el('button', { type: 'button', className: 'menu-item', onclick: () => { more.open = false; err.textContent = ''; changeStatus(order, status, showError); } }, `Set to ${STATUS_LABELS[status]}`));
  }
  if (order.status !== 'cancelled') list.append(el('button', { type: 'button', className: 'menu-item danger', onclick: () => { more.open = false; err.textContent = ''; confirmCancel(order, article, showError); } }, 'Cancel order'));
  more.append(list);
  actions.append(more);

  article.append(el('p', { className: 'order-total' }, formatPrice(order.total_pence)), el('div', { className: 'order-actions order-actions-row' }, ...actions.childNodes));
  if (!phone) article.append(el('p', { className: 'hint error' }, order.customer_phone ? 'The phone number is not valid, so WhatsApp messages are switched off.' : 'There is no phone number, so WhatsApp messages are switched off.'));
  article.append(err);
  article.addEventListener('click', () => { if (fresh) open(); }, { once: true });
  return article;
}

async function refresh() {
  if (busy) return;
  recordRefresh();
  settings = await api.getSettings();
  const { from, to } = window_();
  const all = await api.listOrders({ from, to });
  const everything = await api.listOrders({});
  if (known) { // orders that were not there on the last look: tell her (toast, optional sound, browser notification)
    const added = everything.filter((o) => !known.has(o.id) && o.status === 'new');
    if (added.length) {
      toast(`New order ${added[0].order_number}${added[0].customer_name ? ` from ${added[0].customer_name}` : ''}${added.length > 1 ? ` and ${added.length - 1} more` : ''}`, { seconds: TOAST_SECONDS, href: 'orders' });
      notifyNewOrder(added[0]);
      if (soundOn()) playSoftSound();
    }
  }
  known = new Set(everything.map((o) => o.id));
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
  if (openId) {
    const target = root.querySelector(`[data-id="${CSS.escape(openId)}"]`);
    openId = null;
    if (target) { target.scrollIntoView({ block: 'center' }); target.classList.add('order-flash'); target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
  }
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
// Links from Home: ?status=new shows every new order; ?open=<id> opens one order (today's pickups).
const params = new URLSearchParams(location.search);
let openId = params.get('open');
if (params.get('status') && [...statusSelect.options].some((o) => o.value === params.get('status'))) { view.status = params.get('status'); view.range = 'all'; }
if (openId) { view.status = 'all'; view.range = 'all'; }
showFilters();
const onFilter = () => { view.status = statusSelect.value; view.range = whenSelect.value; showFilters(); saveFilters(); busy = false; refresh(); };
statusSelect.addEventListener('change', onFilter);
whenSelect.addEventListener('change', onFilter);
for (const input of [fromInput, toInput]) input.addEventListener('change', onFilter);
document.addEventListener('click', (e) => { document.querySelectorAll('.more[open]').forEach((d) => { if (!d.contains(e.target)) d.open = false; }); });
// Live feed (D-057): new and changed orders arrive at once. The refresh every minute stays as the fallback if the connection drops.
api.subscribeOrders(() => refresh(), (state) => { liveStatus.hidden = state === 'live'; });
setInterval(refresh, ORDERS_REFRESH_SECONDS * 1000);

// Export (CSV) for a chosen range of pickup dates; no dates means everything.
{
  const from = document.querySelector('[data-export-from]'); const to = document.querySelector('[data-export-to]');
  const message = document.querySelector('[data-export-msg]');
  document.querySelector('[data-export]').addEventListener('click', async () => {
    message.textContent = '';
    try {
      const rows = await api.listOrders({ from: from.value || null, to: to.value || null });
      const url = URL.createObjectURL(new Blob([ordersToCsv(rows)], { type: 'text/csv;charset=utf-8' }));
      const a = Object.assign(document.createElement('a'), { href: url, download: `orders-${from.value || 'all'}${to.value ? `-to-${to.value}` : ''}.csv` });
      document.body.append(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      message.textContent = `Downloaded ${rows.length} order${rows.length === 1 ? '' : 's'}.`;
    } catch (e) { message.textContent = e.message; }
  });
}
await refresh();
