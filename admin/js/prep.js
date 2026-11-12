import { api } from './shell.js';
import { PREP_DEFAULT_OFFSET_DAYS } from './admin-config.js';
import { dateLabel } from '../../js/pickup.js';
import { ukToday } from '../../js/mock-backend.js';

const out = document.querySelector('[data-prep]');
const from = document.querySelector('[data-from]');
const to = document.querySelector('[data-to]');
const el = (tag, props = {}, ...kids) => { const n = Object.assign(document.createElement(tag), props); n.append(...kids.filter((k) => k != null)); return n; };

function addDays(iso, n) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
from.value = addDays(ukToday(), PREP_DEFAULT_OFFSET_DAYS);

function table(caption, rows) {
  const t = el('table', { className: 'prep-table' }, el('caption', { className: 'visually-hidden' }, caption));
  t.append(el('tbody', {}, ...rows.map(([a, b]) => el('tr', {}, el('td', {}, a), el('td', {}, String(b))))));
  return t;
}

async function render() {
  const start = from.value;
  const end = to.value && to.value >= start ? to.value : start;
  out.replaceChildren();
  if (!start) { out.append(el('p', {}, 'Pick a pickup date.')); return; }
  const prep = await api.prepList(start, end);
  const range = end === start ? dateLabel(start) : `${dateLabel(start)} to ${dateLabel(end)}`;
  out.append(el('h2', {}, range));
  if (!prep.orders) { out.append(el('p', {}, 'No orders to prepare for this date. Cancelled orders are left out.')); return; }
  out.append(el('p', {}, `${prep.orders} order${prep.orders === 1 ? '' : 's'} to prepare. Cancelled orders are left out.`));
  const custom = prep.products.reduce((n, p) => n + p.customisedQty, 0);
  const options = prep.options.map((o) => `${o.label} ×${o.qty}`).join(', ');
  const summary = [...prep.products.map((p) => `${p.name} ×${p.qty}`), custom ? `Customised ×${custom}${options ? `: ${options}` : ''}` : null].filter(Boolean).join(', ');
  out.append(el('p', { className: 'prep-summary' }, summary));
  out.append(el('h3', {}, 'Totals per product'), table('Totals per product', prep.products.map((p) => [`${p.name}${p.unit_label ? ` (${p.unit_label})` : ''}${p.customisedQty ? ` · ${p.customisedQty} customised` : ''}`, p.qty])));
  if (prep.options.length) out.append(el('h3', {}, 'Totals per option'), table('Totals per option', prep.options.map((o) => [`${o.label} (${o.product})`, o.qty])));
  if (prep.customised.length) {
    out.append(el('h3', {}, 'Customised lines'));
    out.append(el('ul', {}, ...prep.customised.map((c) => el('li', {}, `${c.order_number}, ${c.name}: ${c.qty} × ${c.product}${c.options.length ? ` (${c.options.join(', ')})` : ''}${c.pickup_date !== start || end !== start ? `, ${dateLabel(c.pickup_date)}${c.pickup_time ? ` ${c.pickup_time}` : ''}` : c.pickup_time ? `, ${c.pickup_time}` : ''}`))));
  }
}

from.addEventListener('change', render);
to.addEventListener('change', render);
document.querySelector('[data-print]').addEventListener('click', () => window.print());
api.onChange(render);
await render();
