// Pure functions that render the marked product regions and JSON-LD. Used by build.mjs and the tests.
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

import { formatPrice } from '../../frontend/js/cart.js';
import { siteConfig } from '../../frontend/js/site-config.js';

export { formatPrice };
const SAMPLE = '<span class="sample-label">sample</span>';
const priceHtml = (p) => (p.placeholder ? `<span data-placeholder>${formatPrice(p.price_pence)} ${SAMPLE}</span>` : formatPrice(p.price_pence));

function qtyControl(p) {
  const n = esc(p.name);
  return `<div class="qty" role="group" aria-label="Quantity of ${n}">
  <button type="button" class="qty-btn" data-qty-minus aria-label="Decrease quantity of ${n}">&minus;</button>
  <input class="qty-input" type="number" inputmode="numeric" min="1" max="${siteConfig.limits.maxQtyPerItem}" value="1" aria-label="Quantity of ${n}" data-qty-input>
  <button type="button" class="qty-btn" data-qty-plus aria-label="Increase quantity of ${n}">+</button>
</div>`;
}
const addButton = (p, cls) => `<button type="button" class="btn${cls}" data-add-to-cart>Add to cart<span class="visually-hidden">: ${esc(p.name)}</span></button>
<p class="added-note" role="status" data-added-note></p>`;

const byOrder = (a, b) => a.sort_order - b.sort_order;
export const merge = (products, content) =>
  products.map((p) => ({ ...p, ...(content[p.slug] || {}) })).sort(byOrder);

function productJsonLd(products, siteUrl) {
  const base = siteUrl ? `${siteUrl}/` : '';
  const items = products.filter((p) => p.price_pence != null && !p.placeholder).map((p) => ({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.description || p.summary || `${p.name}, ${p.unit_label}`,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'GBP',
      price: (p.price_pence / 100).toFixed(2),
      availability: p.available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `${base}shop.html`,
    },
  }));
  return items.map((j) => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join('\n');
}

function packItem(p) {
  return `<li class="menu-item" data-slug="${esc(p.slug)}" data-price-pence="${p.price_pence}">
  <h3>${esc(p.name)}</h3>
  <p class="menu-meta">${esc(p.unit_label)} — ${priceHtml(p)}</p>
  <p class="menu-desc">${esc(p.description || p.summary || '')}</p>
  ${qtyControl(p)}
  ${addButton(p, '')}
</li>`;
}

function addonItem(p) {
  const priced = p.price_pence != null;
  const buyable = p.available && priced;
  const attrs = `data-slug="${esc(p.slug)}"${priced ? ` data-price-pence="${p.price_pence}"` : ''}`;
  const meta = priced
    ? `${esc(p.unit_label)} — ${priceHtml(p)}`
    : `${esc(p.unit_label)} — Price to be confirmed <span data-todo>TODO: price to be confirmed by owner</span>`;
  const action = buyable
    ? `${qtyControl(p)}\n  ${addButton(p, ' btn-secondary')}`
    : `<button type="button" class="btn btn-secondary" disabled>Not available yet<span class="visually-hidden">: ${esc(p.name)}</span></button>`;
  return `<li class="addon-item" ${attrs}>
  <h3>${esc(p.name)}</h3>
  <p class="menu-meta">${meta}</p>
  ${action}
</li>`;
}

export function renderRegion(page, products, siteUrl = '') {
  const packs = products.filter((p) => p.kind === 'pack');
  const addons = products.filter((p) => p.kind === 'addon');
  if (page === 'index') {
    return `<ul class="pack-list">
${packs.map((p) => `<li class="pack-row" data-slug="${esc(p.slug)}" data-price-pence="${p.price_pence}"><span class="pack-name">${esc(p.name)}</span> <span class="pack-meta">${esc(p.unit_label)} — ${priceHtml(p)}</span></li>`).join('\n')}
</ul>`;
  }
  return `<section class="menu-board" aria-labelledby="menu-title">
<h2 id="menu-title">The momo</h2>
<ul class="menu-list">
${packs.map(packItem).join('\n')}
</ul>
</section>
<section class="addons" aria-labelledby="addons-title">
<h2 id="addons-title">Sauce pots</h2>
<ul class="addon-list">
${addons.map(addonItem).join('\n')}
</ul>
</section>
${productJsonLd(products, siteUrl)}`;
}

export const REGION_RE = /(<!-- build:products -->)[\s\S]*?(<!-- \/build:products -->)/;
export const fillRegion = (html, inner) => html.replace(REGION_RE, (_, a, b) => `${a}\n${inner}\n${b}`);
