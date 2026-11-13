// Products (Steps 4b and 4f): list, edit screen, Publish. Shapes and layout follow docs/design/reference/admin-ui-reference.jpg.
// Products are never deleted: the trash button hides one (active off).
import { api } from './shell.js';
import { PHOTO_QUALITY, PUBLISH_POLL_SECONDS } from './admin-config.js';
import { confirmDialog, el, field, makeSwitch, toast } from './dom.js';
import { mountAllergenManager, LEGAL_REMINDER } from './allergens.js';
import { cleanTag, formatMoney, PHOTO_MAX_BYTES, PHOTO_MAX_EDGE, penceToPounds, poundsToPence, slugify, validateChecked, validateGroup, validateIngredients, validatePhoto, validatePhotoFile, validateProduct } from '../../js/admin-rules.js';

const listBox = document.querySelector('[data-list]');
const editorBox = document.querySelector('[data-editor]');
const publishBox = document.querySelector('[data-publish]');
const addButton = document.querySelector('[data-add]');
const titleRow = document.querySelector('.title-row');
const topStack = document.querySelector('.top-stack');
const SAUCE_PICTURE = '../assets/img/photo-sauce.webp'; // the existing sauce picture, used for add-ons that have no photo yet

let products = [];
let pollTimer = null;
let publishProblem = ''; // shown in the banner until the next try, so it does not vanish like a toast

// ---------- publish banner ----------
async function drawPublish() {
  let status;
  try { status = await api.getSiteStatus(); } catch { publishBox.hidden = true; return; }
  publishBox.hidden = false;
  publishBox.replaceChildren();
  const busy = status.state === 'publishing', failed = status.state === 'failed';
  const label = busy ? 'Publishing' : failed ? 'Failed' : status.unpublished ? 'Unpublished changes' : 'Live';
  const when = status.updated_at ? new Date(status.updated_at).toLocaleString('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
  const text = busy ? 'The site updates in a minute or two.' : failed ? `The last publish did not work${status.detail ? ` (${status.detail})` : ''}.` : status.unpublished ? 'Product changes are not on the site yet.' : `The site shows your latest changes${when ? `. Last published ${when}` : ''}.`;
  const button = el('button', { type: 'button', className: 'btn btn-small', disabled: busy || (!status.unpublished && !failed) }, failed ? 'Try again' : 'Publish');
  button.addEventListener('click', async () => {
    button.disabled = true; button.setAttribute('aria-busy', 'true');
    try { await api.publish(); publishProblem = ''; } catch (e) { publishProblem = e.message; }
    await drawPublish();
  });
  publishBox.append(el('div', { className: 'publish-head' }, el('span', { className: 'status-badge', 'data-status': busy ? 'new' : failed ? 'cancelled' : status.unpublished ? 'ready' : 'confirmed' }, label), el('span', { className: 'muted' }, text)),
    publishProblem ? el('p', { className: 'field-error', role: 'alert' }, publishProblem) : null, el('div', { className: 'btn-row' }, button));
  clearTimeout(pollTimer);
  if (busy) pollTimer = setTimeout(drawPublish, PUBLISH_POLL_SECONDS * 1000);
}

// ---------- list ----------
async function load() { products = await api.listProducts(); }
const pictureOf = (p) => (api.photoUrl && api.photoUrl(p.photo_path)) || (p.kind === 'addon' ? SAUCE_PICTURE : null);

function stockChip(p) {
  if (p.stock_quantity === 0) return el('span', { className: 'stock-chip', 'data-state': 'out' }, 'Sold out');
  if (p.stock_quantity == null) return el('span', { className: 'stock-chip', 'data-state': 'untracked' }, 'Not tracked');
  return el('span', { className: 'stock-chip' }, `${p.stock_quantity} in stock`);
}

function drawList() {
  listBox.replaceChildren();
  if (!products.length) { listBox.append(el('p', { className: 'muted empty-state' }, 'No products yet. Press Add product.')); return; }
  products.forEach((p, i) => {
    const unpriced = p.price_pence == null;
    const off = !p.active || unpriced;
    const pic = pictureOf(p);
    const blocker = unpriced ? 'price' : !p.allergens_checked_at ? 'check' : null; // why this product cannot be shown yet
    const sw = makeSwitch('Active', p.active && !unpriced, async (on) => {
      if (on && blocker) { sw.set(false); edit(p.id, blocker); return; } // the red mark in the editor says what to do
      try { await api.saveProduct({ ...p, active: on }); p.active = on; toast(on ? `${p.name} is shown in the shop.` : `${p.name} is hidden.`, { seconds: 3 }); await load(); drawList(); drawPublish(); }
      catch (e) { sw.set(!on); toast(e.message); }
    });
    const move = (dir) => async () => {
      const ids = products.map((x) => x.id); const j = i + dir;
      [ids[i], ids[j]] = [ids[j], ids[i]];
      await api.reorderProducts(ids); await load(); drawList(); drawPublish();
    };
    const card = el('article', { className: 'product-card' },
      el('div', { className: 'pc-thumb' }, pic ? el('img', { src: pic, alt: '', loading: 'lazy' }) : el('span', { className: 'pc-initial', 'aria-hidden': 'true' }, p.name.charAt(0))),
      el('div', { className: 'pc-main' },
        el('h3', { className: 'pc-name' }, p.name),
        el('p', { className: 'pc-price' }, unpriced ? el('a', { href: '#', onclick: (e) => { e.preventDefault(); edit(p.id); } }, 'Set price') : `${formatMoney(p.price_pence)}${p.unit_label ? ` · ${p.unit_label}` : ''}`),
        el('div', { className: 'pc-row' }, sw.row, stockChip(p)),
        !p.active && blocker ? el('button', { type: 'button', className: 'needs-chip', onclick: () => edit(p.id, blocker) }, blocker === 'price' ? 'Set a price first' : 'Needs allergen check') : null),
      el('div', { className: 'pc-side' },
        el('button', { type: 'button', className: 'btn btn-small', onclick: () => edit(p.id), 'aria-label': `Edit ${p.name}` }, 'Edit'),
        el('div', { className: 'pc-order' },
          el('button', { type: 'button', className: 'btn btn-secondary btn-small', disabled: i === 0, 'aria-label': `Move ${p.name} up`, onclick: move(-1) }, '↑'),
          el('button', { type: 'button', className: 'btn btn-secondary btn-small', disabled: i === products.length - 1, 'aria-label': `Move ${p.name} down`, onclick: move(1) }, '↓'))));
    if (off) card.dataset.off = '';
    listBox.append(card);
  });
}

// ---------- edit screen ----------
const glyph = (d) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', 'glyph'); s.setAttribute('width', '24'); s.setAttribute('height', '24'); s.setAttribute('aria-hidden', 'true'); const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', d); s.append(p); return s; };
const card = (title, ...kids) => el('section', { className: 'edit-card' }, el('h3', {}, title), ...kids);
const errorLine = () => el('p', { className: 'field-error', role: 'alert' });

