// The allergen list as an editor (D-062): add, rename, reorder and delete. Used in the product editor and under Settings.
// Nothing about allergens is hard-coded here: the list comes from the database.
import { api } from './api.js';
import { confirmDialog, el, feedback, saving, toast } from './dom.js';
import { ALLERGEN_NAME_MAX } from '../../js/admin-rules.js';

export const LEGAL_REMINDER = 'UK law requires the 14 main allergens to be declared. Keep them in this list and tick every one that applies to this product.';

export async function mountAllergenManager(container, { onChange } = {}) {
  async function draw() {
    const list = await api.listAllergens();
    container.replaceChildren();
    list.forEach((a, i) => {
      const input = el('input', { type: 'text', value: a.name, maxLength: ALLERGEN_NAME_MAX, 'aria-label': `Name of allergen ${i + 1}` });
      const row = el('div', { className: 'allergen-row' }, input);
      const actions = el('div', { className: 'btn-row' });
      const save = el('button', { type: 'button', className: 'btn btn-small' }, 'Save');
      const fb = feedback(actions);
      const rename = () => saving(save, fb, async () => { await api.saveAllergen({ id: a.id, name: input.value }); await draw(); onChange?.(); });
      save.addEventListener('click', rename);
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); rename(); } });
      const move = (dir) => async () => { const ids = list.map((x) => x.id); const j = i + dir; [ids[i], ids[j]] = [ids[j], ids[i]]; await api.reorderAllergens(ids); await draw(); onChange?.(); };
      const del = el('button', { type: 'button', className: 'btn btn-danger btn-small' }, 'Delete');
      del.addEventListener('click', async () => {
        let used = 0;
        try { used = await api.allergenUsage(a.id); } catch (e) { toast(e.message); return; }
        const message = `${used ? `${used} product${used === 1 ? ' uses' : 's use'} this allergen. It will be removed from ${used === 1 ? 'it' : 'them'}.` : 'No product uses it.'} ${LEGAL_REMINDER.split('. ')[0]}.`;
        if (!(await confirmDialog({ title: `Delete "${a.name}"?`, message, confirmLabel: 'Delete allergen', danger: true }))) return;
        try { await api.deleteAllergen(a.id); toast(`"${a.name}" was deleted.`, { seconds: 4 }); await draw(); onChange?.(); } catch (e) { toast(e.message); }
      });
      actions.prepend(save,
        el('button', { type: 'button', className: 'btn btn-secondary btn-small', disabled: i === 0, 'aria-label': `Move ${a.name} up`, onclick: move(-1) }, '↑'),
        el('button', { type: 'button', className: 'btn btn-secondary btn-small', disabled: i === list.length - 1, 'aria-label': `Move ${a.name} down`, onclick: move(1) }, '↓'), del);
      row.append(actions);
      container.append(row);
    });
    // add one
    const newInput = el('input', { type: 'text', maxLength: ALLERGEN_NAME_MAX, placeholder: 'New allergen', 'aria-label': 'New allergen name' });
    const addRow = el('div', { className: 'allergen-row allergen-add' }, newInput);
    const addActions = el('div', { className: 'btn-row' });
    const add = el('button', { type: 'button', className: 'btn btn-small' }, 'Add allergen');
    const afb = feedback(addActions);
    const doAdd = () => saving(add, afb, async () => { await api.saveAllergen({ name: newInput.value }); await draw(); onChange?.(); }, 'Added');
    add.addEventListener('click', doAdd);
    newInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); doAdd(); } });
    addActions.prepend(add);
    addRow.append(addActions);
    container.append(addRow);
  }
  await draw();
}
