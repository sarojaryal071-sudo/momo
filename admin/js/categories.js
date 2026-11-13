// Categories (Step 4l): group products; each category can carry option groups that apply to all of its products.
import { api } from './shell.js';
import { backToProducts } from './manage.js';
import { confirmDialog, el, feedback, saving, toast } from './dom.js';

const root = document.querySelector('[data-root]');
let cats = []; let library = [];

async function load() { [cats, library] = await Promise.all([api.listCategories(), api.listLibrary()]); }

function row(c, i) {
  const input = el('input', { type: 'text', value: c.name, maxLength: 60, 'aria-label': `Name of category ${i + 1}` });
  const actions = el('div', { className: 'btn-row' });
  const save = el('button', { type: 'button', className: 'btn btn-small' }, 'Rename');
  const fb = feedback(actions);
  const rename = () => saving(save, fb, async () => { await api.saveCategory({ id: c.id, name: input.value }); await draw(); });
  save.addEventListener('click', rename);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); rename(); } });
  const move = (d) => async () => { const ids = cats.map((x) => x.id); const j = i + d; [ids[i], ids[j]] = [ids[j], ids[i]]; await api.reorderCategories(ids); await draw(); };
  const del = el('button', { type: 'button', className: 'btn btn-danger btn-small' }, 'Delete');
  del.addEventListener('click', async () => {
    const message = c.product_count ? `${c.product_count} product${c.product_count === 1 ? ' is' : 's are'} in this category. They will have no category afterwards. Nothing else is deleted.` : 'No product is in this category.';
    if (!(await confirmDialog({ title: `Delete "${c.name}"?`, message, confirmLabel: 'Delete category', danger: true }))) return;
    try { const moved = await api.deleteCategory(c.id); toast(moved ? `"${c.name}" was deleted. ${moved} product${moved === 1 ? '' : 's'} now ${moved === 1 ? 'has' : 'have'} no category.` : `"${c.name}" was deleted.`, { seconds: 5 }); await draw(); } catch (e) { toast(e.message); }
  });
  actions.prepend(save,
    el('button', { type: 'button', className: 'btn btn-secondary btn-small', disabled: i === 0, 'aria-label': `Move ${c.name} up`, onclick: move(-1) }, '↑'),
    el('button', { type: 'button', className: 'btn btn-secondary btn-small', disabled: i === cats.length - 1, 'aria-label': `Move ${c.name} down`, onclick: move(1) }, '↓'), del);
  const groups = library.filter((g) => c.group_ids.includes(g.id));
  return el('article', { className: 'panel category-row' }, input,
    el('p', { className: 'muted' }, `${c.product_count} product${c.product_count === 1 ? '' : 's'}`),
    el('p', { className: 'muted' }, groups.length ? `Option groups: ${groups.map((g) => g.name).join(', ')}. ` : 'No option groups apply to it yet. ', el('a', { href: 'options' }, 'Manage options')),
    actions);
}

async function draw() {
  await load();
  const name = el('input', { type: 'text', maxLength: 60, placeholder: 'For example Momo or Sauces', 'aria-label': 'New category name' });
  const addRow = el('div', { className: 'btn-row' }); const fb = feedback(addRow);
  const add = el('button', { type: 'button', className: 'btn' }, 'Add category');
  const doAdd = () => saving(add, fb, async () => { await api.saveCategory({ name: name.value }); name.value = ''; await draw(); });
  add.addEventListener('click', doAdd);
  name.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); doAdd(); } });
  addRow.prepend(add);
  root.replaceChildren(backToProducts(), el('div', { className: 'title-row' }, el('h1', {}, 'Categories')),
    el('p', { className: 'muted' }, 'Categories group your products in the admin and in the shop. An option group applied to a category appears on every product in it.'),
    el('section', { className: 'panel' }, el('h2', {}, 'New category'), el('div', { className: 'field' }, el('label', {}, 'Name', name)), addRow),
    ...(cats.length ? cats.map(row) : [el('p', { className: 'muted empty-state' }, 'No categories yet. Add the first one above.')]));
}
await draw();