async function shrink(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, PHOTO_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const toBlob = (type) => new Promise((resolve) => canvas.toBlob(resolve, type, PHOTO_QUALITY));
  const webp = await toBlob('image/webp');
  return webp && webp.type === 'image/webp' ? webp : toBlob('image/jpeg');
}
const dataUrl = (blob) => new Promise((resolve) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.readAsDataURL(blob); });
const clone = (x) => JSON.parse(JSON.stringify(x));

// The notice period for customised orders, edited from the product without leaving it. It is the same setting as Settings, Ordering.
const noticeText = (h) => (h >= 24 && h % 24 === 0 ? `${h / 24} ${h / 24 === 1 ? 'day' : 'days'}` : `${h} ${h === 1 ? 'hour' : 'hours'}`);
function noticeModal(settings, opener, onSaved) {
  const current = Number(settings.custom_min_lead_hours ?? 48);
  const useDays = current >= 24 && current % 24 === 0;
  const id = `dlg-${Math.random().toString(36).slice(2, 8)}`;
  const amount = field('Notice needed', 'text', { value: String(useDays ? current / 24 : current), inputMode: 'numeric' });
  const unit = field('Unit', 'select', { value: useDays ? 'days' : 'hours' }, [['hours', 'Hours'], ['days', 'Days']]);
  const problem = el('p', { className: 'field-error', role: 'alert' });
  const dialog = el('dialog', { className: 'glass-dialog notice-dialog', 'aria-labelledby': id });
  const finish = () => { if (dialog.open) dialog.close(); dialog.remove(); opener?.focus(); };
  const close = el('button', { type: 'button', className: 'icon-btn dialog-close', 'aria-label': 'Close', onclick: finish }, glyph('M6 6l12 12M18 6L6 18'));
  const save = el('button', { type: 'button', className: 'btn' }, 'Save');
  save.addEventListener('click', async () => {
    problem.textContent = '';
    const raw = amount.control.value.trim();
    if (!/^\d+$/.test(raw)) { problem.textContent = 'Enter a whole number.'; return; }
    const hours = Number(raw) * (unit.control.value === 'days' ? 24 : 1);
    if (hours > 720) { problem.textContent = 'Enter a notice of up to 30 days (720 hours).'; return; }
    if (hours < Number(settings.min_lead_hours ?? 0)) { problem.textContent = `Customised orders cannot need less notice than normal orders (${noticeText(Number(settings.min_lead_hours))}).`; return; }
    save.disabled = true; save.setAttribute('aria-busy', 'true');
    try { await api.saveSettings({ custom_min_lead_hours: hours }); settings.custom_min_lead_hours = hours; onSaved?.(); toast(`Customised orders now need ${noticeText(hours)} notice.`, { seconds: 4 }); finish(); }
    catch (e) { problem.textContent = e.message; save.disabled = false; save.removeAttribute('aria-busy'); }
  });
  dialog.append(el('div', { className: 'dialog-head' }, el('h2', { id }, 'Notice for customised orders'), close),
    el('p', { className: 'muted' }, 'How long before pickup a customised order must be placed. It applies to all products.'),
    el('div', { className: 'form-grid' }, amount.wrap, unit.wrap), problem,
    el('div', { className: 'btn-row' }, save, el('button', { type: 'button', className: 'btn btn-secondary', onclick: finish }, 'Cancel')));
  dialog.addEventListener('cancel', (e) => { e.preventDefault(); finish(); }); // Escape
  dialog.addEventListener('click', (e) => { if (e.target === dialog) finish(); });
  document.body.append(dialog); dialog.showModal(); amount.control.focus(); amount.control.select();
}

