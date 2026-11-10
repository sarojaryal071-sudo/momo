// Pure functions that render the marked product regions and JSON-LD. Used by build.mjs and the tests.
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

import { formatPrice } from '../../frontend/js/cart.js';
import { HOME_PRODUCT_LIMIT, KIND_LABELS, SEARCH_MIN_PRODUCTS, siteConfig } from '../../frontend/js/site-config.js';

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

const PACK_ALT = 'A bag of frozen momo tied with twine and a blank paper tag';
const MEDIA_SIZES = '(min-width: 40em) 22rem, 90vw';
const kindLabel = (kind) => KIND_LABELS[kind] || kind.charAt(0).toUpperCase() + kind.slice(1);

// Image tile: the product photo, or a quiet drawn placeholder until a photo exists.
function mediaHtml(p) {
  if (p.photo) {
    const base = `assets/img/${esc(p.photo)}`;
    const multiply = p.photo.startsWith('pack-'); // opaque shots on white: blended into the tinted tile
    return `<div class="card-media${multiply ? ' card-media-multiply' : ''}"><img src="${base}.webp" srcset="${base}-400.webp 400w, ${base}.webp 800w" sizes="${MEDIA_SIZES}" width="800" height="800" alt="${p.photo.startsWith('pack-') ? PACK_ALT : esc(p.name)}" loading="lazy"></div>`;
  }
  const art = p.kind === 'addon' ? 'bowl' : 'momo';
  return `<div class="card-media card-art card-art-${art}" role="img" aria-label="Photo coming soon"><span class="card-soon">Photo coming soon</span></div>`;
}

function priceBlock(p) {
  if (p.price_pence == null) return `<p class="card-price">Price to be confirmed <span data-todo>TODO: price to be confirmed by owner</span></p>`;
  return `<p class="card-price">${priceHtml(p)}</p>`;
}

function card(p) {
  const priced = p.price_pence != null;
  const buyable = p.available && priced;
  const attrs = `data-slug="${esc(p.slug)}"${priced ? ` data-price-pence="${p.price_pence}"` : ''} data-kind="${esc(p.kind)}" data-name="${esc(p.name.toLowerCase())}"`;
  const action = buyable
    ? `${qtyControl(p)}\n  ${addButton(p, '')}`
    : `<button type="button" class="btn btn-secondary" disabled>Not available yet<span class="visually-hidden">: ${esc(p.name)}</span></button>`;
  return `<li class="product-card" ${attrs}>
  ${mediaHtml(p)}
  <div class="card-body">
    <h3>${esc(p.name)}</h3>
    <p class="card-meta">${esc(p.unit_label)}${p.available ? '' : ' <span class="badge badge-unavailable">Unavailable</span>'}</p>
    ${priceBlock(p)}
    ${action}
  </div>
</li>`;
}

function toolsHtml(products) {
  const kinds = [...new Set(products.map((p) => p.kind))];
  const chips = kinds.length >= 2;
  const search = products.length >= SEARCH_MIN_PRODUCTS;
  if (!chips && !search) return '';
  const chipHtml = chips
    ? `<div class="chips" role="group" aria-label="Filter by type">
<button type="button" class="chip" data-filter="all" aria-pressed="true">All</button>
${kinds.map((k) => `<button type="button" class="chip" data-filter="${esc(k)}" aria-pressed="false">${esc(kindLabel(k))}</button>`).join('\n')}
</div>` : '';
  const searchHtml = search
    ? `<div class="search-box"><label class="visually-hidden" for="shop-search">Search products</label><input id="shop-search" type="search" placeholder="Search products" autocomplete="off" data-shop-search></div>` : '';
  return `<div class="shop-tools" data-shop-tools>
${chipHtml}
${searchHtml}
</div>
`;
}

const EMPTY = '<p class="empty-note">New items are coming soon.</p>';

export function renderRegion(page, products, siteUrl = '') {
  if (page === 'index') {
    const shown = products.filter((p) => p.available).slice(0, HOME_PRODUCT_LIMIT);
    if (!shown.length) return EMPTY;
    return `<div class="product-wrap">
<ul class="product-grid">
${shown.map(card).join('\n')}
</ul>
</div>`;
  }
  if (!products.length) return EMPTY;
  return `<div class="product-wrap">
${toolsHtml(products)}<ul class="product-grid" data-product-grid>
${products.map(card).join('\n')}
</ul>
<p class="empty-note" data-no-results hidden>No products match. Try another word or filter.</p>
</div>
${productJsonLd(products, siteUrl)}`;
}

export const REGION_RE = /(<!-- build:products -->)[\s\S]*?(<!-- \/build:products -->)/;
export const fillRegion = (html, inner) => html.replace(REGION_RE, (_, a, b) => `${a}\n${inner}\n${b}`);
