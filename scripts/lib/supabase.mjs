// Build-time reads from Supabase (architecture section 7, steps 2 and 5). Public data only, with the publishable key.
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const SELECT = 'slug,name,kind,category,unit_label,price_pence,available,photo_path,photo_alt,sort_order,allergen_note,allergens_checked_at,'
  + 'product_allergens(allergens(name,sort_order)),product_ingredients(name,sort_order),'
  + 'product_option_groups(id,label,kind,sort_order,active,product_options(id,label,price_delta_pence,is_default,sort_order,active)),product_stock(quantity)';
export const PHOTO_SIZES = [400, 800]; // widths written for each photo (the -400 file and the full size)
const BUCKET = 'product-images';
const FETCH_TIMEOUT_MS = 20000;

async function get(url, key) {
  const res = await fetch(url, { headers: { apikey: key }, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`${url.split('?')[0]} answered ${res.status}`);
  return res;
}

// Maps database rows to the shape the renderer and the seed file use. Only active, priced products come back from the REST
// query (the policy hides inactive ones); a product with no price is left out of the shop.
export function mapProducts(rows) {
  return rows.map((r) => {
    const groups = (r.product_option_groups || []).filter((g) => g.active)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((g) => ({
        id: g.id, label: g.label, kind: g.kind,
        options: (g.product_options || []).filter((o) => o.active).sort((a, b) => a.sort_order - b.sort_order)
          .map((o) => ({ id: o.id, label: o.label, price_delta_pence: o.price_delta_pence, is_default: o.is_default })),
      })).filter((g) => g.options.length);
    const stock = Array.isArray(r.product_stock) ? r.product_stock[0] : r.product_stock;
    return {
      slug: r.slug, name: r.name, kind: r.kind, category: r.category ?? undefined, unit_label: r.unit_label, price_pence: r.price_pence,
      available: r.available, photo_path: r.photo_path, photo_alt: r.photo_alt ?? undefined, sort_order: r.sort_order,
      // allergens and ingredients come from the tables the admin edits (D-062), in her order; nothing is invented when there are none
      ingredients: (r.product_ingredients || []).slice().sort((a, b) => a.sort_order - b.sort_order).map((i) => i.name),
      allergens: (r.product_allergens || []).map((x) => x.allergens).filter(Boolean).sort((a, b) => a.sort_order - b.sort_order).map((a) => a.name),
      allergen_note: r.allergen_note ?? undefined,
      stock_quantity: stock ? stock.quantity : null, option_groups: groups,
    };
  }).filter((p) => p.price_pence != null);
}

// Active products with their options and stock. Throws on a failed or empty fetch: the caller fails the build, so the live
// site is never overwritten with stale or missing prices.
export async function fetchProducts({ url, key }) {
  const res = await get(`${url.replace(/\/+$/, '')}/rest/v1/products?select=${encodeURIComponent(SELECT)}&active=eq.true&order=sort_order`, key);
  const products = mapProducts(await res.json());
  if (!products.length) throw new Error('Supabase returned no active products with a price');
  return products;
}

// A photo_path with no file extension is a static image already in the repo (assets/img/<name>.webp); anything else is a file
// in the product-images bucket: it is downloaded and written as dist/assets/products/<slug>.webp and <slug>-400.webp.
export async function buildPhotos(products, { url, key, dist, sharp }) {
  const out = join(dist, 'assets', 'products');
  for (const p of products) {
    if (!p.photo_path || !/\.(jpe?g|png|webp)$/i.test(p.photo_path)) { p.photo = p.photo_path || undefined; continue; }
    if (!p.photo_alt) throw new Error(`Product "${p.slug}" has a photo but no alt text. Add the alt text in the admin.`);
    const res = await get(`${url.replace(/\/+$/, '')}/storage/v1/object/public/${BUCKET}/${p.photo_path.split('/').map(encodeURIComponent).join('/')}`, key);
    const input = Buffer.from(await res.arrayBuffer());
    await mkdir(out, { recursive: true });
    for (const width of PHOTO_SIZES) {
      const file = width === PHOTO_SIZES[PHOTO_SIZES.length - 1] ? `${p.slug}.webp` : `${p.slug}-${width}.webp`;
      await writeFile(join(out, file), await sharp(input).rotate().resize({ width, height: width, fit: 'cover' }).webp({ quality: 80 }).toBuffer());
    }
    p.photo = `products/${p.slug}`;
  }
}
