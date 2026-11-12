// Pickup (Steps 4c and 4h): weekly hours as day chips plus shared windows (D-063), time step, date exceptions, and a preview (D-038, D-047).
import { api } from './shell.js';
import { PREVIEW_DAYS } from './admin-config.js';
import { addDays, shortDate } from './dates.js';
import { actionBar, confirmDialog, el, feedback, field, saving, toast } from './dom.js';
import { DAY_SHORT, WEEKDAYS, WEEK_ORDER, flattenWeek, groupWeek, validateWeek, weekSummary } from '../../js/admin-rules.js';
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

// ---------- weekly hours (D-063) ----------
let week = groupWeek([]);
let savedSnapshot = '';
let dirty = false;
const snapshot = () => JSON.stringify(flattenWeek(week));
const markDirty = () => { dirty = snapshot() !== savedSnapshot; window.onbeforeunload = dirty ? () => '' : null; if (summaryLine) summaryLine.textContent = weekSummary(week); };
let summaryLine = null;
const errorBox = el('p', { className: 'field-error', role: 'alert' });

// One list of windows: each row From - To with a remove button, plus "Add another window".
function windowsEditor(list, who) {
  const box = el('div', { className: 'windows' });
  const rows = el('div');
  const drawRows = () => {
    rows.replaceChildren(...list.map((w, i) => {
      const start = el('input', { type: 'time', value: w.start, 'aria-label': `${who} window ${i + 1} from`, oninput: () => { w.start = start.value; markDirty(); } });
      const end = el('input', { type: 'time', value: w.end, 'aria-label': `${who} window ${i + 1} to`, oninput: () => { w.end = end.value; markDirty(); } });
      return el('div', { className: 'window-row' }, el('label', {}, 'From', start), el('span', { className: 'window-dash', 'aria-hidden': 'true' }, '–'), el('label', {}, 'To', end),
        el('button', { type: 'button', className: 'btn btn-secondary btn-small', 'aria-label': `Remove ${who} window ${i + 1}`, onclick: () => { list.splice(i, 1); drawRows(); markDirty(); } }, 'Remove'));
    }));
  };
  drawRows();
  const add = el('button', { type: 'button', className: 'btn btn-secondary btn-small', onclick: () => {
    const last = list[list.length - 1];
    const [h, m] = (last?.end || '16:00').split(':').map(Number);
    list.push({ start: last?.end || '16:00', end: `${String(Math.min(h + 3, 23)).padStart(2, '0')}:${String(h + 3 > 23 ? 59 : m).padStart(2, '0')}` });
    drawRows(); markDirty();
  } }, 'Add another window');
  box.append(rows, el('div', { className: 'btn-row' }, add));
  return box;
}

function drawWeek(container) {
  container.replaceChildren();
  // day chips: tap to open or close a day
  const chips = el('div', { className: 'day-chips', role: 'group', 'aria-label': 'Open days' });
  for (const d of WEEK_ORDER) {
    const open = week.open.has(d);
    const chip = el('button', { type: 'button', className: 'chip day-chip', 'aria-pressed': String(open), 'aria-label': `${WEEKDAYS[d]}, ${open ? 'open' : 'closed'}` }, DAY_SHORT[d]);
    chip.addEventListener('click', () => { if (week.open.has(d)) { week.open.delete(d); delete week.custom[d]; } else week.open.add(d); markDirty(); drawWeek(container); });
    chips.append(chip);
  }
  container.append(el('p', { className: 'muted' }, 'Tap a day to open or close it.'), chips);
  container.append(el('h3', {}, 'Opening windows'), el('p', { className: 'muted' }, 'These hours apply to every open day, unless a day has different hours below.'), windowsEditor(week.shared, 'Shared'));
  // different hours for one day (kept out of the way until used)
  const customDays = WEEK_ORDER.filter((d) => week.open.has(d) && week.custom[d]);
  const candidates = WEEK_ORDER.filter((d) => week.open.has(d) && !week.custom[d]);
  const details = el('details', { className: 'custom-days', open: customDays.length > 0 }, el('summary', {}, 'Different hours for a day'));
  customDays.forEach((d) => {
    const editor = el('div', { hidden: true }, windowsEditor(week.custom[d], WEEKDAYS[d]));
    const line = el('p', { className: 'custom-line' }, el('strong', {}, `${DAY_SHORT[d]}: `), week.custom[d].map((w) => `${w.start} – ${w.end}`).join(', '));
    const edit = el('button', { type: 'button', className: 'btn btn-secondary btn-small', onclick: () => { editor.hidden = !editor.hidden; edit.textContent = editor.hidden ? 'Edit' : 'Done'; line.lastChild.textContent = week.custom[d].map((w) => `${w.start} – ${w.end}`).join(', '); } }, 'Edit');
    const remove = el('button', { type: 'button', className: 'btn btn-secondary btn-small', 'aria-label': `Use the shared hours on ${WEEKDAYS[d]}`, onclick: () => { delete week.custom[d]; markDirty(); drawWeek(container); } }, 'Remove');
    details.append(el('div', { className: 'group-card' }, line, el('div', { className: 'btn-row' }, edit, remove), editor));
  });
  if (candidates.length) {
    const pick = el('select', { 'aria-label': 'Day with different hours' }, ...candidates.map((d) => el('option', { value: String(d) }, WEEKDAYS[d])));
    const addDay = el('button', { type: 'button', className: 'btn btn-secondary btn-small', onclick: () => { week.custom[Number(pick.value)] = week.shared.map((w) => ({ ...w })); markDirty(); drawWeek(container); } }, 'Give this day its own hours');
    details.append(el('div', { className: 'btn-row custom-add' }, pick, addDay));
  } else if (!customDays.length) details.append(el('p', { className: 'muted' }, 'Open a day first.'));
  container.append(details);
  summaryLine = el('p', { className: 'week-summary', 'aria-live': 'polite' }, weekSummary(week));
  container.append(summaryLine, errorBox);
}

