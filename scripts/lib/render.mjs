// Pure functions that render the marked product regions and JSON-LD. Used by build.mjs and the tests.
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

import { formatPrice } from '../../frontend/js/cart.js';
import { HOME_PRODUCT_LIMIT, KIND_LABELS, LOW_STOCK_THRESHOLD, SEARCH_MIN_PRODUCTS, siteConfig } from '../../frontend/js/site-config.js';

export { formatPrice };
const SAMPLE = '<span class="sample-label">sample</span>';
const priceHtml = (p) => (p.placeholder ? `<span data-placeholder>${formatPrice(p.price_pence)} ${SAMPLE}</span>` : formatPrice(p.price_pence));

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
function mediaHtml(p, sizes = MEDIA_SIZES, cls = '') {
  if (p.photo) {
    const base = `assets/img/${esc(p.photo)}`;
    const multiply = p.photo.startsWith('pack-'); // opaque shots on white: blended into the tinted tile
    return `<div class="card-media${cls}${multiply ? ' card-media-multiply' : ''}"><img src="${base}.webp" srcset="${base}-400.webp 400w, ${base}.webp 800w" sizes="${sizes}" width="800" height="800" alt="${multiply ? PACK_ALT : esc(p.name)}" loading="lazy"></div>`;
  }
  const art = p.kind === 'addon' ? 'bowl' : 'momo';
  return `<div class="card-media${cls} card-art card-art-${art}" role="img" aria-label="Photo coming soon"><span class="card-soon">Photo coming soon</span></div>`;
}

function priceBlock(p) {
  if (p.price_pence == null) return `<p class="card-price">Price to be confirmed <span data-todo>TODO: price to be confirmed by owner</span></p>`;
  return `<p class="card-price">${priceHtml(p)}</p>`;
}

const SAMPLE_TAG = ' <span class="sample-label">sample</span>';
const groupsOf = (p) => (p.option_groups || []).filter((g) => (g.options || []).length);
const hasOptions = (p) => groupsOf(p).length > 0;
const isSoldOut = (p) => Number.isInteger(p.stock_quantity) && p.stock_quantity === 0;
const delta = (o) => (o.price_delta_pence ? ` <span class="opt-delta">+ ${formatPrice(o.price_delta_pence)}</span>` : '');

function optionGroupHtml(p, g) {
  const single = g.kind === 'single';
  const inputs = g.options.map((o) => `<label class="opt"><input type="${single ? 'radio' : 'checkbox'}" name="opt-${esc(p.slug)}-${esc(g.id)}" value="${esc(o.id)}" data-delta="${o.price_delta_pence || 0}" data-default="${o.is_default ? 'true' : 'false'}"${o.is_default ? ' checked' : ''}> <span>${esc(o.label)}</span>${delta(o)}</label>`).join('\n      ');
  return `<fieldset class="opt-group" data-group="${esc(g.id)}" data-kind="${esc(g.kind)}">
      <legend>${esc(g.label)}${g.placeholder ? SAMPLE_TAG : ''}</legend>
      ${inputs}
    </fieldset>`;
}

// The details window: one native dialog per product, with its text in the page source.
function dialogHtml(p) {
  const priced = p.price_pence != null;
  const stock = Number.isInteger(p.stock_quantity) ? p.stock_quantity : null;
  const soldOut = isSoldOut(p);
  const lowStock = stock !== null && stock > 0 && stock <= LOW_STOCK_THRESHOLD;
  const stockText = soldOut ? 'Sold out' : lowStock ? `Only ${stock} left` : '';
  const stockLine = `<p class="stock-line" data-stock-line${stockText ? '' : ' hidden'}>${stockText ? (p.stock_placeholder ? `<span data-placeholder>${stockText}${SAMPLE_TAG}</span>` : stockText) : ''}</p>`;
  const buy = priced && p.available && !soldOut
    ? `<div class="dialog-buy">
      <div class="stepper" role="group" aria-label="Quantity of ${esc(p.name)}">
        <button type="button" class="qty-btn" data-qty-minus aria-label="Decrease quantity of ${esc(p.name)}">&minus;</button>
        <output class="stepper-count" data-qty-value>1</output>
        <button type="button" class="qty-btn" data-qty-plus aria-label="Increase quantity of ${esc(p.name)}">+</button>
      </div>
      <button type="button" class="btn" data-dialog-add>Add to cart<span data-dialog-total> · ${formatPrice(p.price_pence)}</span></button>
    </div>`
    : (soldOut ? '' : '<p class="stock-line">Not available yet</p>');
  return `<dialog class="product-dialog" aria-labelledby="dlg-${esc(p.slug)}-title" data-dialog>
  <div class="dialog-panel">
    <button type="button" class="dialog-close" data-dialog-close aria-label="Close"><svg class="menu-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5 L19 19 M19 5 L5 19"/></svg></button>
    ${mediaHtml(p, '(min-width: 48em) 24rem, 90vw', ' dialog-media')}
    <h2 id="dlg-${esc(p.slug)}-title">${esc(p.name)}</h2>
    <p class="card-meta">${esc(p.unit_label)}</p>
    ${priceBlock(p)}
    <section class="dialog-section">
      <h3>Ingredients and allergens</h3>
      <p data-todo>TODO: ingredients and allergen information from the owner</p>
    </section>
    <div class="dialog-form" data-options>
    ${groupsOf(p).map((g) => optionGroupHtml(p, g)).join('\n    ')}
    <p class="custom-note" data-custom-note hidden></p>
    ${stockLine}
    ${buy}
    <!-- TODO: owner and council to approve the allergy wording below -->
    <p class="allergy-line" data-todo>Options are preferences, not an allergy guarantee. Tell us about any allergy before you order.</p>
    </div>
  </div>
</dialog>`;
}

function card(p) {
  const priced = p.price_pence != null;
  const stock = Number.isInteger(p.stock_quantity) ? p.stock_quantity : null;
  const soldOut = isSoldOut(p);
  const buyable = p.available && priced && !soldOut;
  const attrs = `id="product-${esc(p.slug)}" data-slug="${esc(p.slug)}"${priced ? ` data-price-pence="${p.price_pence}"` : ''} data-kind="${esc(p.kind)}" data-name="${esc(p.name.toLowerCase())}" data-has-options="${hasOptions(p)}"${stock !== null ? ` data-stock="${stock}"` : ''}${stock !== null && p.stock_placeholder ? ' data-stock-sample' : ''}`;
  const action = buyable
    ? `<div class="card-action" data-card-action>
      <button type="button" class="btn btn-add" data-add-to-cart>Add<span class="visually-hidden">: ${esc(p.name)}</span></button>
      <p class="added-note" role="status" data-added-note></p>
    </div>`
    : `<div class="card-action"><p class="badge badge-unavailable">${soldOut ? 'Sold out' : 'Not available yet'}</p></div>`;
  return `<li class="product-card" ${attrs}>
  ${mediaHtml(p)}
  <div class="card-body">
    <h3><a class="card-link" href="shop.html#product-${esc(p.slug)}" data-card-open>${esc(p.name)}</a></h3>
    <p class="card-meta">${esc(p.unit_label)}${p.available ? '' : ' <span class="badge badge-unavailable">Unavailable</span>'}</p>
    ${priceBlock(p)}
    ${action}
  </div>
  ${dialogHtml(p)}
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
