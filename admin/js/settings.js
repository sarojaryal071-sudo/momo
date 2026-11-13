// Settings (Step 4k, D-065): a hub of short rows, each opening one section on its own page (#ordering and so on).
// Every section with fields has one Save and Cancel in the docked bar and warns before unsaved changes are lost.
// Where the old blocks went: Pause ordering + Ordering rules -> Ordering; Pickup address -> Pickup details; WhatsApp messages -> Messages;
// Notice banner + Allergens list -> Notices; Backup and privacy -> Backup and privacy; Add to home screen + New order alerts + Live feed + log out -> App.
import { api } from './shell.js';
import { readLive } from './live-feed.js';
import { clearLogin } from './session.js';
import { confirmDialog, el, field, makeSwitch, toast } from './dom.js';
import { SETTING_FIELDS, hoursHint, parseSettings } from '../../js/admin-rules.js';
import { mountAllergenManager, LEGAL_REMINDER } from './allergens.js';
import { askNotificationPermission, notificationState, playSoftSound, setSound, soundOn } from './alerts.js';

const root = document.querySelector('[data-root]');
const svg = (d) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', '24'); s.setAttribute('height', '24'); s.setAttribute('aria-hidden', 'true'); for (const part of d.split('|')) { const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', part); s.append(p); } return s; };
const card = (title, ...kids) => el('section', { className: 'panel' }, title ? el('h2', {}, title) : null, ...kids);
const errorLine = () => el('p', { className: 'field-error', role: 'alert' });

// Where she came from (for example the product editor): the back arrow returns there. Only known admin pages are accepted.
const FROM = { products: 'Products', orders: 'Orders', pickup: 'Pickup', sales: 'Sales', prep: 'Prep list', 'new-order': 'New order', home: 'Home' };
const fromKey = new URLSearchParams(location.search).get('from');
const origin = Object.hasOwn(FROM, fromKey) ? { label: FROM[fromKey], href: fromKey === 'home' ? './' : fromKey } : null;
const backLink = (toHub) => el('a', { className: 'back-link back-text', href: origin ? origin.href : (toHub ? '#' : '#') },
  svg('M15 5l-7 7 7 7'), el('span', {}, origin ? `Back to ${origin.label}` : 'Settings'));

let settings = {}; let notice = { active: false, message: '' };
let page = null; // { dirty(), cleanup() } for the section that is open
let shown = null; let ignoreHash = false;

// ---------- sections ----------
const SECTIONS = [
  { key: 'ordering', title: 'Ordering', icon: 'M5 7h14l-1.2 11a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z|M9 7a3 3 0 0 1 6 0',
    summary: () => `${settings.ordering_open === false ? 'Paused' : 'Open'} · ${settings.max_orders_per_day ? `Limit ${settings.max_orders_per_day} a day` : 'No daily limit'} · ${settings.custom_min_lead_hours ?? 48} hours for customised`, build: buildOrdering },
  { key: 'pickup', title: 'Pickup details', icon: 'M12 21s-6-5.6-6-10.5a6 6 0 0 1 12 0C18 15.4 12 21 12 21z|M12 12.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
    summary: () => (settings.pickup_address_text ? settings.pickup_address_text.replace(/\s+/g, ' ').slice(0, 48) : 'No address written yet'), build: buildPickup },
  { key: 'messages', title: 'Messages', icon: 'M4 5h16v11H9l-5 4z',
    summary: () => 'The four WhatsApp messages', build: buildMessages },
  { key: 'notices', title: 'Notices', icon: 'M6 16V10a6 6 0 0 1 12 0v6l1.5 2h-15z|M10 20a2 2 0 0 0 4 0',
    summary: () => (notice.active ? 'Site banner is showing' : 'Site banner is off'), build: buildNotices },
  { key: 'backup', title: 'Backup and privacy', icon: 'M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z',
    summary: () => 'Weekly export and customer data', build: buildBackup },
  { key: 'app', title: 'App', icon: 'M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z|M11 18h2',
    summary: () => 'Home screen, alerts, live feed, log out', build: buildApp },
];

