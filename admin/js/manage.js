// Shared bits of the Manage screens (Categories, Options, Allergens): the back arrow to Products, a search-and-tick list, a glass sheet.
import { el } from './dom.js';

const svg = (d) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', '24'); s.setAttribute('height', '24'); s.setAttribute('aria-hidden', 'true'); const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', d); s.append(p); return s; };
export const backToProducts = () => el('div', { className: 'back-row' }, el('a', { className: 'back-link back-text', href: 'products' }, svg('M15 5l-7 7 7 7'), el('span', {}, 'Back to Products')));
export const backTo = (href, label) => el('div', { className: 'back-row' }, el('a', { className: 'back-link back-text', href }, svg('M15 5l-7 7 7 7'), el('span', {}, label)));

// A checklist with a search box and a live count. items: [{ id, label, group? }]; selected: Set of ids. Returns { node, get(), set(ids) }.
export function checklist({ title, items, selected, onChange, groupButtons = false }) {
  const chosen = new Set(selected);
  const count = el('span', { className: 'muted' });
  const search = el('input', { type: 'search', placeholder: 'Search', 'aria-label': `Search ${title.toLowerCase()}` });
  const list = el('div', { className: 'check-list', role: 'group', 'aria-label': title });
  const draw = () => {
    const q = search.value.trim().toLowerCase();
    list.replaceChildren(...items.filter((it) => !q || it.label.toLowerCase().includes(q)).map((it) => {
      const box = el('input', { type: 'checkbox', checked: chosen.has(it.id), onchange: () => { if (box.checked) chosen.add(it.id); else chosen.delete(it.id); count.textContent = `${chosen.size} selected`; onChange?.(); } });
      return el('label', { className: 'check' }, box, ' ', it.label, it.group ? el('span', { className: 'muted' }, ` · ${it.group}`) : null);
    }));
    if (!list.children.length) list.append(el('p', { className: 'muted' }, 'Nothing matches your search.'));
    count.textContent = `${chosen.size} selected`;
  };
  search.addEventListener('input', draw);
  const buttons = el('div', { className: 'btn-row' });
  if (groupButtons) {
    const groups = [...new Set(items.map((i) => i.group).filter(Boolean))];
    for (const g of groups) buttons.append(el('button', { type: 'button', className: 'btn btn-secondary btn-small', onclick: () => { items.filter((i) => i.group === g).forEach((i) => chosen.add(i.id)); draw(); onChange?.(); } }, `Select all in ${g}`));
    if (groups.length) buttons.append(el('button', { type: 'button', className: 'btn btn-secondary btn-small', onclick: () => { chosen.clear(); draw(); onChange?.(); } }, 'Clear'));
  }
  draw();
  const node = el('div', { className: 'checklist' }, el('div', { className: 'checklist-head' }, el('h3', {}, title), count), search, buttons.children.length ? buttons : null, list);
  return { node, get: () => [...chosen], set: (ids) => { chosen.clear(); ids.forEach((i) => chosen.add(i)); draw(); } };
}
