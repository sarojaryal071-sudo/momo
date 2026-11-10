// Product cards and the details window. The pages work as plain HTML without this script:
// cards show name, size and price, and the name links to the shop. Here the cards gain Add, a stepper and the dialog.
import './main.js';
import { buildLines, formatPrice, getCart, updateHeaderCount } from './cart.js';
import { updateCheckoutBar } from './checkout-bar.js';
import { loadPickup } from './data.js';
import { usedKeyboard } from './input-mode.js';
import { earliestPickup, noticeText } from './pickup.js';
import { siteConfig } from './site-config.js';

const { maxQtyPerItem: MAX_QTY } = siteConfig.limits;
const cart = getCart();
let pickupConfig; // loaded the first time a customised choice needs the earliest date
let opener = null;

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};
const cardInfo = (card) => ({
  slug: card.dataset.slug,
  name: card.querySelector('h3').textContent,
  price: Number(card.dataset.pricePence),
  stock: card.dataset.stock === undefined ? null : Number(card.dataset.stock),
  hasOptions: card.dataset.hasOptions === 'true',
});
const clampQty = (v, max) => Math.min(max, Math.max(1, Math.floor(Number(v)) || 1));

function announce(card, text) {
  const note = card.querySelector('[data-added-note]');
  if (!note) return;
  note.textContent = text;
  clearTimeout(note.clearTimer);
  note.clearTimer = setTimeout(() => { note.textContent = ''; }, siteConfig.addedFlashMs * 3); // keeps the card short once announced
}

function refreshBars() {
  updateHeaderCount();
  updateCheckoutBar();
}

// ---- Card action: "Add", or a compact stepper once a plain item (no choices) is in the cart ----
function stepperFor(card, { slug, name, stock }, qty) {
  const wrap = el('div', 'stepper');
  wrap.setAttribute('role', 'group');
  wrap.setAttribute('aria-label', `Quantity of ${name}`);
  wrap.dataset.cardStepper = '';
  const minus = el('button', 'qty-btn', '−');
  minus.type = 'button';
  minus.setAttribute('aria-label', `Decrease quantity of ${name}`);
  minus.dataset.qtyMinus = '';
  const count = el('output', 'stepper-count', String(qty));
  const plus = el('button', 'qty-btn', '+');
  plus.type = 'button';
  plus.setAttribute('aria-label', `Increase quantity of ${name}`);
  plus.dataset.qtyPlus = '';
  plus.disabled = qty >= Math.min(stock ?? MAX_QTY, MAX_QTY);
  wrap.append(minus, count, plus);
  return wrap;
}

function renderCardAction(card) {
  const action = card.querySelector('[data-card-action]');
  if (!action) return;
  const info = cardInfo(card);
  const current = action.firstElementChild;
  const qty = info.hasOptions ? 0 : cart.qtyOf(info.slug);
  if (qty > 0) {
    if (!current.matches('[data-card-stepper]')) {
      const hadFocus = action.contains(document.activeElement);
      current.replaceWith(stepperFor(card, info, qty));
      if (hadFocus) action.querySelector('[data-qty-plus]').focus();
    } else {
      current.querySelector('output').textContent = String(qty);
      current.querySelector('[data-qty-plus]').disabled = qty >= Math.min(info.stock ?? MAX_QTY, MAX_QTY);
    }
  } else if (current.matches('[data-card-stepper]')) {
    const btn = el('button', 'btn btn-add');
    btn.type = 'button';
    btn.dataset.addToCart = '';
    btn.append('Add to cart', Object.assign(el('span', 'visually-hidden'), { textContent: `: ${info.name}` }));
    const hadFocus = action.contains(document.activeElement);
    current.replaceWith(btn);
    if (hadFocus) btn.focus();
  }
}

function plainAdd(card) {
  const info = cardInfo(card);
  const room = Math.min(info.stock ?? MAX_QTY, MAX_QTY) - cart.qtyOf(info.slug);
  if (room <= 0) { announce(card, info.stock !== null ? `Only ${info.stock} available.` : 'You have the most you can order.'); return; }
  if (!cart.add(info.slug, 1)) { announce(card, 'Your cart is full. Remove something first.'); return; }
  announce(card, `Added 1 x ${info.name} to your cart.`);
  renderCardAction(card);
  refreshBars();
}

