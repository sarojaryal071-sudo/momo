// Loads product and pickup data. products.json is written by the build; the seed files are the local-dev fallback.
const getJson = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
};

export async function loadProducts() {
  try { return await getJson('data/products.json'); } catch { return getJson('data/products.seed.json'); }
}

export const loadPickup = () => getJson('data/pickup.seed.json'); // TODO(step-3): read rules from Supabase