function buildOrdering() {
  const pause = makeSwitch('Pause ordering', settings.ordering_open === false);
  const message = field('Message customers see when paused', 'textarea', { value: settings.ordering_closed_message ?? '', rows: 3, maxLength: 300 });
  const fields = {}; const grid = el('div', { className: 'form-grid' });
  for (const [key, spec] of Object.entries(SETTING_FIELDS)) {
    const hint = key.endsWith('lead_hours') ? hoursHint(settings[key]) : key === 'max_orders_per_day' ? 'Leave empty for no limit. Counts orders that are not cancelled, per pickup day.' : '';
    fields[key] = field(spec.label, 'text', { value: settings[key] ?? '', inputMode: 'numeric', hint });
    if (key.endsWith('lead_hours')) fields[key].control.addEventListener('input', () => { fields[key].wrap.querySelector('.hint').textContent = hoursHint(fields[key].control.value); });
    grid.append(fields[key].wrap);
  }
  fields.order_prefix = field('Order number prefix', 'text', { value: settings.order_prefix ?? 'SS', maxLength: 6, hint: 'Capital letters. Order numbers look like SS-1311-01.' });
  grid.append(fields.order_prefix.wrap);
  const errors = errorLine();
  return {
    nodes: [card('Pause ordering', el('p', {}, 'When paused, the public cart shows your message and cannot place an order. The pause is live at once when you save.'), pause.row, message.wrap),
      card('Ordering rules', el('p', {}, 'How much notice you need, how far ahead customers can choose, and how many orders you take each day.'), grid, errors)],
    values: () => ({ paused: pause.get(), message: message.control.value, ...Object.fromEntries(Object.entries(fields).map(([k, f]) => [k, f.control.value])) }),
    async save() {
      errors.textContent = '';
      const result = parseSettings(Object.fromEntries(Object.entries(fields).map(([k, f]) => [k, f.control.value])));
      if (!result.ok) { errors.textContent = Object.values(result.errors).join(' '); errors.scrollIntoView({ block: 'center', behavior: 'smooth' }); throw new Error('Check the numbers on this page.'); }
      await api.saveSettings({ ...result.patch, ordering_open: !pause.get(), ordering_closed_message: message.control.value });
    },
  };
}

function buildPickup() {
  const address = field('Address and how to find you', 'textarea', { value: settings.pickup_address_text ?? '', rows: 4, maxLength: 500 });
  return { nodes: [card('Pickup address (private)', el('p', {}, 'Only used in the messages you send to customers. It is never shown on the public site.'), address.wrap)],
    values: () => ({ a: address.control.value }), save: () => api.saveSettings({ pickup_address_text: address.control.value }) };
}

function buildMessages() {
  const defs = [['wa_template_confirmed', 'When confirmed', 4], ['wa_template_ready', 'When ready', 4], ['wa_template_cancelled', 'When cancelled', 4], ['wa_template_collected', 'When collected', 3]];
  const fields = defs.map(([key, label, rows]) => [key, field(label, 'textarea', { value: settings[key] ?? '', rows, maxLength: 1000 })]);
  return { nodes: [card('WhatsApp messages', el('p', {}, 'You can use these words, which are filled in for each order: ', ...['{name}', '{order_number}', '{pickup}', '{items}', '{address}'].flatMap((w) => [el('code', {}, w), ' ']), 'When you press Confirm, Mark ready, Mark collected or Cancel on an order, the status is saved first and then WhatsApp opens with the matching message for that customer. You can edit it in WhatsApp, and you tap send.'), ...fields.map(([, f]) => f.wrap))],
    values: () => Object.fromEntries(fields.map(([k, f]) => [k, f.control.value])), save: () => api.saveSettings(Object.fromEntries(fields.map(([k, f]) => [k, f.control.value]))) };
}

