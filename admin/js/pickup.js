// Pickup (Step 4c): weekly pattern, time step, exceptions, and a preview of what customers will see (D-038, D-047).
import { api } from './shell.js';
import { PREVIEW_DAYS } from './admin-config.js';
import { addDays, shortDate } from './dates.js';
import { actionBar, el, feedback, field, makeSwitch, saving } from './dom.js';
import { WEEKDAYS } from '../../js/admin-rules.js';
import { getPickupOptions } from '../../js/pickup.js';
import { ukToday } from '../../js/mock-backend.js';

const root = document.querySelector('[data-pickup]');
const previewBox = document.querySelector('[data-preview]');
let state = { rules: [], exceptions: [] };

const panel = (title, ...kids) => el('section', { className: 'panel' }, el('h2', {}, title), ...kids);
function actionRow(label, work, { secondary = false, small = false } = {}) {
  const row = el('div', { className: 'btn-row' });
  const button = el('button', { type: 'button', className: `btn${secondary ? ' btn-secondary' : ''}${small ? ' btn-small' : ''}` }, label);
  row.append(button);
  const fb = feedback(row);
  button.addEventListener('click', () => saving(button, fb, work));
  return row;
}
const reload = async () => { state = await api.getPickup(); draw(); await drawPreview(); };

// ---------- weekly pattern ----------
function ruleRow(rule) {
  const day = field('Day', 'select', { value: String(rule.weekday ?? 6) }, WEEKDAYS.map((d, i) => [String(i), d]));
  const start = field('From', 'time', { value: rule.start_time || '10:00' });
  const end = field('To', 'time', { value: rule.end_time || '18:00' });
  const on = makeSwitch('In use', rule.active !== false);
  const row = el('div', { className: 'group-card' }, el('div', { className: 'form-grid' }, day.wrap, start.wrap, end.wrap), on.row);
  const save = { label: rule.id ? 'Save' : 'Add this day', work: async () => {
    await api.saveRule({ id: rule.id, weekday: Number(day.control.value), start_time: start.control.value, end_time: end.control.value, slot_minutes: rule.slot_minutes ?? state.rules[0]?.slot_minutes ?? 1, active: on.get() });
    await reload();
  } };
  const remove = { label: 'Delete', secondary: true, work: async () => { if (!window.confirm('Delete this opening time?')) return; await api.deleteRule(rule.id); await reload(); } };
  row.append(actionBar(rule.id ? [save, remove] : [save])); // Save and Delete side by side
  return row;
}

// ---------- exceptions ----------
const describeException = (e) => `${shortDate(e.date, true)}: ${e.kind === 'extra' ? `extra opening ${e.start_time} to ${e.end_time}` : e.start_time ? `closed ${e.start_time} to ${e.end_time}` : 'closed all day'}${e.note ? ` (${e.note})` : ''}`;
function exceptionForm() {
  const date = field('Date', 'date', {});
  const kind = field('What', 'select', { value: 'closed-all' }, [['closed-all', 'Closed all day'], ['closed-part', 'Closed for part of the day'], ['extra', 'Extra opening']]);
  const start = field('From', 'time', { value: '10:00' });
  const end = field('To', 'time', { value: '18:00' });
  const note = field('Note (optional)', 'text', { maxLength: 200 });
  const times = el('div', { className: 'form-grid', hidden: true }, start.wrap, end.wrap);
  kind.control.addEventListener('change', () => { times.hidden = kind.control.value === 'closed-all'; });
  const box = el('div', { className: 'group-card' }, el('h3', {}, 'Add a date'), date.wrap, kind.wrap, times, note.wrap);
  box.append(actionRow('Add date', async () => {
    const k = kind.control.value;
    await api.saveException({ date: date.control.value, kind: k === 'extra' ? 'extra' : 'closed', start_time: k === 'closed-all' ? null : start.control.value, end_time: k === 'closed-all' ? null : end.control.value, slot_minutes: state.rules[0]?.slot_minutes ?? 1, note: note.control.value });
    await reload();
  }));
  return box;
}

function draw() {
  root.replaceChildren();
  const rules = el('div');
  state.rules.forEach((r) => rules.append(ruleRow(r)));
  rules.append(el('details', { className: 'add-rule' }, el('summary', {}, 'Add another day'), ruleRow({})));
  root.append(panel('Weekly pattern', el('p', { className: 'muted' }, 'The days and hours customers can collect. A day with no row is closed.'), rules));

  const step = field('Time step (minutes)', 'number', { value: state.rules[0]?.slot_minutes ?? 1, min: 1, max: 240, inputMode: 'numeric', hint: '1 means customers can pick any minute inside your hours. 15 means 10:00, 10:15, 10:30 and so on.' });
  root.append(panel('Time step', step.wrap, actionRow('Save time step', async () => { await api.setSlotMinutes(Number(step.control.value)); await reload(); })));

  const list = el('div');
  if (!state.exceptions.length) list.append(el('p', { className: 'muted' }, 'No special dates.'));
  for (const e of state.exceptions) {
    list.append(el('div', { className: 'order-foot' }, el('span', { className: 'order-total' }, describeException(e)), actionRow('Delete', async () => { await api.deleteException(e.id); await reload(); }, { secondary: true, small: true })));
  }
  root.append(panel('Special dates', el('p', { className: 'muted' }, 'Close a day, close part of a day, or open an extra day.'), list, exceptionForm()));
}

// ---------- preview: what customers will see ----------
async function drawPreview() {
  const settings = await api.getSettings();
  const today = ukToday();
  const last = addDays(today, PREVIEW_DAYS - 1);
  const full = new Set(await api.fullDates(today, last));
  const config = { settings: { min_lead_hours: settings.min_lead_hours ?? 24, max_days_ahead: settings.max_days_ahead ?? 14 }, rules: state.rules, exceptions: state.exceptions };
  const offered = new Map(getPickupOptions(config, new Date()).map((o) => [o.date, o]));
  previewBox.replaceChildren(el('h2', {}, 'What customers will see'), el('p', { className: 'muted' }, `The next ${PREVIEW_DAYS} days, with your notice period (${settings.min_lead_hours ?? 24} hours) applied.`));
  const list = el('ul', { className: 'preview-days' });
  for (let i = 0; i < PREVIEW_DAYS; i++) {
    const date = addDays(today, i);
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    const closed = state.exceptions.some((e) => e.date === date && e.kind === 'closed' && !e.start_time);
    const hasRule = state.rules.some((r) => r.active && r.weekday === weekday) || state.exceptions.some((e) => e.date === date && e.kind === 'extra');
    const o = offered.get(date);
    let text; let tag;
    if (closed) { text = 'Closed'; tag = 'Closed'; }
    else if (full.has(date)) { text = 'Full: the daily order limit is reached'; tag = 'Full'; }
    else if (o) { text = `${o.times[0].value} to ${o.times[o.times.length - 1].end}`; tag = 'Open'; }
    else if (hasRule) { text = 'Too soon: inside the notice period'; tag = 'Too soon'; }
    else { text = 'No pickup'; tag = 'No pickup'; }
    list.append(el('li', {}, el('strong', {}, shortDate(date, true)), el('span', { className: 'tag' }, tag), el('span', { className: 'muted' }, text)));
  }
  previewBox.append(list);
}

state = await api.getPickup();
draw();
await drawPreview();
