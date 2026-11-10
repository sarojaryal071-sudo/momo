// Shop page: quantity controls and add to cart. The page works as plain HTML without this script.
import './main.js';
import { getCart, updateHeaderCount } from './cart.js';
import { updateCheckoutBar } from './checkout-bar.js';
import { siteConfig } from './site-config.js';

const max = siteConfig.limits.maxQtyPerItem;
const clampQty = (v) => Math.min(max, Math.max(1, Math.floor(Number(v)) || 1));

document.addEventListener('click', (e) => {
  const item = e.target.closest('[data-slug]');
  if (!item) return;
  const input = item.querySelector('[data-qty-input]');
  if (e.target.closest('[data-qty-minus]')) input.value = clampQty(Number(input.value) - 1);
  else if (e.target.closest('[data-qty-plus]')) input.value = clampQty(Number(input.value) + 1);
  else if (e.target.closest('[data-add-to-cart]')) {
    const qty = clampQty(input.value);
    input.value = qty;
    const name = item.querySelector('h3').textContent;
    const note = item.querySelector('[data-added-note]');
    const ok = getCart().add(item.dataset.slug, qty);
    note.textContent = ok ? `Added ${qty} x ${name} to your cart.` : 'Your cart is full. Remove something first.';
    updateHeaderCount();
    updateCheckoutBar();
    flashAdded(e.target.closest('[data-add-to-cart]'));
  }
});

// The button says "Added" for a moment. The live region under it announces the details.
function flashAdded(btn) {
  const label = btn.firstChild;
  btn.dataset.label ??= label.nodeValue;
  label.nodeValue = 'Added';
  clearTimeout(btn.flashTimer);
  btn.flashTimer = setTimeout(() => { label.nodeValue = btn.dataset.label; }, siteConfig.addedFlashMs);
  const note = btn.parentElement.querySelector('[data-added-note]'); // keeps the card short once the announcement has been made
  clearTimeout(note.clearTimer);
  note.clearTimer = setTimeout(() => { note.textContent = ''; }, siteConfig.addedFlashMs * 3);
}
document.addEventListener('change', (e) => {
  if (e.target.matches('[data-qty-input]')) e.target.value = clampQty(e.target.value);
});

// Filter chips and search. Every card is in the HTML; this only hides and shows them.
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
