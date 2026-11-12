// Products (Step 4b): list, edit, stock, photo, options, ingredients and allergens, and the Publish button (D-055).
import { api } from './shell.js';
import { PHOTO_QUALITY, PUBLISH_POLL_SECONDS } from './admin-config.js';
import { actionBar, el, feedback, field, makeSwitch, saving } from './dom.js';
import { ALLERGENS, formatMoney, PHOTO_MAX_BYTES, PHOTO_MAX_EDGE, penceToPounds, poundsToPence, validateGroup, validatePhotoFile } from '../../js/admin-rules.js';

const listBox = document.querySelector('[data-list]');
const editorBox = document.querySelector('[data-editor]');
const publishBox = document.querySelector('[data-publish]');
const addButton = document.querySelector('[data-add]');
const PUBLISH_NOTE = 'Changes appear on the site in a minute or two, after you press Publish.';

let products = [];
let pollTimer = null;

// ---------- publish pipeline ----------
async function drawPublish() {
  let status;
  try { status = await api.getSiteStatus(); } catch { publishBox.hidden = true; return; }
  publishBox.hidden = false;
  publishBox.replaceChildren();
  const busy = status.state === 'publishing';
  const failed = status.state === 'failed';
  const label = busy ? 'Publishing' : failed ? 'Failed' : status.unpublished ? 'Not published yet' : 'Live';
  const text = busy ? 'Publishing now. The site updates in a minute or two.'
    : failed ? `The last publish did not work${status.detail ? ` (${status.detail})` : ''}. Press Publish to try again.`
    : status.unpublished ? 'You have product changes that are not on the site yet.' : 'The site shows your latest product changes.';
  const button = el('button', { type: 'button', className: 'btn btn-small', disabled: busy || (!status.unpublished && !failed) }, 'Publish changes');
  const fb = el('div', { className: 'btn-row' });
  const feed = feedback(fb);
  button.addEventListener('click', async () => {
    button.disabled = true;
    try { await api.publish(); await drawPublish(); } catch (e) { feed.error(e.message); button.disabled = false; }
  });
  publishBox.append(el('div', { className: 'publish-head' }, el('span', { className: 'status-badge', 'data-status': busy ? 'new' : failed ? 'cancelled' : status.unpublished ? 'ready' : 'confirmed' }, label), el('span', { className: 'muted' }, text)), el('div', { className: 'btn-row' }, button), fb);
  clearTimeout(pollTimer);
  if (busy) pollTimer = setTimeout(drawPublish, PUBLISH_POLL_SECONDS * 1000);
}

// ---------- list ----------
async function load() { products = await api.listProducts(); }

function drawList() {
  listBox.replaceChildren();
  if (!products.length) { listBox.append(el('p', { className: 'muted empty-state' }, 'No products yet. Press Add product.')); return; }
  products.forEach((p, i) => {
    const soldOut = p.stock_quantity === 0;
    const move = (dir) => async () => {
      const ids = products.map((x) => x.id);
      const j = i + dir;
      [ids[i], ids[j]] = [ids[j], ids[i]];
      await api.reorderProducts(ids);
      await load(); drawList(); drawPublish();
    };
    listBox.append(el('article', { className: 'order product-row' },
      el('div', { className: 'order-top' }, el('strong', {}, p.name),
        soldOut ? el('span', { className: 'tag tag-custom' }, 'Sold out') : null,
        !p.active ? el('span', { className: 'tag' }, 'Hidden') : !p.available ? el('span', { className: 'tag' }, 'Not available') : null),
      el('p', { className: 'pickup-line' }, p.price_pence == null ? 'No price yet' : formatMoney(p.price_pence), p.unit_label ? el('span', { className: 'muted' }, ` · ${p.unit_label}`) : null),
      el('p', { className: 'muted' }, p.stock_quantity == null ? 'Stock is not counted' : `Stock: ${p.stock_quantity}`),
      el('div', { className: 'order-foot' },
        el('div', { className: 'btn-row' },
          el('button', { type: 'button', className: 'btn btn-secondary btn-small', disabled: i === 0, 'aria-label': `Move ${p.name} up`, onclick: move(-1) }, '↑'),
          el('button', { type: 'button', className: 'btn btn-secondary btn-small', disabled: i === products.length - 1, 'aria-label': `Move ${p.name} down`, onclick: move(1) }, '↓')),
        el('div', { className: 'order-actions' }, el('button', { type: 'button', className: 'btn btn-small', onclick: () => edit(p.id) }, 'Edit')))));
  });
}