function buildNotices() {
  const on = makeSwitch('Show the notice on the site', notice.active);
  const message = field('Notice', 'textarea', { value: notice.message, rows: 2, maxLength: 300, hint: 'A short line shown at the top of every page, for example "Closed this weekend. Back on Saturday 28th."' });
  const manager = el('div', { className: 'allergen-manager' });
  mountAllergenManager(manager);
  return { nodes: [card('Notice banner', el('p', {}, 'It appears on the public site at once. You do not need to press Publish.'), on.row, message.wrap),
      card('Allergens', el('p', { className: 'reminder' }, LEGAL_REMINDER), el('p', { className: 'muted' }, 'Changes to this list are saved as you make them.'), manager)],
    values: () => ({ on: on.get(), message: message.control.value }), save: () => api.saveNotice({ message: message.control.value, active: on.get() }) };
}

function buildBackup() {
  return { nodes: [card('Backup and privacy',
    el('p', {}, 'Export your orders as a CSV file every week (Orders, Export). The free plan has no automatic backups, so this file is your backup.'),
    el('p', {}, 'Customer names and phone numbers are personal data. Old customer details should be removed once the period you and the council decide has passed. A tool to remove details from old orders is planned; until then, do not share the exported files.'))] };
}

function buildApp() {
  const status = el('p', { className: 'muted' });
  const drawStatus = () => { const st = notificationState(); status.textContent = st === 'granted' ? 'Notifications are on for this phone or browser.' : st === 'denied' ? 'Notifications are blocked. Allow them for this site in your browser settings.' : st === 'unsupported' ? 'This browser cannot show notifications. The badge and the page title still show new orders.' : 'Notifications are off.'; };
  drawStatus();
  const ask = el('button', { type: 'button', className: 'btn btn-secondary', onclick: async () => { await askNotificationPermission(); drawStatus(); } }, 'Turn on notifications');
  const sound = makeSwitch('Soft sound for a new order', soundOn(), (v) => { setSound(v); if (v) playSoftSound(); });
  const line = el('p', { className: 'muted live-feed-line' });
  const at = (t) => (t ? new Date(t).toLocaleTimeString('en-GB', { timeZone: 'Europe/London' }) : 'none yet');
  let mine = 'connecting';
  const draw = () => { const i = readLive(); line.textContent = `Status: ${mine === 'live' ? 'connected' : mine}. Last status: ${i.status || 'none yet'}${i.error ? ` (${i.error})` : ''}. Last event: ${at(i.eventAt)}. Last refresh: ${at(i.refreshAt)}.`; };
  const stop = api.subscribeOrders(() => draw(), (s) => { mine = s === 'live' ? 'live' : 'reconnecting'; draw(); });
  const timer = setInterval(draw, 5000); draw();
  const logout = el('button', { type: 'button', className: 'btn btn-secondary', onclick: async () => { await api.logout(); clearLogin(); location.replace('login'); } }, 'Log out');
  return { cleanup: () => { clearInterval(timer); stop?.(); },
    nodes: [card('Add to home screen',
        el('p', {}, el('strong', {}, 'iPhone (Safari): '), 'open this page in Safari, tap the Share button, choose ', el('em', {}, 'Add to Home Screen'), ', then ', el('em', {}, 'Add'), '.'),
        el('p', {}, el('strong', {}, 'Android (Chrome): '), 'tap the three dots, choose ', el('em', {}, 'Add to Home screen'), ' (or ', el('em', {}, 'Install app'), '), then ', el('em', {}, 'Add'), '.'),
        el('p', {}, 'It then opens like an app, full screen, as "Steam & Spice Admin". You stay logged in.')),
      card('New order alerts', el('p', {}, 'New orders appear on the Orders page by themselves, with a badge, a number in the page title and a message at the top. Notifications and the sound work while the admin is open, even in the background.'), status, el('div', { className: 'btn-row' }, ask), sound.row),
      card('Live feed', el('p', {}, 'New orders arrive by themselves while this is connected.'), line),
      card('Log out', el('div', { className: 'btn-row' }, logout))] };
}

