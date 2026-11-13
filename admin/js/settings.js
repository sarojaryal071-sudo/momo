import { api } from './shell.js';
import { SAVED_MESSAGE_SECONDS } from './admin-config.js';
import { readLive } from './live-feed.js';

const settings = await api.getSettings();
const flash = (node, text, ms) => { node.textContent = text; setTimeout(() => { node.textContent = ''; }, ms * 1000); };
const setSwitch = (btn, on) => { btn.setAttribute('aria-checked', String(on)); btn.querySelector('.switch-text').textContent = on ? 'On' : 'Off'; };

for (const form of document.querySelectorAll('[data-form]')) {
  for (const input of form.querySelectorAll('[data-field]')) input.value = settings[input.dataset.field] ?? '';
  const toggle = form.querySelector('[data-switch="ordering_paused"]');
  if (toggle) {
    setSwitch(toggle, !settings.ordering_open);
    toggle.addEventListener('click', () => setSwitch(toggle, toggle.getAttribute('aria-checked') !== 'true')); // a button with role="switch": Space and Enter work too
  }
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const saved = form.querySelector('[data-saved]');
    const error = form.querySelector('[data-error]');
    error.textContent = '';
    const patch = {};
    for (const input of form.querySelectorAll('[data-field]')) patch[input.dataset.field] = input.value;
    if (toggle) patch.ordering_open = toggle.getAttribute('aria-checked') !== 'true';
    try {
      await api.saveSettings(patch);
      flash(saved, toggle ? (patch.ordering_open ? 'Saved. Ordering is open.' : 'Saved. Ordering is paused now.') : 'Saved', SAVED_MESSAGE_SECONDS);
      document.dispatchEvent(new CustomEvent('settings-changed')); // the paused strip updates at once
    } catch (err) {
      error.textContent = err.message;
    }
  });
}
// Resume from the strip on this page also flips the switch back.
document.addEventListener('settings-changed', async () => {
  const toggle = document.querySelector('[data-switch="ordering_paused"]');
  if (toggle) setSwitch(toggle, !(await api.getSettings()).ordering_open);
});

// ---------- notice banner, ordering rules, notifications (Steps 4c and 4 alerts) ----------
import { el, feedback, field, makeSwitch, saving } from './dom.js';
import { SETTING_FIELDS, hoursHint, parseSettings } from '../../js/admin-rules.js';
import { mountAllergenManager, LEGAL_REMINDER } from './allergens.js';
import { askNotificationPermission, notificationState, playSoftSound, setSound, soundOn } from './alerts.js';

const extra = document.querySelector('[data-extra]');
const panel = (title, ...kids) => el('section', { className: 'panel' }, el('h2', {}, title), ...kids);
const submitRow = (label, work) => {
  const row = el('div', { className: 'btn-row' });
  const button = el('button', { type: 'button', className: 'btn' }, label);
  row.append(button);
  const fb = feedback(row);
  button.addEventListener('click', () => saving(button, fb, work));
  return { row, fb, button };
};

// Notice banner: one row, live on the public site at once (no Publish needed)
{
  const notice = await api.getNotice();
  const on = makeSwitch('Show the notice on the site', notice.active);
  const message = field('Notice', 'textarea', { value: notice.message, rows: 2, maxLength: 300, hint: 'A short line shown at the top of every page, for example "Closed this weekend. Back on Saturday 28th."' });
  const { row } = submitRow('Save notice', () => api.saveNotice({ message: message.control.value, active: on.get() }));
  extra.append(panel('Notice banner', el('p', {}, 'It appears on the public site at once. You do not need to press Publish.'), on.row, message.wrap, row));
}

// Ordering rules and the daily limit
{
  const s = await api.getSettings();
  const fields = {};
  const box = el('div', { className: 'form-grid' });
  for (const [key, spec] of Object.entries(SETTING_FIELDS)) {
    const hint = key.endsWith('lead_hours') ? hoursHint(s[key]) : key === 'max_orders_per_day' ? 'Leave empty for no limit. Counts orders that are not cancelled, per pickup day.' : '';
    fields[key] = field(spec.label, 'text', { value: s[key] ?? '', inputMode: 'numeric', hint });
    if (key.endsWith('lead_hours')) fields[key].control.addEventListener('input', () => { fields[key].wrap.querySelector('.hint').textContent = hoursHint(fields[key].control.value); });
    box.append(fields[key].wrap);
  }
  fields.order_prefix = field('Order number prefix', 'text', { value: s.order_prefix ?? 'SS', maxLength: 6, hint: 'Capital letters. Order numbers look like SS-1311-01.' });
  box.append(fields.order_prefix.wrap);
  const errors = el('p', { className: 'error', role: 'alert' });
  const { row, fb } = submitRow('Save ordering rules', async () => {
    errors.textContent = '';
    const result = parseSettings(Object.fromEntries(Object.entries(fields).map(([k, f]) => [k, f.control.value])));
    if (!result.ok) { errors.textContent = Object.values(result.errors).join(' '); throw new Error('Check the numbers above.'); }
    await api.saveSettings(result.patch);
    document.dispatchEvent(new CustomEvent('settings-changed'));
  });
  extra.append(panel('Ordering rules', el('p', {}, 'How much notice you need, how far ahead customers can choose, and how many orders you take each day.'), box, errors, row));
}

// Notifications on this phone (the live feed itself is always on while the page is open)
{
  const status = el('p', { className: 'muted' });
  const draw = () => {
    const st = notificationState();
    status.textContent = st === 'granted' ? 'Notifications are on for this phone or browser.' : st === 'denied' ? 'Notifications are blocked. Allow them for this site in your browser settings.' : st === 'unsupported' ? 'This browser cannot show notifications. The badge and the page title still show new orders.' : 'Notifications are off.';
  };
  draw();
  const ask = el('button', { type: 'button', className: 'btn btn-secondary', onclick: async () => { await askNotificationPermission(); draw(); } }, 'Turn on notifications');
  const sound = makeSwitch('Soft sound for a new order', soundOn(), (on) => { setSound(on); if (on) playSoftSound(); });
  extra.append(panel('New order alerts', el('p', {}, 'New orders appear on the Orders page by themselves, with a badge, a number in the page title and a message at the top. Notifications and the sound work while the admin is open, even in the background.'), status, el('div', { className: 'btn-row' }, ask), sound.row));
}

// Live feed: a quiet line that shows what the order feed is doing, so a problem can be read without developer tools.
{
  const line = el('p', { className: 'muted live-feed-line' });
  const at = (t) => (t ? new Date(t).toLocaleTimeString('en-GB', { timeZone: 'Europe/London' }) : 'none yet');
  let mine = 'connecting';
  const draw = () => { const i = readLive(); line.textContent = `Status: ${mine === 'live' ? 'connected' : mine}. Last status: ${i.status || 'none yet'}${i.error ? ` (${i.error})` : ''}. Last event: ${at(i.eventAt)}. Last refresh: ${at(i.refreshAt)}.`; };
  api.subscribeOrders(() => draw(), (s) => { mine = s === 'live' ? 'live' : 'reconnecting'; draw(); });
  setInterval(draw, 5000); draw();
  extra.append(panel('Live feed', el('p', {}, 'New orders arrive by themselves while this is connected.'), line));
}

// Allergens: the list products tick from (D-062). The same editor as in the product screen.
{
  const manager = el('div', { className: 'allergen-manager' });
  extra.append(panel('Allergens', el('p', { className: 'reminder' }, LEGAL_REMINDER), manager));
  await mountAllergenManager(manager);
}