// ---------- editor ----------
function panel(title, ...kids) { return el('section', { className: 'panel' }, el('h2', {}, title), ...kids); }
function saveRow(label, work, { secondary = false } = {}) {
  const row = el('div', { className: 'btn-row' });
  const button = el('button', { type: 'button', className: secondary ? 'btn btn-secondary' : 'btn' }, label);
  row.append(button);
  const fb = feedback(row);
  button.addEventListener('click', () => saving(button, fb, work));
  return row;
}

async function edit(id) {
  await load();
  const product = id ? products.find((p) => p.id === id) : null;
  listBox.hidden = true; addButton.hidden = true; publishBox.hidden = true;
  editorBox.hidden = false; editorBox.replaceChildren();
  const back = el('button', { type: 'button', className: 'btn btn-secondary btn-small', onclick: async () => { editorBox.hidden = true; listBox.hidden = false; addButton.hidden = false; await load(); drawList(); drawPublish(); } }, '← All products');
  editorBox.append(el('div', { className: 'title-row' }, back, el('h2', {}, product ? product.name : 'New product')));
  editorBox.append(el('p', { className: 'muted' }, PUBLISH_NOTE));

  // 1. Details
  const f = {
    name: field('Name', 'text', { value: product?.name ?? '', maxLength: 120 }),
    kind: field('Kind', 'select', { value: product?.kind ?? 'pack' }, [['pack', 'Pack of momo'], ['addon', 'Add-on (sauce, extra)']]),
    unit: field('Size or pack label', 'text', { value: product?.unit_label ?? '', maxLength: 60, hint: 'For example "40 pieces" or "1 pot".' }),
    price: field('Price (£)', 'text', { value: penceToPounds(product?.price_pence ?? null), inputMode: 'decimal', hint: 'For example 10 or 10.50.' }),
  };
  const active = makeSwitch('Shown in the shop', product ? product.active : true);
  const available = makeSwitch('Available to order', product ? product.available : true);
  const detailsFb = { row: null };
  const details = panel('Details', f.name.wrap, f.kind.wrap, f.unit.wrap, f.price.wrap, active.row, available.row,
    el('p', { className: 'muted' }, 'Items are never deleted. Switch "Shown in the shop" off to hide one.'));
  const collect = (extra = {}) => {
    const priceText = f.price.control.value.trim();
    const price = priceText === '' ? null : poundsToPence(priceText);
    if (priceText !== '' && price === null) throw new Error('Enter a price of £0 or more, for example 10 or 10.50.');
    return { ...(product || {}), id: product?.id, name: f.name.control.value, kind: f.kind.control.value, unit_label: f.unit.control.value, price_pence: price, active: active.get(), available: available.get(), ...extra };
  };
  details.append(saveRow('Save details', async () => {
    const saved = await api.saveProduct(collect());
    await drawPublish();
    if (!product) { await load(); const created = products.find((p) => p.id === (saved?.id ?? saved)) || products[products.length - 1]; await edit(created.id); }
    else await load();
  }));
  editorBox.append(details);

  if (!product) { editorBox.append(el('p', { className: 'muted' }, 'Save the details first. Then you can add a photo, stock, options and ingredients.')); return; }
  const savePatch = async (patch) => { await api.saveProduct({ ...product, ...patch }); Object.assign(product, patch); await drawPublish(); };

  // 2. Photo
  const preview = el('img', { className: 'photo-preview', alt: '', hidden: !product.photo_path });
  const setPreview = (path) => { const url = api.photoUrl ? api.photoUrl(path) : null; preview.hidden = !url; if (url) preview.src = url; };
  setPreview(product.photo_path);
  const fileField = field('Photo', 'file', { accept: 'image/jpeg,image/png,image/webp', hint: 'JPEG, PNG or WebP. It is made smaller automatically.' });
  const altField = field('Describe the photo', 'text', { value: product.photo_alt ?? '', maxLength: 200, hint: 'For people who cannot see it, for example "A bag of frozen chicken momo".' });
  const photoPanel = panel('Photo', preview, fileField.wrap, altField.wrap);
  photoPanel.append(actionBar([{ label: 'Save photo', work: async () => {
    const file = fileField.control.files[0];
    let path = product.photo_path;
    if (file) {
      const problem = validatePhotoFile(file);
      if (problem) throw new Error(problem);
      const blob = await shrink(file);
      if (blob.size > PHOTO_MAX_BYTES) throw new Error('That photo is still too large after shrinking. Try a smaller one.');
      path = await api.uploadPhoto(product.id, blob, file.name);
    }
    if (!path) throw new Error('Choose a photo.');
    await savePatch({ photo_path: path, photo_alt: altField.control.value });
    setPreview(path); fileField.control.value = '';
  } }, ...(product.photo_path ? [{ label: 'Remove photo', secondary: true, work: async () => { await savePatch({ photo_path: null, photo_alt: '' }); setPreview(null); altField.control.value = ''; } }] : [])]));
  editorBox.append(photoPanel);

  // 3. Stock (never triggers a rebuild)
  const stockInput = field('Packs in stock', 'number', { value: product.stock_quantity ?? '', min: 0, step: 1, inputMode: 'numeric', hint: 'Leave empty if you do not count stock.' });
  const stockFb = el('div', { className: 'btn-row' });
  const stockMsg = feedback(stockFb);
  const commitStock = async (value) => { try { const q = await api.setStock(product.id, value); product.stock_quantity = q; stockInput.control.value = q ?? ''; stockMsg.saved(q === null ? 'Saved. Stock is not counted.' : 'Saved'); } catch (e) { stockMsg.error(e.message); } };
  const step = (d) => () => { const cur = stockInput.control.value === '' ? 0 : Number(stockInput.control.value); commitStock(Math.max(0, cur + d)); };
  const stockButtons = el('div', { className: 'btn-row' },
    el('button', { type: 'button', className: 'btn btn-secondary', 'aria-label': 'One less in stock', onclick: step(-1) }, '−'),
    el('button', { type: 'button', className: 'btn btn-secondary', 'aria-label': 'One more in stock', onclick: step(1) }, '+'),
    el('button', { type: 'button', className: 'btn', onclick: () => { const v = stockInput.control.value.trim(); commitStock(v === '' ? null : Number(v)); } }, 'Save stock'));
  editorBox.append(panel('Stock', el('p', {}, 'Stock counts packs already frozen and ready. Customised orders are made to order and do not use stock.'), stockInput.wrap, stockButtons, stockFb,
    el('p', { className: 'muted' }, 'Stock changes are live at once. They do not need Publish.')));

  // 4. Options
  const optionsPanel = panel('Options customers can choose',
    el('p', {}, 'Choosing anything other than the default makes the order customised and needs the longer notice.'));
  const groupsBox = el('div');
  const previewBox = el('div', { className: 'option-preview' });
  optionsPanel.append(groupsBox, el('div', { className: 'btn-row' }, el('button', { type: 'button', className: 'btn btn-secondary', onclick: () => addGroup() }, 'Add an option group')), previewBox);
  editorBox.append(optionsPanel);
  const groups = product.option_groups.map((g) => JSON.parse(JSON.stringify(g)));
  const drawPreview = () => {
    previewBox.replaceChildren(el('h3', {}, 'How customers see it'));
    const live = groups.filter((g) => g.active && g.options.some((o) => o.active));
    if (!live.length) previewBox.append(el('p', { className: 'muted' }, 'No options. Customers just choose how many.'));
    for (const g of live) previewBox.append(el('p', {}, el('strong', {}, `${g.label} (${g.kind === 'single' ? 'choose one' : 'choose any'}): `),
      g.options.filter((o) => o.active).map((o) => `${o.label}${o.is_default ? ' (standard)' : ''}${o.price_delta_pence ? ` +${formatMoney(o.price_delta_pence)}` : ''}`).join(', ')));
  };
  function drawGroups() {
    groupsBox.replaceChildren();
    groups.forEach((g, gi) => groupsBox.append(groupEditor(g, gi)));
    drawPreview();
  }
  function addGroup() { groups.push({ id: null, label: '', kind: 'single', sort_order: groups.length + 1, active: true, options: [] }); drawGroups(); }
  function groupEditor(g, gi) {
    const label = field('Group name', 'text', { value: g.label, maxLength: 60, hint: 'For example "Spice level" or "Leave out".' });
    const kind = field('Customers can choose', 'select', { value: g.kind }, [['single', 'One option'], ['multiple', 'Any number of options']]);
    const groupActive = makeSwitch('Shown to customers', g.active, (on) => { g.active = on; drawPreview(); });
    const rows = el('div');
    const drawRows = () => {
      rows.replaceChildren();
      g.options.forEach((o, oi) => {
        const name = el('input', { type: 'text', value: o.label, maxLength: 60, 'aria-label': 'Option name', oninput: () => { o.label = name.value; drawPreview(); } });
        const price = el('input', { type: 'text', value: penceToPounds(o.price_delta_pence || 0), inputMode: 'decimal', 'aria-label': 'Price change in pounds', oninput: () => { const p = poundsToPence(price.value || '0'); o.price_delta_pence = p === null ? -1 : p; drawPreview(); } });
        const def = el('input', { type: g.kind === 'single' ? 'radio' : 'checkbox', name: `default-${gi}`, checked: o.is_default, 'aria-label': 'Standard choice', onchange: () => { if (g.kind === 'single') g.options.forEach((x) => { x.is_default = false; }); o.is_default = def.checked; drawPreview(); } });
        const act = el('input', { type: 'checkbox', checked: o.active, 'aria-label': 'Shown', onchange: () => { o.active = act.checked; drawPreview(); } });
        rows.append(el('div', { className: 'option-row' },
          el('label', {}, 'Name', name), el('label', {}, 'Price change £', price),
          el('label', { className: 'check' }, def, ' Standard'), el('label', { className: 'check' }, act, ' Shown'),
          el('button', { type: 'button', className: 'btn btn-secondary btn-small', 'aria-label': `Remove option ${o.label}`, onclick: () => { g.options.splice(oi, 1); drawRows(); drawPreview(); } }, 'Remove')));
      });
    };
    drawRows();
    kind.control.addEventListener('change', () => { g.kind = kind.control.value; if (g.kind === 'single') { let seen = false; g.options.forEach((o) => { if (o.is_default && seen) o.is_default = false; seen ||= o.is_default; }); } drawRows(); drawPreview(); });
    label.control.addEventListener('input', () => { g.label = label.control.value; drawPreview(); });
    const actions = el('div', { className: 'btn-row' });
    const fb = feedback(actions);
    const move = (dir) => async () => {
      const j = gi + dir; [groups[gi], groups[j]] = [groups[j], groups[gi]];
      try { for (const [i, x] of groups.entries()) { x.sort_order = i + 1; if (x.id) await api.saveOptionGroup(product.id, x); } await drawPublish(); } catch (e) { fb.error(e.message); }
      drawGroups();
    };
    const saveBtn = el('button', { type: 'button', className: 'btn' }, 'Save group');
    saveBtn.addEventListener('click', () => saving(saveBtn, fb, async () => {
      const problem = validateGroup(g, g.options.map((o) => ({ ...o, price_delta_pence: o.price_delta_pence })));
      if (problem) throw new Error(problem);
      g.sort_order = gi + 1;
      const id = await api.saveOptionGroup(product.id, g);
      await load(); const fresh = products.find((p) => p.id === product.id);
      const idx = gi; const saved = (fresh.option_groups.find((x) => x.id === g.id) || fresh.option_groups.find((x) => x.id === id) || fresh.option_groups[idx]);
      if (saved) groups[gi] = JSON.parse(JSON.stringify(saved));
      await drawPublish(); drawGroups();
    }));
    const delBtn = el('button', { type: 'button', className: 'btn btn-danger btn-small' }, 'Delete group');
    delBtn.addEventListener('click', async () => {
      if (!window.confirm(`Delete the group "${g.label || 'new group'}" and its options?`)) return;
      try { if (g.id) await api.deleteOptionGroup(product.id, g.id); groups.splice(gi, 1); await drawPublish(); drawGroups(); } catch (e) { fb.error(e.message); }
    });
    actions.prepend(saveBtn, el('button', { type: 'button', className: 'btn btn-secondary btn-small', disabled: gi === 0, 'aria-label': 'Move group up', onclick: move(-1) }, '↑'),
      el('button', { type: 'button', className: 'btn btn-secondary btn-small', disabled: gi === groups.length - 1, 'aria-label': 'Move group down', onclick: move(1) }, '↓'), delBtn);
    return el('div', { className: 'group-card' }, label.wrap, kind.wrap, groupActive.row, rows,
      el('div', { className: 'btn-row' }, el('button', { type: 'button', className: 'btn btn-secondary btn-small', onclick: () => { g.options.push({ id: null, label: '', price_delta_pence: 0, is_default: g.kind === 'single' && !g.options.some((o) => o.is_default), active: true }); drawRows(); drawPreview(); } }, 'Add an option')), actions);
  }
  drawGroups();

  // 5. Ingredients and allergens
  const ingredients = field('Ingredients', 'textarea', { value: product.ingredients_text ?? '', rows: 4, maxLength: 2000 });
  const note = field('May contain note (optional)', 'textarea', { value: product.allergen_note ?? '', rows: 2, maxLength: 500, hint: 'For example "Made in a kitchen that also handles nuts."' });
  const boxes = ALLERGENS.map((a) => ({ a, input: el('input', { type: 'checkbox', checked: (product.allergens || []).includes(a.key) }) }));
  editorBox.append(panel('Ingredients and allergens',
    el('p', { className: 'warning' }, 'This information must be accurate and checked. Wording for legal statements comes from you and the council. If you are not sure, leave it empty: nothing is shown on the site.'),
    ingredients.wrap, el('fieldset', { className: 'allergens' }, el('legend', {}, 'Contains (tick all that apply)'), ...boxes.map(({ a, input }) => el('label', { className: 'check' }, input, ` ${a.label}`))), note.wrap,
    saveRow('Save ingredients and allergens', async () => savePatch({ ingredients_text: ingredients.control.value, allergens: boxes.filter((b) => b.input.checked).map((b) => b.a.key), allergen_note: note.control.value }))));
}

// Shrinks a photo in the browser before upload (longest edge PHOTO_MAX_EDGE) and returns a WebP (or JPEG) blob.
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

addButton.addEventListener('click', () => edit(null));
try { await load(); drawList(); await drawPublish(); }
catch (e) { listBox.replaceChildren(el('p', { className: 'error', role: 'alert' }, `The products could not be loaded: ${e.message}`)); }
