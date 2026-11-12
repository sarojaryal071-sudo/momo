// Manual orders (Step 4c): orders that came by phone or Instagram. Calls the same database function rules as the website
// (create_manual_order): it takes stock and the next order number, and the order shows in the list marked "Manual".
import { api } from './shell.js';
import { el, feedback, field } from './dom.js';
import { formatMoney } from '../../js/admin-rules.js';

const root = document.querySelector('[data-form-root]');
const products = (await api.listProducts()).filter((p) => p.active && p.available && p.price_pence != null);
const lines = [];

const name = field('Name', 'text', { maxLength: 80, required: true });
const phone = field('Phone (optional)', 'tel', { maxLength: 20 });
const date = field('Pickup date (optional)', 'date', {});
const time = field('Pickup time (optional)', 'time', {});
const notes = field('Notes (optional)', 'textarea', { rows: 2, maxLength: 500 });

// ----- add an item -----
const productSelect = field('Item', 'select', {}, products.map((p) => [p.id, `${p.name}${p.unit_label ? ` (${p.unit_label})` : ''} - ${formatMoney(p.price_pence)}`]));
const qty = field('How many', 'number', { value: 1, min: 1, max: 100, inputMode: 'numeric' });
const optionsBox = el('div');
let choices = {};
function drawOptions() {
  optionsBox.replaceChildren(); choices = {};
  const p = products.find((x) => x.id === productSelect.control.value);
  for (const g of (p?.option_groups || []).filter((x) => x.active && x.options.some((o) => o.active))) {
    const active = g.options.filter((o) => o.active);
    const legend = el('legend', {}, `${g.label} (${g.kind === 'single' ? 'choose one' : 'choose any'})`);
    const set = el('fieldset', { className: 'choice-set' }, legend);
    active.forEach((o) => {
      const input = el('input', { type: g.kind === 'single' ? 'radio' : 'checkbox', name: `g-${g.id}`, value: o.id, checked: g.kind === 'single' && o.is_default });
      choices[o.id] = { input, option: o };
      set.append(el('label', { className: 'check' }, input, ` ${o.label}${o.price_delta_pence ? ` +${formatMoney(o.price_delta_pence)}` : ''}${o.is_default ? ' (standard)' : ''}`));
    });
    optionsBox.append(set);
  }
}
productSelect.control.addEventListener('change', drawOptions);
drawOptions();

const linesBox = el('div');
const totalBox = el('p', { className: 'order-total' });
function drawLines() {
  linesBox.replaceChildren();
  if (!lines.length) linesBox.append(el('p', { className: 'muted' }, 'No items yet.'));
  lines.forEach((l, i) => linesBox.append(el('div', { className: 'order-foot' },
    el('span', { className: 'order-total' }, `${l.qty} × ${l.product.name}${l.optionLabels.length ? ` (${l.optionLabels.join(', ')})` : ''}`),
    el('span', {}, formatMoney(l.unit * l.qty)),
    el('button', { type: 'button', className: 'btn btn-secondary btn-small', 'aria-label': `Remove ${l.product.name}`, onclick: () => { lines.splice(i, 1); drawLines(); } }, 'Remove'))));
  totalBox.textContent = lines.length ? `Total ${formatMoney(lines.reduce((s, l) => s + l.unit * l.qty, 0))}` : '';
}
const addFb = el('div', { className: 'btn-row' });
const addMsg = feedback(addFb);
const addButton = el('button', { type: 'button', className: 'btn btn-secondary' }, 'Add item');
addButton.addEventListener('click', () => {
  addMsg.clear();
  const p = products.find((x) => x.id === productSelect.control.value);
  const n = Math.floor(Number(qty.control.value));
  if (!p) return addMsg.error('Choose an item.');
  if (!(n >= 1 && n <= 100)) return addMsg.error('Enter how many, from 1 to 100.');
  const chosen = Object.values(choices).filter((c) => c.input.checked).map((c) => c.option);
  lines.push({ product: p, qty: n, optionIds: chosen.filter((o) => !o.is_default).map((o) => o.id), optionLabels: chosen.filter((o) => !o.is_default).map((o) => o.label), unit: p.price_pence + chosen.reduce((s, o) => s + o.price_delta_pence, 0) });
  qty.control.value = 1; drawOptions(); drawLines();
});
drawLines();

// ----- save -----
const saveFb = el('div', { className: 'btn-row' });
const saveMsg = feedback(saveFb);
const saveButton = el('button', { type: 'button', className: 'btn btn-big' }, 'Save order');
const done = el('section', { className: 'panel', hidden: true, role: 'status' });
saveButton.addEventListener('click', async () => {
  saveMsg.clear();
  if (!name.control.value.trim()) return saveMsg.error('Enter the customer\'s name.');
  if (!lines.length) return saveMsg.error('Add at least one item.');
  saveButton.disabled = true;
  try {
    const result = await api.createManualOrder({
      items: lines.map((l) => ({ slug: l.product.slug, qty: l.qty, options: l.optionIds })),
      name: name.control.value.trim(), phone: phone.control.value.trim(), notes: notes.control.value.trim(),
      pickupDate: date.control.value || '', pickupTime: date.control.value ? time.control.value || '' : '',
    });
    done.hidden = false; done.replaceChildren(el('h2', {}, `Order ${result.order_number} saved`), el('p', {}, 'It is in the Orders list marked "Manual", and stock was taken like any order.'),
      el('div', { className: 'btn-row' }, el('a', { className: 'btn', href: 'orders.html' }, 'Back to orders'), el('button', { type: 'button', className: 'btn btn-secondary', onclick: () => location.reload() }, 'Add another')));
    done.scrollIntoView({ block: 'nearest' });
    saveButton.hidden = true;
  } catch (e) { saveMsg.error(e.message); saveButton.disabled = false; }
});
saveFb.prepend(saveButton);

root.append(
  el('p', {}, 'Use this for orders that came by phone or Instagram.'),
  el('section', { className: 'panel' }, el('h2', {}, 'Customer'), name.wrap, phone.wrap, el('div', { className: 'form-grid' }, date.wrap, time.wrap), notes.wrap),
  el('section', { className: 'panel' }, el('h2', {}, 'Items'), linesBox, totalBox),
  el('section', { className: 'panel' }, el('h2', {}, 'Add an item'), productSelect.wrap, qty.wrap, optionsBox, addFb, addButton),
  saveFb, done);