function stepCard(card, direction) {
  const info = cardInfo(card);
  const qty = cart.qtyOf(info.slug);
  if (direction > 0) {
    if (qty >= Math.min(info.stock ?? MAX_QTY, MAX_QTY)) return;
    cart.add(info.slug, 1);
  } else if (qty <= 1) cart.remove(info.slug);
  else cart.setQty(info.slug, qty - 1);
  announce(card, direction > 0 ? `${cart.qtyOf(info.slug)} x ${info.name} in your cart.` : `Removed one ${info.name}.`);
  renderCardAction(card);
  refreshBars();
}

// ---- The details window ----
const chosen = (dlg) => [...dlg.querySelectorAll('input:checked')];
const nonDefaultIds = (dlg) => chosen(dlg).filter((i) => i.dataset.default === 'false').map((i) => i.value);

async function earliestText() {
  try {
    pickupConfig ??= await loadPickup();
    const first = earliestPickup(pickupConfig, new Date(), siteConfig.customMinLeadHours);
    return first ? ` Earliest pickup: ${first.label}.` : ' No pickup dates are available yet.';
  } catch { return ''; }
}

async function updateDialog(dlg) {
  const card = dlg.closest('[data-slug]');
  const info = cardInfo(card);
  const ids = nonDefaultIds(dlg);
  const customised = ids.length > 0;
  const delta = chosen(dlg).reduce((sum, i) => sum + Number(i.dataset.delta || 0), 0);
  const inCart = customised || info.stock === null ? 0 : cart.qtyOf(info.slug);
  const limit = customised || info.stock === null ? MAX_QTY : Math.max(0, Math.min(info.stock, MAX_QTY) - inCart);
  const output = dlg.querySelector('[data-qty-value]');
  if (!output) return;
  const qty = limit === 0 ? 1 : clampQty(output.textContent, limit);
  output.textContent = String(qty);
  dlg.querySelector('[data-qty-plus]').disabled = qty >= limit;
  dlg.querySelector('[data-qty-minus]').disabled = qty <= 1;
  const add = dlg.querySelector('[data-dialog-add]');
  add.disabled = limit === 0;
  dlg.querySelector('[data-dialog-total]').textContent = limit === 0 ? '' : ` · ${formatPrice((info.price + delta) * qty)}`;
  // Stock: only standard lines use the frozen stock; customised lines are made to order.
  const stockLine = dlg.querySelector('[data-stock-line]');
  let text = '';
  if (!customised && info.stock !== null) {
    if (limit === 0 && info.stock > 0) text = `All ${info.stock} are already in your cart.`;
    else if (info.stock <= siteConfig.lowStockThreshold) text = `Only ${info.stock} left`;
  }
  stockLine.replaceChildren();
  if (text) {
    if (card.dataset.stockSample !== undefined) {
      const wrap = el('span', '', text + ' ');
      wrap.dataset.placeholder = '';
      wrap.append(el('span', 'sample-label', 'sample'));
      stockLine.append(wrap);
    } else stockLine.textContent = text;
  }
  stockLine.hidden = !text;
  // Customised: longer notice and the earliest pickup date.
  const note = dlg.querySelector('[data-custom-note]');
  note.hidden = !customised;
  if (customised) {
    note.textContent = `Customised: needs ${noticeText(siteConfig.customMinLeadHours)}' notice.`;
    const extra = await earliestText();
    if (nonDefaultIds(dlg).length) note.textContent += extra;
  }
}

function resetDialog(dlg) {
  dlg.querySelectorAll('input').forEach((i) => { i.checked = i.dataset.default === 'true'; });
  const output = dlg.querySelector('[data-qty-value]');
  if (output) output.textContent = '1';
}

function openDialog(card, from) {
  const dlg = card.querySelector('dialog');
  if (!dlg || dlg.open) return;
  opener = from;
  resetDialog(dlg);
  dlg.showModal(); // the panel has autofocus, so a touch or mouse open leaves no focus ring on the close button
  if (usedKeyboard()) dlg.querySelector('[data-dialog-close]').focus();
  updateDialog(dlg);
}

function addFromDialog(dlg) {
  const card = dlg.closest('[data-slug]');
  const info = cardInfo(card);
  const qty = Number(dlg.querySelector('[data-qty-value]').textContent);
  const ids = nonDefaultIds(dlg);
  if (!cart.add(info.slug, qty, ids)) { dlg.querySelector('[data-custom-note]').textContent = 'Your cart is full. Remove something first.'; dlg.querySelector('[data-custom-note]').hidden = false; return; }
  announce(card, `Added ${qty} x ${info.name}${ids.length ? ' (customised)' : ''} to your cart.`);
  dlg.close();
  renderCardAction(card);
  refreshBars();
}