async function edit(id, guide = null) {
  await load();
  const product = id ? products.find((p) => p.id === id) : null;
  const settings = await api.getSettings().catch(() => ({}));
  let dirty = false;
  let wantActive = Boolean(guide); // she tried to switch the product on: it goes on as soon as what was missing is done
  const markDirty = () => { dirty = true; window.onbeforeunload = () => ''; };

  // frame: glass edit bar replaces the wordmark bar; the list and its header are hidden
  document.body.classList.add('is-editing');
  titleRow.hidden = true; listBox.hidden = true; publishBox.hidden = true;
  editorBox.hidden = false; editorBox.replaceChildren();
  const leave = async () => {
    window.onbeforeunload = null; dirty = false; bar.remove(); document.body.classList.remove('is-editing');
    editorBox.hidden = true; titleRow.hidden = false; listBox.hidden = false;
    await load(); drawList(); await drawPublish();
    document.querySelector('.admin-main').scrollTop = 0;
  };
  const back = async () => { if (dirty && !(await confirmDialog({ title: 'Discard your changes?', message: 'You have changes that are not saved.', confirmLabel: 'Discard', cancelLabel: 'Keep editing', danger: true }))) return; await leave(); };
  const hideBtn = product ? el('button', { type: 'button', className: 'icon-btn icon-btn-danger', 'aria-label': 'Hide product', onclick: async () => {
    if (!(await confirmDialog({ title: 'Hide this product?', message: 'It will no longer show in the shop. Nothing is deleted, and you can switch it back on at any time.', confirmLabel: 'Hide product', danger: true }))) return;
    try { await api.saveProduct({ ...product, active: false }); toast(`${product.name} is hidden.`, { seconds: 3 }); await leave(); } catch (e) { toast(e.message); }
  } }, glyph('M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13M10 11v5M14 11v5')) : el('span');
  const bar = el('div', { className: 'edit-bar' },
    el('button', { type: 'button', className: 'icon-btn', 'aria-label': 'Back to products', onclick: back }, glyph('M15 5l-7 7 7 7')),
    el('h2', {}, product ? product.name : 'New product'), hideBtn);
  topStack.append(bar);

  // ----- draft state -----
  const draft = {
    name: product?.name ?? '', kind: product?.kind ?? 'pack', unit_label: product?.unit_label ?? '', price: penceToPounds(product?.price_pence ?? null),
    active: product ? product.active : true, available: product ? product.available : true,
    photo_path: product?.photo_path ?? null, photo_alt: product?.photo_alt ?? '', ingredients: [...(product?.ingredients ?? [])], allergen_ids: [...(product?.allergen_ids ?? [])], allergen_note: product?.allergen_note ?? '',
    checked: Boolean(product?.allergens_checked_at), checkedAt: product?.allergens_checked_at ?? null, infoChanged: false,
    tracked: product ? product.stock_quantity != null : false, stock: product?.stock_quantity ?? 0,
  };
  let pending = null; // { blob, name } a new photo not uploaded yet
  const groups = (product?.option_groups ?? []).map(clone);
  const removed = [];
  let selected = groups.length ? 0 : -1;
  const errors = {};
  const showError = (key, text) => { if (errors[key]) errors[key].textContent = text || ''; };

  // ----- Name, kind, size -----
  const name = field('Name', 'text', { value: draft.name, maxLength: 120 });
  const kind = field('Kind', 'select', { value: draft.kind }, [['pack', 'Pack of momo'], ['addon', 'Add-on (sauce, extra)']]);
  const unit = field('Size or pack label', 'text', { value: draft.unit_label, maxLength: 60, hint: 'For example "40 pieces" or "1 pot".' });
  errors.name = errorLine();
  name.control.addEventListener('input', () => { draft.name = name.control.value; bar.querySelector('h2').textContent = draft.name || 'New product'; markDirty(); });
  kind.control.addEventListener('change', () => { draft.kind = kind.control.value; markDirty(); });
  unit.control.addEventListener('input', () => { draft.unit_label = unit.control.value; markDirty(); });
  editorBox.append(card('Name', name.wrap, errors.name, kind.wrap, unit.wrap));

  // ----- Price -----
  const price = field('Price (£)', 'text', { value: draft.price, inputMode: 'decimal', hint: 'For example 10 or 10.50. It is stored in pence.' });
  errors.price = errorLine();
  price.control.addEventListener('input', () => { draft.price = price.control.value; markDirty(); if (blockerOf() !== 'price') { price.wrap.classList.remove('is-flagged'); priceFlag.hidden = true; settleActive(); } });
  const priceFlag = el('p', { className: 'flag-note', role: 'alert', hidden: true });
  const priceCard = card('Price', price.wrap, priceFlag, errors.price);
  editorBox.append(priceCard);

  // ----- Photo -----
  const preview = el('img', { className: 'photo-preview', alt: '' });
  const setPreview = (src) => { preview.hidden = !src; if (src) preview.src = src; };
  setPreview(draft.photo_path ? api.photoUrl?.(draft.photo_path) : null);
  const fileInput = el('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp', hidden: true, 'aria-label': 'Choose a photo' });
  const alt = field('Describe the photo', 'text', { value: draft.photo_alt, maxLength: 200, hint: 'Required. For people who cannot see it, for example "A bag of frozen chicken momo".' });
  errors.photo = errorLine();
  alt.control.addEventListener('input', () => { draft.photo_alt = alt.control.value; markDirty(); });
  const change = el('button', { type: 'button', className: 'btn btn-secondary btn-small', onclick: () => fileInput.click() }, 'Change photo');
  const clear = el('button', { type: 'button', className: 'btn btn-secondary btn-small', hidden: !draft.photo_path, onclick: () => { draft.photo_path = null; draft.photo_alt = ''; alt.control.value = ''; pending = null; setPreview(null); clear.hidden = true; markDirty(); } }, 'Remove photo');
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0]; showError('photo', '');
    if (!file) return;
    const problem = validatePhotoFile(file);
    if (problem) return showError('photo', problem);
    try {
      const blob = await shrink(file);
      if (blob.size > PHOTO_MAX_BYTES) return showError('photo', 'That photo is still too large after shrinking. Try a smaller one.');
      pending = { blob, name: file.name }; setPreview(await dataUrl(blob)); clear.hidden = false; markDirty();
    } catch { showError('photo', 'That photo could not be read. Try another.'); }
  });
  editorBox.append(card('Photo', el('div', { className: 'photo-row' }, preview, change, clear), fileInput, alt.wrap, errors.photo));

  // ----- Options (groups as chips) -----
  const chipRow = el('div', { className: 'chip-set', role: 'group', 'aria-label': 'Option groups' });
  const groupBox = el('div');
  const previewBox = el('div', { className: 'option-preview' });
  errors.options = errorLine();
  editorBox.append(card('Options', el('p', {}, 'Choosing anything other than the standard option makes the order customised and needs the longer notice.'), chipRow, groupBox, errors.options, previewBox));
  const drawPreview = () => {
    previewBox.replaceChildren(el('h3', {}, 'How customers see it'));
    const live = groups.filter((g) => g.active && g.options.some((o) => o.active));
    if (!live.length) previewBox.append(el('p', { className: 'muted' }, 'No options. Customers just choose how many.'));
    for (const g of live) previewBox.append(el('p', {}, el('strong', {}, `${g.label || 'Group'} (${g.kind === 'single' ? 'choose one' : 'choose any'}): `), g.options.filter((o) => o.active).map((o) => `${o.label}${o.is_default ? ' (standard)' : ''}${o.price_delta_pence > 0 ? ` +${formatMoney(o.price_delta_pence)}` : ''}`).join(', ')));
  };
  function drawChips() {
    chipRow.replaceChildren(...groups.map((g, i) => el('button', { type: 'button', className: 'chip', 'aria-pressed': String(i === selected), onclick: () => { selected = i; drawChips(); drawGroup(); } }, g.label || 'New group')),
      el('button', { type: 'button', className: 'chip', onclick: () => { groups.push({ id: null, label: '', kind: 'single', sort_order: groups.length + 1, active: true, options: [] }); selected = groups.length - 1; markDirty(); drawChips(); drawGroup(); } }, '+ Add group'));
  }
  function drawGroup() {
    groupBox.replaceChildren(); drawPreview();
    const g = groups[selected];
    if (!g) return;
    const label = field('Group name', 'text', { value: g.label, maxLength: 60, hint: 'For example "Spice level" or "Leave out".' });
    const gkind = field('Customers can choose', 'select', { value: g.kind }, [['single', 'One option'], ['multiple', 'Any number of options']]);
    const shown = makeSwitch('Shown to customers', g.active, (on) => { g.active = on; markDirty(); drawPreview(); });
    const rows = el('div');
    const drawRows = () => {
      rows.replaceChildren(...g.options.map((o, oi) => {
        const oname = el('input', { type: 'text', value: o.label, maxLength: 60, 'aria-label': 'Choice name', oninput: () => { o.label = oname.value; markDirty(); drawPreview(); } });
        const oprice = el('input', { type: 'text', value: penceToPounds(o.price_delta_pence || 0), inputMode: 'decimal', 'aria-label': 'Price change in pounds', oninput: () => { const v = poundsToPence(oprice.value || '0'); o.price_delta_pence = v === null ? -1 : v; markDirty(); drawPreview(); } });
        const odef = el('input', { type: g.kind === 'single' ? 'radio' : 'checkbox', name: `std-${selected}`, checked: o.is_default, 'aria-label': 'Standard choice', onchange: () => { if (g.kind === 'single') g.options.forEach((x) => { x.is_default = false; }); o.is_default = odef.checked; markDirty(); drawPreview(); } });
        const oact = el('input', { type: 'checkbox', checked: o.active, 'aria-label': 'Shown', onchange: () => { o.active = oact.checked; markDirty(); drawPreview(); } });
        return el('div', { className: 'option-row' }, el('label', {}, 'Choice', oname), el('label', {}, 'Price change £', oprice), el('label', { className: 'check' }, odef, ' Standard'), el('label', { className: 'check' }, oact, ' Shown'),
          el('button', { type: 'button', className: 'btn btn-secondary btn-small', 'aria-label': `Remove choice ${o.label}`, onclick: () => { g.options.splice(oi, 1); markDirty(); drawRows(); drawPreview(); } }, 'Remove'));
      }));
    };
    drawRows();
    label.control.addEventListener('input', () => { g.label = label.control.value; markDirty(); drawChips(); drawPreview(); });
    gkind.control.addEventListener('change', () => { g.kind = gkind.control.value; if (g.kind === 'single') { let seen = false; g.options.forEach((o) => { if (o.is_default && seen) o.is_default = false; seen ||= o.is_default; }); } markDirty(); drawRows(); drawPreview(); });
    const addOption = el('button', { type: 'button', className: 'btn btn-secondary btn-small', onclick: () => { g.options.push({ id: null, label: '', price_delta_pence: 0, is_default: g.kind === 'single' && !g.options.some((o) => o.is_default), active: true }); markDirty(); drawRows(); } }, 'Add a choice');
    const del = el('button', { type: 'button', className: 'btn btn-danger btn-small', onclick: async () => {
      if (!(await confirmDialog({ title: `Delete the group "${g.label || 'new group'}"?`, message: 'Its choices are deleted too. Orders already placed keep what they chose.', confirmLabel: 'Delete group', danger: true }))) return;
      if (g.id) removed.push(g.id);
      groups.splice(selected, 1); selected = groups.length ? Math.min(selected, groups.length - 1) : -1; markDirty(); drawChips(); drawGroup();
    } }, 'Delete group');
    const earlier = el('button', { type: 'button', className: 'btn btn-secondary btn-small', disabled: selected === 0, 'aria-label': 'Move group earlier', onclick: () => { [groups[selected - 1], groups[selected]] = [groups[selected], groups[selected - 1]]; selected -= 1; markDirty(); drawChips(); drawGroup(); } }, '←');
    const later = el('button', { type: 'button', className: 'btn btn-secondary btn-small', disabled: selected === groups.length - 1, 'aria-label': 'Move group later', onclick: () => { [groups[selected + 1], groups[selected]] = [groups[selected], groups[selected + 1]]; selected += 1; markDirty(); drawChips(); drawGroup(); } }, '→');
    groupBox.append(el('div', { className: 'group-card' }, label.wrap, gkind.wrap, shown.row, rows, el('div', { className: 'btn-row' }, addOption, earlier, later, del)), previewBox);
  }
  drawChips(); drawGroup();

  // ----- the safeguard: changing allergens or ingredients clears "I have checked" and asks again -----
  let checkBox = null; let checkNote = null;
  const infoChanged = () => { draft.infoChanged = true; markDirty(); if (draft.checked) { draft.checked = false; if (checkBox) checkBox.checked = false; if (checkNote) checkNote.textContent = 'You changed the allergen or ingredient information, so please tick the check again.'; } };

  // ----- Ingredients: tags, one at a time, in her order -----
  errors.ingredients = errorLine();
  const tagList = el('div', { className: 'tag-list', 'aria-label': 'Ingredients' });
  const tagInput = el('input', { type: 'text', maxLength: 60, list: 'ingredient-suggestions', placeholder: 'Add an ingredient', 'aria-label': 'Ingredient to add', autocomplete: 'off' });
  const suggestions = el('datalist', { id: 'ingredient-suggestions' });
  api.ingredientNames().then((names) => suggestions.replaceChildren(...names.map((n) => el('option', { value: n })))).catch(() => {});
  const drawTags = () => {
    tagList.replaceChildren(...draft.ingredients.map((t, i) => el('span', { className: 'tag-chip' }, t,
      el('button', { type: 'button', className: 'tag-remove', 'aria-label': `Remove ${t}`, onclick: () => { draft.ingredients.splice(i, 1); infoChanged(); drawTags(); } }, '×'))));
    if (!draft.ingredients.length) tagList.append(el('span', { className: 'muted' }, 'No ingredients added yet. Nothing is shown on the site.'));
  };
  const addTag = () => {
    const tag = cleanTag(tagInput.value);
    if (!tag) return;
    const problem = validateIngredients({ ingredients: [...draft.ingredients, tag], allergen_ids: [], allergen_note: '' });
    if (problem) { showError('ingredients', problem); return; }
    showError('ingredients', ''); draft.ingredients.push(tag); tagInput.value = ''; infoChanged(); drawTags(); tagInput.focus();
  };
  tagInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } });
  editorBox.append(card('Ingredients', el('div', { className: 'tag-add' }, tagInput, el('button', { type: 'button', className: 'btn btn-small', onclick: addTag }, 'Add')), suggestions, errors.ingredients, tagList));
  drawTags();

  // ----- Allergens: the list is data in the database -----
  errors.allergens = errorLine();
  const note = field('May contain note (optional)', 'textarea', { value: draft.allergen_note, rows: 2, maxLength: 500, hint: 'For example "Made in a kitchen that also handles nuts."' });
  note.control.addEventListener('input', () => { draft.allergen_note = note.control.value; infoChanged(); });
  const grid = el('fieldset', { className: 'allergens' }, el('legend', {}, 'Contains (tick all that apply)'));
  const manager = el('div', { className: 'allergen-manager' });
  const drawGrid = async () => {
    const list = await api.listAllergens();
    draft.allergen_ids = draft.allergen_ids.filter((id) => list.some((a) => a.id === id)); // a deleted allergen disappears from the ticks
    grid.replaceChildren(el('legend', {}, 'Contains (tick all that apply)'), ...list.map((a) => el('label', { className: 'check' },
      el('input', { type: 'checkbox', checked: draft.allergen_ids.includes(a.id), onchange: (e) => { draft.allergen_ids = e.target.checked ? [...draft.allergen_ids, a.id] : draft.allergen_ids.filter((x) => x !== a.id); infoChanged(); } }), ` ${a.name}`)));
  };
  await drawGrid();
  const manage = el('details', { className: 'manage-allergens' }, el('summary', {}, 'Manage allergens'), el('p', { className: 'muted' }, 'Add, rename, reorder or delete the allergens in this list. It is the same list for every product.'), manager);
  let managerLoaded = false;
  manage.addEventListener('toggle', async () => { if (manage.open && !managerLoaded) { managerLoaded = true; await mountAllergenManager(manager, { onChange: drawGrid }); } });
  errors.checked = errorLine();
  const checkFlag = el('p', { className: 'flag-note', role: 'alert', hidden: true });
  checkBox = el('input', { type: 'checkbox', checked: draft.checked, onchange: () => { draft.checked = checkBox.checked; if (draft.checked) { draft.checkedAt = null; if (checkNote) checkNote.textContent = ''; checkLabel.classList.remove('is-flagged'); checkFlag.hidden = true; settleActive(); } markDirty(); } });
  const checkLabel = el('label', { className: 'check check-required' }, checkBox, ' I have checked the allergen and ingredient information');
  checkNote = el('p', { className: 'muted' });
  const allergensCard = card('Allergens', el('p', { className: 'reminder' }, LEGAL_REMINDER), grid, manage, note.wrap, errors.allergens, checkLabel, checkNote, checkFlag, errors.checked);
  editorBox.append(allergensCard);

  // ----- Stock -----
  const tracked = makeSwitch('Count stock for this product', draft.tracked, (on) => { draft.tracked = on; stockBox.hidden = !on; markDirty(); });
  const qty = field('Packs in stock', 'number', { value: draft.stock, min: 0, step: 1, inputMode: 'numeric' });
  errors.stock = errorLine();
  qty.control.addEventListener('input', () => { draft.stock = qty.control.value; markDirty(); });
  const stepStock = (d) => () => { const cur = Number(qty.control.value || 0); qty.control.value = String(Math.max(0, cur + d)); draft.stock = qty.control.value; markDirty(); };
  const stockBox = el('div', { hidden: !draft.tracked }, qty.wrap, el('div', { className: 'btn-row' }, el('button', { type: 'button', className: 'btn btn-secondary', 'aria-label': 'One less in stock', onclick: stepStock(-1) }, '−'), el('button', { type: 'button', className: 'btn btn-secondary', 'aria-label': 'One more in stock', onclick: stepStock(1) }, '+')), errors.stock);
  editorBox.append(card('Stock', el('p', {}, 'Stock counts packs already frozen and ready. Customised orders are made to order and do not use stock. Stock changes are live at once and do not need Publish.'), tracked.row, stockBox));

  // ----- Availability, with the safeguard -----
  const blockerOf = () => (draft.price.trim() === '' || poundsToPence(draft.price.trim()) === null ? 'price' : !draft.checked ? 'check' : null);
  const active = makeSwitch('Shown in the shop', draft.active, (on) => {
    if (on) {
      const b = blockerOf();
      if (b) { active.set(false); wantActive = true; guideTo(b); return; }
    }
    showError('checked', ''); draft.active = on; wantActive = false; markDirty();
  });
  // once what was missing is done, a product she tried to switch on goes on by itself
  function settleActive() { if (wantActive && !blockerOf()) { active.set(true); draft.active = true; wantActive = false; markDirty(); } }
  // lead her to the field that blocks the switch: scroll it under the bars, mark it red with an icon and words, focus it
  function guideTo(kind) {
    const isPrice = kind === 'price';
    const cardEl = isPrice ? priceCard : allergensCard;
    const target = isPrice ? price.wrap : checkLabel; const note = isPrice ? priceFlag : checkFlag;
    note.textContent = isPrice ? 'Set a price to show the product' : 'Tick this to show the product'; note.hidden = false; target.classList.add('is-flagged');
    (isPrice ? cardEl : target).scrollIntoView({ block: isPrice ? 'start' : 'center', behavior: 'smooth' });
    (isPrice ? price.control : checkBox).focus({ preventScroll: true });
  }
  const available = makeSwitch('Available to order', draft.available, (on) => { draft.available = on; markDirty(); });
  const leadLine = el('p', { className: 'muted' });
  const drawLead = () => { leadLine.textContent = `Customised orders need ${noticeText(settings.custom_min_lead_hours ?? 48)} notice. This applies to all products.`; };
  drawLead();
  const editLead = el('button', { type: 'button', className: 'btn btn-secondary btn-small', onclick: () => noticeModal(settings, editLead, drawLead) }, 'Edit');
  editorBox.append(card('Availability', active.row, available.row, el('div', { className: 'lead-row' }, leadLine, editLead)));

  // ----- sticky Save and Cancel -----
  const saveBtn = el('button', { type: 'button', className: 'btn' }, 'Save');
  const cancelBtn = el('button', { type: 'button', className: 'btn btn-secondary', onclick: back }, 'Cancel');
  editorBox.append(el('div', { className: 'action-sticky' }, saveBtn, cancelBtn));
  const topOfEditor = () => document.querySelector('.admin-main').scrollTo({ top: 0, behavior: 'smooth' });

  saveBtn.addEventListener('click', async () => {
    Object.values(errors).forEach((e) => { e.textContent = ''; });
    const priceText = draft.price.trim();
    const pence = priceText === '' ? null : poundsToPence(priceText);
    const fields = { id: product?.id, name: draft.name, kind: draft.kind, unit_label: draft.unit_label, price_pence: pence, active: draft.active, available: draft.available,
      photo_path: pending ? 'pending.webp' : draft.photo_path, photo_alt: draft.photo_alt, ingredients: draft.ingredients, allergen_ids: draft.allergen_ids, allergen_note: draft.allergen_note,
      allergens_checked_at: draft.checked ? (draft.infoChanged || !draft.checkedAt ? new Date().toISOString() : draft.checkedAt) : null };
    let first = null;
    const fail = (key, text) => { showError(key, text); first ||= errors[key]; };
    if (priceText !== '' && pence === null) fail('price', 'Enter a price of £0 or more, for example 10 or 10.50.');
    else { const e = validateProduct(fields); if (e) fail(/price/i.test(e) ? 'price' : 'name', e); }
    const pe = validatePhoto({ photo_path: fields.photo_path, photo_alt: draft.photo_alt }); if (pe) fail('photo', pe);
    const ie = validateIngredients({ ingredients: draft.ingredients, allergen_ids: draft.allergen_ids, allergen_note: draft.allergen_note }); if (ie) fail('allergens', ie);
    const ce = validateChecked({ active: draft.active, checked: draft.checked }); if (ce) fail('checked', ce);
    for (const g of groups) { const ge = validateGroup(g, g.options); if (ge) { fail('options', `${g.label || 'New group'}: ${ge}`); break; } }
    let stockValue = null;
    if (draft.tracked) { const n = Number(String(draft.stock).trim()); if (String(draft.stock).trim() === '' || !Number.isInteger(n) || n < 0) fail('stock', 'Enter a whole number, 0 or more.'); else stockValue = n; }
    if (first) {
      first.scrollIntoView({ block: 'center', behavior: 'smooth' });
      const control = first.closest('.edit-card')?.querySelector('input:not([type=hidden]):not([hidden]),textarea,select'); control?.focus({ preventScroll: true });
      return;
    }

    saveBtn.disabled = true; cancelBtn.disabled = true; saveBtn.setAttribute('aria-busy', 'true'); saveBtn.textContent = 'Saving…';
    try {
      let path = draft.photo_path;
      if (pending) path = await api.uploadPhoto(product?.id ?? (slugify(draft.name) || 'item'), pending.blob, pending.name);
      const saved = await api.saveProduct({ ...fields, photo_path: path });
      const productId = product?.id ?? saved?.id ?? saved;
      for (const gid of removed) await api.deleteOptionGroup(productId, gid);
      for (const [i, g] of groups.entries()) await api.saveOptionGroup(productId, { ...g, sort_order: i + 1 });
      await api.setStock(productId, stockValue);
      toast('Saved. Press Publish to put changes on the site.', { seconds: 5 });
      await leave();
    } catch (e) {
      toast(e.message, { seconds: 10 }); showError('options', ''); topOfEditor();
      saveBtn.disabled = false; cancelBtn.disabled = false; saveBtn.removeAttribute('aria-busy'); saveBtn.textContent = 'Save';
    }
  });
  document.querySelector('.admin-main').scrollTop = 0;
  if (guide) setTimeout(() => guideTo(guide), 50);
}

addButton.addEventListener('click', () => edit(null));
try { await load(); drawList(); await drawPublish(); }
catch (e) { listBox.replaceChildren(el('p', { className: 'error', role: 'alert' }, `The products could not be loaded: ${e.message}`)); }
