import { api } from './shell.js';
import { PREP_DAY_CHIPS, PREP_DEFAULT_OFFSET_DAYS } from './admin-config.js';
import { addDays, shortDate } from './dates.js';
import { ukToday } from '../../js/mock-backend.js';

const out = document.querySelector('[data-prep]');
const chips = document.querySelector('[data-day-chips]');
const from = document.querySelector('[data-from]');
const to = document.querySelector('[data-to]');
const el = (tag, props = {}, ...kids) => { const n = Object.assign(document.createElement(tag), props); n.append(...kids.filter((k) => k != null)); return n; };

let start = null;
let end = null;

async function ordersByDay() {
  const counts = new Map();
  for (const o of await api.listOrders({})) if (o.pickup_date && o.status !== 'cancelled') counts.set(o.pickup_date, (counts.get(o.pickup_date) || 0) + 1);
  return counts;
}

async function drawChips(counts) {
  const today = ukToday();
  chips.replaceChildren();
  for (let i = 0; i < PREP_DAY_CHIPS; i++) {
    const day = addDays(today, i);
    const n = counts.get(day) || 0;
    const b = el('button', { type: 'button', className: 'chip' }, i === 0 ? 'Today' : shortDate(day).replace(/ [A-Z][a-z]+$/, ''), n ? el('small', {}, ` · ${n}`) : null);
    b.dataset.day = day;
    b.setAttribute('aria-pressed', String(!to.value && start === day && end === day));
    b.setAttribute('aria-label', `${shortDate(day, true)}, ${n} order${n === 1 ? '' : 's'}`);
    b.addEventListener('click', () => { start = end = day; from.value = day; to.value = ''; render(); });
    chips.append(b);
  }
}

async function render() {
  const counts = await ordersByDay();
  await drawChips(counts);
  out.replaceChildren();
  if (!start) { out.append(el('p', { className: 'muted' }, 'Pick a pickup day.')); return; }
  const prep = await api.prepList(start, end);
  const range = end === start ? shortDate(start, true) : `${shortDate(start, true)} to ${shortDate(end, true)}`;
  out.append(el('h2', { className: 'prep-day' }, range));
  if (!prep.orders) {
    const next = [...counts.keys()].filter((d) => d > end).sort()[0];
    out.append(el('p', { className: 'muted empty-state' }, next ? `Nothing to prepare for this day. The next day with orders is ${shortDate(next, true)}.` : 'Nothing to prepare for this day, and no later orders yet.'));
    return;
  }
  out.append(el('p', { className: 'muted' }, `${prep.orders} order${prep.orders === 1 ? '' : 's'}. Cancelled orders are left out.`));
  for (const p of prep.products) {
    out.append(el('div', { className: 'prep-product' }, el('strong', {}, p.name, p.unit_label ? el('span', { className: 'muted' }, ` (${p.unit_label})`) : null), el('span', { className: 'prep-qty' }, `×${p.qty}`)));
    const opts = prep.options.filter((o) => o.slug === p.slug);
    if (opts.length) out.append(el('ul', { className: 'prep-options' }, ...opts.map((o) => el('li', {}, el('span', {}, o.label), el('span', {}, `×${o.qty}`)))));
  }
  if (prep.customised.length) {
    out.append(el('h3', { className: 'prep-day' }, 'Customised orders'));
    out.append(el('ul', { className: 'prep-custom' }, ...prep.customised.map((c) => el('li', {}, `${c.order_number}, ${c.name}: ${c.qty} × ${c.product}${c.options.length ? ` (${c.options.join(', ')})` : ''}${end !== start ? `, ${shortDate(c.pickup_date)}` : ''}${c.pickup_time ? ` ${c.pickup_time}` : ''}`))));
  }
}

function fromFields() { start = from.value || null; end = to.value && to.value >= start ? to.value : start; render(); }
from.addEventListener('change', fromFields);
to.addEventListener('change', fromFields);
document.querySelector('[data-print]').addEventListener('click', () => window.print());
api.onChange(render);

// Opens on the first of the next days that has orders, otherwise tomorrow.
const counts = await ordersByDay();
const today = ukToday();
let first = addDays(today, PREP_DEFAULT_OFFSET_DAYS);
for (let i = 0; i < PREP_DAY_CHIPS; i++) { const d = addDays(today, i); if (counts.get(d)) { first = d; break; } }
start = end = first; from.value = first;
await render();
