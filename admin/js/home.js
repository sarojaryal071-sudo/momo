// Home (D-059): today's numbers on one screen. Updates live (Realtime) with the one-minute refresh as the fallback.
import { api } from './shell.js';
import { HOME_PICKUPS_SHOWN, HOME_WAITING_MINUTES, ORDERS_REFRESH_SECONDS, STATUS_LABELS, TOAST_SECONDS } from './admin-config.js';
import { addDays, shortDate } from './dates.js';
import { notifyNewOrder, playSoftSound, soundOn } from './alerts.js';
import { el, makeSwitch, toast } from './dom.js';
import { ukToday } from '../../js/mock-backend.js';

const tilesBox = document.querySelector('[data-tiles]');
const todayBox = document.querySelector('[data-today]');
const shopBox = document.querySelector('[data-shop]');
const greeting = document.querySelector('[data-greeting]');
const liveStatus = document.querySelector('[data-live]');
let known = null;
let busyShop = false;

const hourNow = () => Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', hourCycle: 'h23' }).format(new Date()));
const minutesNow = () => { const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).map((x) => [x.type, x.value])); return Number(p.hour) * 60 + Number(p.minute); };
const toMin = (t) => (t ? Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)) : null);

function tile(href, label, value, sub, { strong = false } = {}) {
  return el('a', { className: `home-tile${strong ? ' home-tile-strong' : ''}`, href }, el('span', { className: 'home-tile-label' }, label), el('span', { className: 'home-tile-value' }, String(value)), sub ? el('span', { className: 'home-tile-sub' }, sub) : null);
}

async function drawShop(settings) {
  shopBox.replaceChildren();
  const open = settings.ordering_open !== false;
  const sw = makeSwitch('Ordering is open', open, async (on) => {
    busyShop = true;
    try { await api.saveSettings({ ordering_open: on }); document.dispatchEvent(new CustomEvent('settings-changed')); } catch (e) { shopBox.append(el('p', { className: 'error', role: 'alert' }, e.message)); sw.set(!on); }
    busyShop = false;
    await refresh();
  });
  shopBox.append(sw.row, el('p', { className: 'muted' }, open ? 'Customers can place orders.' : 'Ordering is paused. Customers see your message and cannot order.'));
  let status = null;
  try { status = await api.getSiteStatus(); } catch { /* no publish pipeline: show nothing */ }
  if (status) {
    const busy = status.state === 'publishing', failed = status.state === 'failed';
    const label = busy ? 'Publishing' : failed ? 'Failed' : status.unpublished ? 'Not published yet' : 'Live';
    const button = el('button', { type: 'button', className: 'btn btn-small', disabled: busy || (!status.unpublished && !failed) }, 'Publish changes');
    button.addEventListener('click', async () => { button.disabled = true; try { await api.publish(); } catch { /* shown on Products */ } await refresh(); });
    shopBox.append(el('div', { className: 'publish-head' }, el('span', { className: 'status-badge', 'data-status': busy ? 'new' : failed ? 'cancelled' : status.unpublished ? 'ready' : 'confirmed' }, label),
      el('span', { className: 'muted' }, busy ? 'Publishing now. The site updates in a minute or two.' : failed ? 'The last publish did not work. Press Publish to try again.' : status.unpublished ? 'You have product changes that are not on the site yet.' : 'The site shows your latest product changes.')), button ? el('div', { className: 'btn-row' }, button) : null);
  }
}

