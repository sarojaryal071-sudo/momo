// An option group as a form (name, one or several choices, the options with price, standard, shown, order). Used by the Options screen and by
// "Create new group" in the product editor. Prices are shown in pounds and stored in pence.
import { el, field } from './dom.js';
import { penceToPounds, poundsToPence } from '../../js/admin-rules.js';

const clone = (x) => JSON.parse(JSON.stringify(x));

// group: { id?, name, kind, active, options: [{ id?, label, price_delta_pence, is_default, active }] }. onChange runs on every edit.
export function groupForm(group, { onChange } = {}) {
  const g = clone(group);
  g.options ??= [];
  const touch = () => onChange?.();
  const name = field('Group name', 'text', { value: g.name ?? '', maxLength: 60, hint: 'For example "Spice level" or "Leave out".' });
  const kind = field('Customers can choose', 'select', { value: g.kind ?? 'single' }, [['single', 'One option'], ['multiple', 'Any number of options']]);
  name.control.addEventListener('input', () => { g.name = name.control.value; touch(); });
  kind.control.addEventListener('change', () => {
    g.kind = kind.control.value;
    if (g.kind === 'single') { let seen = false; g.options.forEach((o) => { if (o.is_default && seen) o.is_default = false; seen ||= o.is_default; }); }
    drawRows(); touch();
  });
  g.kind ??= 'single';
  const rows = el('div', { className: 'option-rows' });
  function drawRows() {
    rows.replaceChildren(...g.options.map((o, i) => {
      const oname = el('input', { type: 'text', value: o.label ?? '', maxLength: 60, 'aria-label': 'Choice name', oninput: () => { o.label = oname.value; touch(); } });
      const oprice = el('input', { type: 'text', value: penceToPounds(o.price_delta_pence || 0), inputMode: 'decimal', 'aria-label': 'Price change in pounds', oninput: () => { const v = poundsToPence(oprice.value || '0'); o.price_delta_pence = v === null ? -1 : v; touch(); } });
      const odef = el('input', { type: g.kind === 'single' ? 'radio' : 'checkbox', name: `std-${Math.random()}`, checked: Boolean(o.is_default), 'aria-label': 'Standard choice', onchange: () => { if (g.kind === 'single') g.options.forEach((x) => { x.is_default = false; }); o.is_default = odef.checked; touch(); } });
      const oact = el('input', { type: 'checkbox', checked: o.active !== false, 'aria-label': 'Shown', onchange: () => { o.active = oact.checked; touch(); } });
      const swap = (d) => () => { const j = i + d; [g.options[i], g.options[j]] = [g.options[j], g.options[i]]; drawRows(); touch(); };
      return el('div', { className: 'option-row' }, el('label', {}, 'Choice', oname), el('label', {}, 'Price change £', oprice), el('label', { className: 'check' }, odef, ' Standard'), el('label', { className: 'check' }, oact, ' Shown'),
        el('div', { className: 'btn-row' },
          el('button', { type: 'button', className: 'btn btn-secondary btn-small', disabled: i === 0, 'aria-label': `Move ${o.label || 'choice'} up`, onclick: swap(-1) }, '↑'),
          el('button', { type: 'button', className: 'btn btn-secondary btn-small', disabled: i === g.options.length - 1, 'aria-label': `Move ${o.label || 'choice'} down`, onclick: swap(1) }, '↓'),
          el('button', { type: 'button', className: 'btn btn-secondary btn-small', 'aria-label': `Remove choice ${o.label}`, onclick: () => { g.options.splice(i, 1); drawRows(); touch(); } }, 'Remove')));
    }));
    if (!g.options.length) rows.append(el('p', { className: 'muted' }, 'No choices yet. Add the first one.'));
  }
  drawRows();
  const add = el('button', { type: 'button', className: 'btn btn-secondary btn-small', onclick: () => { g.options.push({ id: null, label: '', price_delta_pence: 0, is_default: g.kind === 'single' && !g.options.some((o) => o.is_default), active: true }); drawRows(); touch(); rows.querySelector('.option-row:last-child input')?.focus(); } }, 'Add a choice');
  const node = el('div', { className: 'group-form' }, name.wrap, kind.wrap, rows, el('div', { className: 'btn-row' }, add));
  return { node, get: () => ({ id: g.id, name: g.name ?? '', kind: g.kind, active: g.active !== false, options: clone(g.options) }), nameField: name.control };
}

// One-line summary of a group's options: "Mild (standard), Medium, Hot +£0.50".
export const optionSummary = (g) => (g.options || []).filter((o) => o.active !== false).map((o) => `${o.label}${o.is_default ? ' (standard)' : ''}${o.price_delta_pence > 0 ? ` +£${penceToPounds(o.price_delta_pence)}` : ''}`).join(', ') || 'No choices yet';
