// Allergens (Step 4l): the allergen list, which products contain each allergen (bulk), and what each product contains.
import { api } from './shell.js';
import { backToProducts, checklist } from './manage.js';
import { mountAllergenManager, LEGAL_REMINDER } from './allergens.js';
import { el, toast } from './dom.js';

const root = document.querySelector('[data-root]');
const card = (title, ...kids) => el('section', { className: 'panel' }, el('h2', {}, title), ...kids);
const managerBox = el('div', { className: 'allergen-manager' });
const bulkBox = el('div'); const summaryBox = el('div');
let products = [];

async function drawBulk() {
  const [allergens, list] = await Promise.all([api.listAllergens(), api.listProducts()]);
  products = list;
  bulkBox.replaceChildren();
  if (!allergens.length) { bulkBox.append(el('p', { className: 'muted empty-state' }, 'The allergen list is empty. Add the allergens above first.')); }
  for (const a of allergens) {
    const have = products.filter((p) => p.allergen_ids.includes(a.id)).map((p) => p.id);
    const picker = checklist({ title: 'Contains in', items: products.map((p) => ({ id: p.id, label: p.name, group: p.category || undefined })), selected: have, groupButtons: true });
    const save = el('button', { type: 'button', className: 'btn btn-small' }, 'Save');
    const problem = el('p', { className: 'field-error', role: 'alert' });
    save.addEventListener('click', async () => {
      problem.textContent = ''; save.disabled = true; save.setAttribute('aria-busy', 'true');
      try {
        const cleared = await api.setAllergenProducts(a.id, picker.get());
        toast(cleared ? `${a.name} saved. ${cleared} product${cleared === 1 ? ' needs' : 's need'} the allergen check again before ${cleared === 1 ? 'it' : 'they'} can be shown.` : `${a.name} saved. No product changed.`, { seconds: 8 });
        await drawBulk(); await drawSummary();
      } catch (e) { problem.textContent = e.message; save.disabled = false; save.removeAttribute('aria-busy'); }
    });
    bulkBox.append(el('details', { className: 'panel bulk-allergen' }, el('summary', {}, el('strong', {}, a.name), el('span', { className: 'muted' }, ` · in ${have.length} product${have.length === 1 ? '' : 's'}`)),
      picker.node, el('p', { className: 'muted' }, 'Changing which products contain an allergen means each changed product must be checked again before it can be shown.'), problem, el('div', { className: 'btn-row' }, save)));
  }
}

async function drawSummary() {
  const [allergens, list] = await Promise.all([api.listAllergens(), api.listProducts()]);
  const name = new Map(allergens.map((a) => [a.id, a.name]));
  summaryBox.replaceChildren(...(list.length ? list.map((p) => el('div', { className: 'summary-row' }, el('strong', {}, p.name),
    el('span', { className: 'muted' }, p.allergen_ids.length ? p.allergen_ids.map((id) => name.get(id)).filter(Boolean).join(', ') : 'No allergens ticked'),
    p.allergens_checked_at ? null : el('span', { className: 'needs-chip static' }, 'Needs allergen check'))) : [el('p', { className: 'muted empty-state' }, 'No products yet.')]));
}

root.replaceChildren(backToProducts(), el('div', { className: 'title-row' }, el('h1', {}, 'Allergens')),
  card('The allergen list', el('p', { className: 'reminder' }, LEGAL_REMINDER), managerBox),
  card('Which products contain each allergen', el('p', { className: 'muted' }, 'Open an allergen, tick the products that contain it, and press Save. You can also tick allergens on each product.'), bulkBox),
  card('What each product contains', summaryBox));
await mountAllergenManager(managerBox, { onChange: async () => { await drawBulk(); await drawSummary(); } });
await drawBulk(); await drawSummary();