async function refresh() {
  const today = ukToday();
  const tomorrow = addDays(today, 1);
  const [newOrders, near, products, settings] = await Promise.all([
    api.listOrders({ statuses: ['new'] }),
    api.listOrders({ from: today, to: tomorrow }),
    api.listProducts(),
    api.getSettings(),
  ]);
  // new orders she has not seen since the last look: toast, optional sound, browser notification
  const allNow = [...newOrders];
  if (known) {
    const added = allNow.filter((o) => !known.has(o.id));
    if (added.length) {
      toast(`New order ${added[0].order_number}${added[0].customer_name ? ` from ${added[0].customer_name}` : ''}${added.length > 1 ? ` and ${added.length - 1} more` : ''}`, { seconds: TOAST_SECONDS, href: 'orders?status=new' });
      notifyNewOrder(added[0]);
      if (soundOn()) playSoftSound();
    }
  }
  known = new Set(allNow.map((o) => o.id));
  document.title = newOrders.length ? `(${newOrders.length}) Home | Admin` : 'Home | Admin';

  const live = (o) => o.status !== 'cancelled';
  const todays = near.filter((o) => o.pickup_date === today && live(o));
  const tomorrows = near.filter((o) => o.pickup_date === tomorrow && live(o));
  const upcoming = todays.filter((o) => o.status !== 'collected').sort((a, b) => (a.pickup_time || '99').localeCompare(b.pickup_time || '99'));
  const now = minutesNow();
  const next = upcoming.find((o) => o.pickup_time && toMin(o.pickup_time) >= now) || upcoming[0];
  const waiting = newOrders.filter((o) => Date.now() - new Date(o.created_at).getTime() > HOME_WAITING_MINUTES * 60000);
  const threshold = Number(settings.low_stock_threshold ?? 5);
  const lowStock = products.filter((p) => p.active && p.stock_quantity != null && p.stock_quantity <= threshold).sort((a, b) => a.stock_quantity - b.stock_quantity);

  greeting.textContent = `${hourNow() < 12 ? 'Good morning' : hourNow() < 18 ? 'Good afternoon' : 'Good evening'}. Today is ${shortDate(today, true)}.`;
  tilesBox.replaceChildren(
    tile('orders?status=new', 'New orders', newOrders.length, newOrders.length ? (waiting.length ? `Waiting: ${waiting.length} for more than ${HOME_WAITING_MINUTES} minutes` : 'Tap to open them') : 'Nothing waiting', { strong: newOrders.length > 0 }),
    tile('orders?status=all', "Today's pickups", todays.length, next ? `Next: ${next.pickup_time || 'no time set'}, ${next.customer_name || 'no name'}` : todays.length ? 'All collected' : 'None today'),
    tile('orders?status=all', 'Tomorrow', tomorrows.length, tomorrows.length ? `${tomorrows.length} to prepare` : 'None yet'),
    el('a', { className: 'home-tile', href: 'products' }, el('span', { className: 'home-tile-label' }, 'Stock'),
      el('span', { className: 'home-tile-value' }, String(lowStock.length)),
      el('span', { className: 'home-tile-sub' }, lowStock.length ? lowStock.map((p) => `${p.name}: ${p.stock_quantity === 0 ? 'sold out' : `${p.stock_quantity} left`}`).join(', ') : 'Nothing running low')));

  todayBox.replaceChildren();
  if (!todays.length) todayBox.append(el('p', { className: 'muted empty-state' }, 'No orders yet today.'));
  else {
    todayBox.append(el('ul', { className: 'home-list' }, ...(upcoming.length ? upcoming : todays).slice(0, HOME_PICKUPS_SHOWN).map((o) =>
      el('li', {}, el('a', { href: `orders?open=${encodeURIComponent(o.id)}` }, el('strong', {}, o.pickup_time || 'No time'), el('span', {}, o.customer_name || 'No name'), el('span', { className: 'status-badge', 'data-status': o.status }, STATUS_LABELS[o.status]))))));
    if (!upcoming.length) todayBox.append(el('p', { className: 'muted' }, 'All of today\'s orders are collected.'));
  }
  if (!busyShop) await drawShop(settings);
}

api.subscribeOrders(() => refresh(), (state) => { liveStatus.hidden = state === 'live'; });
document.addEventListener('settings-changed', () => { if (!busyShop) refresh(); });
setInterval(refresh, ORDERS_REFRESH_SECONDS * 1000);
await refresh();