document.addEventListener('click', (e) => {
  const card = e.target.closest('[data-slug]');
  if (!card) return;
  const dlg = e.target.closest('dialog');
  if (dlg) { // inside the window
    if (e.target.closest('[data-dialog-close]')) dlg.close();
    else if (e.target.closest('[data-dialog-add]')) addFromDialog(dlg);
    else if (e.target.closest('[data-qty-plus]') || e.target.closest('[data-qty-minus]')) {
      const output = dlg.querySelector('[data-qty-value]');
      output.textContent = String(Number(output.textContent) + (e.target.closest('[data-qty-plus]') ? 1 : -1));
      updateDialog(dlg);
    }
    return;
  }
  const add = e.target.closest('[data-add-to-cart]');
  if (add) {
    if (card.dataset.hasOptions === 'true') openDialog(card, add); // choices first
    else plainAdd(card);
  } else if (e.target.closest('[data-qty-plus]')) stepCard(card, 1);
  else if (e.target.closest('[data-qty-minus]')) stepCard(card, -1);
  else if (e.target.closest('[data-card-open]') || e.target.closest('.card-media')) {
    e.preventDefault();
    openDialog(card, e.target.closest('[data-card-open]') || card.querySelector('[data-card-open]'));
  }
});

// Backdrop click: the dialog element itself is the target when the click lands outside the panel.
document.addEventListener('click', (e) => { if (e.target.matches('dialog[data-dialog]')) e.target.close(); });
document.addEventListener('change', (e) => { const dlg = e.target.closest('dialog[data-dialog]'); if (dlg && e.target.matches('input')) updateDialog(dlg); });
// "close" does not bubble, so listen in the capture phase. Focus goes back to whatever opened the window.
document.addEventListener('close', (e) => { if (e.target.matches('dialog[data-dialog]')) { opener?.focus(); opener = null; } }, true);

// Swipe down on the handle or header closes the sheet (touch and pen only).
let drag = null;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
document.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse') return;
  const grip = e.target.closest('[data-dialog-head], [data-dialog-handle]');
  if (!grip || e.target.closest('[data-dialog-close]')) return;
  drag = { dlg: grip.closest('dialog'), y: e.clientY, dy: 0 };
});
document.addEventListener('pointermove', (e) => {
  if (!drag) return;
  drag.dy = Math.max(0, e.clientY - drag.y);
  if (!reduceMotion.matches) drag.dlg.style.translate = `0 ${drag.dy}px`; // follows the finger; with reduced motion it only closes
});
const endDrag = () => {
  if (!drag) return;
  const { dlg, dy } = drag;
  drag = null;
  dlg.style.translate = '';
  if (dy > siteConfig.swipeClosePx) dlg.close();
};
document.addEventListener('pointerup', endDrag);
document.addEventListener('pointercancel', endDrag);

document.querySelectorAll('[data-slug]').forEach(renderCardAction);

// ---- Filter chips and search. Every card is in the HTML; this only hides and shows them. ----
const tools = document.querySelector('[data-shop-tools]');
const cards = [...document.querySelectorAll('[data-product-grid] [data-slug]')];
const noResults = document.querySelector('[data-no-results]');
const searchInput = document.querySelector('[data-shop-search]');
const chips = [...document.querySelectorAll('[data-filter]')];
let activeKind = 'all';

function applyFilters() {
  const q = searchInput ? searchInput.value.trim().toLowerCase() : '';
  let shown = 0;
  for (const card of cards) {
    const match = (activeKind === 'all' || card.dataset.kind === activeKind) && (!q || card.dataset.name.includes(q));
    card.hidden = !match;
    if (match) shown += 1;
  }
  if (noResults) noResults.hidden = shown > 0;
}

function setKind(kind) {
  activeKind = chips.some((c) => c.dataset.filter === kind) ? kind : 'all';
  chips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.filter === activeKind)));
  applyFilters();
}

if (tools) {
  chips.forEach((c) => c.addEventListener('click', () => setKind(c.dataset.filter)));
  if (searchInput) searchInput.addEventListener('input', applyFilters);
  setKind(new URLSearchParams(location.search).get('kind') || 'all');
}
