// Sticky bar with the cart summary and a way to the cart. Hidden until the cart has items.
import { buildLines, cartTotal, formatPrice, getCart } from './cart.js';
import { loadProducts } from './data.js';

let products;

export async function updateCheckoutBar() {
  const bar = document.querySelector('[data-checkout-bar]');
  if (!bar) return;
  const count = getCart().count();
  if (!count) {
    bar.hidden = true;
    document.body.classList.remove('has-checkout-bar');
    return;
  }
  let text = `${count} ${count === 1 ? 'item' : 'items'}`;
  const summary = bar.querySelector('[data-checkout-summary]');
  summary.textContent = text; // show the count straight away; the total follows once prices are loaded
  bar.hidden = false;
  document.body.classList.add('has-checkout-bar');
  try {
    products ??= await loadProducts();
    const lines = buildLines(getCart().items(), products);
    if (lines.every((l) => !l.unavailable)) text += ` · ${formatPrice(cartTotal(lines))}`; // an unpriced item means the count alone
  } catch { /* the count is enough */ }
  summary.textContent = text;
}
