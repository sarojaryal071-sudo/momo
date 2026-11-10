// Shop page: quantity controls and add to cart. The page works as plain HTML without this script.
import { getCart, updateHeaderCount } from './cart.js';
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
  }
});
document.addEventListener('change', (e) => {
  if (e.target.matches('[data-qty-input]')) e.target.value = clampQty(e.target.value);
});