async function saveWeekNow(saveBtn, cancelBtn) {
  errorBox.textContent = '';
  const problem = validateWeek(week);
  if (problem) { errorBox.textContent = problem; errorBox.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
  if (!week.open.size && !(await confirmDialog({ title: 'Close all week?', message: 'Customers will not be able to choose a pickup day until you open a day again.', confirmLabel: 'Close all week', danger: true }))) return;
  saveBtn.disabled = true; cancelBtn.disabled = true; saveBtn.setAttribute('aria-busy', 'true'); saveBtn.textContent = 'Saving…';
  try {
    await api.saveWeek(flattenWeek(week));
    toast('Weekly hours saved.', { seconds: 4 });
    await reload();
  } catch (e) { errorBox.textContent = e.message; toast(e.message, { seconds: 8 }); }
  finally { saveBtn.disabled = false; cancelBtn.disabled = false; saveBtn.removeAttribute('aria-busy'); saveBtn.textContent = 'Save'; }
}

function draw() {
  root.replaceChildren();
  week = groupWeek(state.rules);
  savedSnapshot = snapshot(); dirty = false; window.onbeforeunload = null;
  const weekBox = el('div');
  drawWeek(weekBox);
  root.append(panel('Weekly hours', weekBox));

  const step = field('Time step (minutes)', 'number', { value: state.rules[0]?.slot_minutes ?? 1, min: 1, max: 240, inputMode: 'numeric', hint: '1 means customers can pick any minute inside your hours. 15 means 10:00, 10:15, 10:30 and so on.' });
  root.append(panel('Time step', step.wrap, actionRow('Save time step', async () => { await api.setSlotMinutes(Number(step.control.value)); await reload(); })));

  const list = el('div');
  if (!state.exceptions.length) list.append(el('p', { className: 'muted' }, 'No special dates.'));
  for (const e of state.exceptions) {
    list.append(el('div', { className: 'order-foot' }, el('span', { className: 'order-total' }, describeException(e)), actionRow('Delete', async () => { await api.deleteException(e.id); await reload(); }, { secondary: true, small: true })));
  }
  root.append(panel('Special dates', el('p', { className: 'muted' }, 'Close a day, close part of a day, or open an extra day.'), list, exceptionForm()));

  // one Save for the whole week, docked on the tab bar like the product editor
  const saveBtn = el('button', { type: 'button', className: 'btn' }, 'Save');
  const cancelBtn = el('button', { type: 'button', className: 'btn btn-secondary' }, 'Cancel');
  saveBtn.addEventListener('click', () => saveWeekNow(saveBtn, cancelBtn));
  cancelBtn.addEventListener('click', async () => {
    if (dirty && !(await confirmDialog({ title: 'Discard your changes?', message: 'The weekly hours you changed are not saved.', confirmLabel: 'Discard', cancelLabel: 'Keep editing', danger: true }))) return;
    draw();
  });
  root.append(el('div', { className: 'action-sticky' }, saveBtn, cancelBtn));
  document.body.classList.add('has-actionbar');
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
