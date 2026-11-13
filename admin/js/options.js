// Options (Step 4l): the library of reusable option groups. Build a group once, then apply it to whole categories or single products.
import { api } from './shell.js';
import { backTo, backToProducts, checklist } from './manage.js';
import { groupForm, optionSummary } from './option-editor.js';
import { confirmDialog, el, toast } from './dom.js';

const root = document.querySelector('[data-root]');
let library = []; let cats = []; let products = [];
let shown = null; let dirty = false; let ignoreHash = false;
const card = (title, ...kids) => el('section', { className: 'panel' }, title ? el('h2', {}, title) : null, ...kids);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

async function load() { [library, cats, products] = await Promise.all([api.listLibrary(), api.listCategories(), api.listProducts()]); }

function drawList() {
  dirty = false; window.onbeforeunload = null; document.body.classList.remove('has-actionbar'); shown = null;
  const move = (i, d) => async () => { const ids = library.map((g) => g.id); const j = i + d; [ids[i], ids[j]] = [ids[j], ids[i]]; await api.reorderLibrary(ids); await refresh(); };
  const rows = library.map((g, i) => {
    const used = `Applies to ${plural(g.category_ids.length, 'category', 'categories')} and ${plural(g.product_ids.length, 'product', 'products')}`;
    const del = el('button', { type: 'button', className: 'btn btn-danger btn-small' }, 'Delete');
    del.addEventListener('click', async () => {
      const message = `${used}. ${g.category_ids.length || g.product_ids.length ? 'It will be removed from them. Orders already placed keep what they chose.' : 'Nothing uses it.'}`;
      if (!(await confirmDialog({ title: `Delete "${g.name}"?`, message, confirmLabel: 'Delete group', danger: true }))) return;
      try { await api.deleteLibraryGroup(g.id); toast(`"${g.name}" was deleted.`, { seconds: 4 }); await refresh(); } catch (e) { toast(e.message); }
    });
    return el('article', { className: 'panel category-row' }, el('h3', {}, g.name, el('span', { className: 'tag' }, g.kind === 'single' ? 'Choose one' : 'Choose any')),
      el('p', { className: 'muted' }, optionSummary(g)), el('p', { className: 'muted' }, used),
      el('div', { className: 'btn-row' }, el('a', { className: 'btn btn-small', href: `#${g.id}` }, 'Edit'),
        el('button', { type: 'button', className: 'btn btn-secondary btn-small', disabled: i === 0, 'aria-label': `Move ${g.name} up`, onclick: move(i, -1) }, '↑'),
        el('button', { type: 'button', className: 'btn btn-secondary btn-small', disabled: i === library.length - 1, 'aria-label': `Move ${g.name} down`, onclick: move(i, 1) }, '↓'), del));
  });
  root.replaceChildren(backToProducts(), el('div', { className: 'title-row' }, el('h1', {}, 'Options'), el('a', { className: 'btn btn-small', href: '#new' }, 'New option group')),
    el('p', { className: 'muted' }, 'Build an option group once, like "Spice level", then apply it to whole categories or to single products. Customers see the same choices as before.'),
    ...(rows.length ? rows : [el('p', { className: 'muted empty-state' }, 'No option groups yet. Press New option group.')]));
}

function drawEdit(id) {
  const existing = id === 'new' ? null : library.find((g) => g.id === id);
  if (id !== 'new' && !existing) { location.hash = ''; return; }
  shown = id; dirty = false;
  const touch = () => { dirty = true; window.onbeforeunload = () => ''; };
  const form = groupForm(existing ?? { name: '', kind: 'single', options: [{ id: null, label: '', price_delta_pence: 0, is_default: true, active: true }] }, { onChange: touch });
  const catList = checklist({ title: 'Categories', items: cats.map((c) => ({ id: c.id, label: c.name })), selected: existing?.category_ids ?? [], onChange: touch });
  const prodList = checklist({ title: 'Products', items: products.map((p) => ({ id: p.id, label: p.name, group: p.category || undefined })), selected: existing?.product_ids ?? [], onChange: touch, groupButtons: true });
  const problem = el('p', { className: 'field-error', role: 'alert' });
  const save = el('button', { type: 'button', className: 'btn' }, 'Save');
  const cancel = el('button', { type: 'button', className: 'btn btn-secondary' }, 'Cancel');
  save.addEventListener('click', async () => {
    problem.textContent = '';
    save.disabled = cancel.disabled = true; save.setAttribute('aria-busy', 'true'); save.textContent = 'Saving…';
    try {
      await api.saveLibraryGroup(form.get(), { category_ids: catList.get(), product_ids: prodList.get() });
      dirty = false; window.onbeforeunload = null; toast('Option group saved. Press Publish on Products to put it on the site.', { seconds: 5 });
      location.hash = '';
    } catch (e) { problem.textContent = e.message; problem.scrollIntoView({ block: 'center', behavior: 'smooth' }); save.disabled = cancel.disabled = false; save.removeAttribute('aria-busy'); save.textContent = 'Save'; }
  });
  cancel.addEventListener('click', () => { location.hash = ''; });
  root.replaceChildren(backTo('#', 'Options'), el('div', { className: 'title-row' }, el('h1', {}, existing ? existing.name || 'Option group' : 'New option group')),
    card('The group', form.node), card('Applies to', el('p', { className: 'muted' }, 'A group applies to every product in a chosen category, and to the single products you tick. A product can get it from both; it is only shown once.'), catList.node, prodList.node), problem,
    el('div', { className: 'action-sticky' }, save, cancel));
  document.body.classList.add('has-actionbar');
  if (!existing) form.nameField.focus();
}

async function refresh() { await load(); route(); }
function route() { const key = location.hash.slice(1); if (key) drawEdit(key); else drawList(); document.querySelector('.admin-main').scrollTop = 0; }
async function onHash() {
  if (ignoreHash) { ignoreHash = false; return; }
  const key = location.hash.slice(1);
  if ((key || null) === shown) return;
  if (dirty && !(await confirmDialog({ title: 'Discard your changes?', message: 'You have changes on this page that are not saved.', confirmLabel: 'Discard', cancelLabel: 'Keep editing', danger: true }))) { ignoreHash = true; location.hash = shown ? `#${shown}` : ''; return; }
  await refresh();
}
window.addEventListener('hashchange', onHash);
await refresh();