// ---------- hub and pages ----------
async function load() {
  settings = await api.getSettings();
  try { notice = await api.getNotice(); } catch { notice = { active: false, message: '' }; }
}

function drawHub() {
  root.replaceChildren(...[origin ? el('div', { className: 'back-row' }, backLink(true)) : null].filter(Boolean), el('div', { className: 'title-row' }, el('h1', {}, 'Settings')),
    el('div', { className: 'settings-list' }, ...SECTIONS.map((s) => el('a', { className: 'settings-row', href: `#${s.key}` },
      el('span', { className: 'settings-icon' }, svg(s.icon)),
      el('span', { className: 'settings-text' }, el('strong', {}, s.title), el('span', { className: 'muted' }, s.summary())),
      svg('M9 5l7 7-7 7')))));
}

async function drawPage(section) {
  const built = section.build();
  const initial = built.values ? JSON.stringify(built.values()) : null;
  const dirty = () => (built.values ? JSON.stringify(built.values()) !== initial : false);
  page = { dirty, cleanup: built.cleanup };
  window.onbeforeunload = () => (dirty() ? '' : undefined);
  const view = el('div', { className: 'settings-page' }, el('div', { className: 'back-row' }, backLink(false)), el('div', { className: 'title-row' }, el('h1', {}, section.title)), ...built.nodes);
  if (built.save) {
    const save = el('button', { type: 'button', className: 'btn' }, 'Save');
    const cancel = el('button', { type: 'button', className: 'btn btn-secondary' }, 'Cancel');
    save.addEventListener('click', async () => {
      save.disabled = true; cancel.disabled = true; save.setAttribute('aria-busy', 'true'); save.textContent = 'Saving…';
      try {
        await built.save();
        toast(`${section.title} saved.`, { seconds: 4 });
        document.dispatchEvent(new CustomEvent('settings-changed')); // the paused strip updates at once
        await load(); await show(section.key, true);
      } catch (e) { toast(e.message, { seconds: 8 }); save.disabled = false; cancel.disabled = false; save.removeAttribute('aria-busy'); save.textContent = 'Save'; }
    });
    cancel.addEventListener('click', () => { location.hash = ''; }); // the unsaved-changes question is asked by the hash guard
    view.append(el('div', { className: 'action-sticky' }, save, cancel));
    document.body.classList.add('has-actionbar');
  }
  root.replaceChildren(view);
}

async function show(key, force = false) {
  page?.cleanup?.(); page = null; window.onbeforeunload = null; document.body.classList.remove('has-actionbar');
  const section = SECTIONS.find((s) => s.key === key);
  shown = section ? section.key : null;
  if (!force) await load();
  if (section) await drawPage(section); else drawHub();
  document.querySelector('.admin-main').scrollTop = 0;
}

async function onHash() {
  if (ignoreHash) { ignoreHash = false; return; }
  const key = location.hash.slice(1);
  if ((key || null) === shown) return;
  if (page?.dirty() && !(await confirmDialog({ title: 'Discard your changes?', message: 'You have changes on this page that are not saved.', confirmLabel: 'Discard', cancelLabel: 'Keep editing', danger: true }))) {
    ignoreHash = true; location.hash = shown ? `#${shown}` : ''; return;
  }
  await show(key);
}
window.addEventListener('hashchange', onHash);
// the Resume button on the paused strip changes the pause: keep the open page truthful unless she is editing it
document.addEventListener('settings-changed', async () => { if (page?.dirty?.()) return; if (!shown || shown === 'ordering') { await load(); await show(shown, true); } });

await show(location.hash.slice(1));
