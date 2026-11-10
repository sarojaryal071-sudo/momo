// Browser configuration (public values only). One place for limits and settings (D-022).
// Shop growth rules (D-028). Counts of products, not prices.
export const HOME_PRODUCT_LIMIT = 8; // most product cards on the home page
export const SEARCH_MIN_PRODUCTS = 8; // the shop search box appears from this many products
export const KIND_LABELS = { pack: 'Momo', addon: 'Sauces' }; // filter chip labels by product kind

export const siteConfig = {
  backend: 'mock', // 'mock' or 'supabase' (Step 3)
  whatsappNumber: '447413069241', // also her phone number; the same digits are in the HTML links and scripts/build.mjs
  currency: 'GBP',
  socialLinks: { instagram: '' }, // the build fills the footer and menu Instagram line from this; empty shows a visible placeholder
  supabaseUrl: '',
  supabaseAnonKey: '',
  limits: {
    maxQtyPerItem: 10,
    maxLineItems: 20,
    nameMax: 80,
    phoneMax: 20,
    notesMax: 500,
    waLinkMax: 1800,
  },
  homeProductLimit: HOME_PRODUCT_LIMIT,
  searchMinProducts: SEARCH_MIN_PRODUCTS,
  kindLabels: KIND_LABELS,
  gatewayTimeoutMs: 8000,
  autoOpenDelayMs: 1500,
  addedFlashMs: 1600, // how long the Add to cart button says "Added"
  mock: { orderNumber: 'SS-TEST-01', delayMs: 400 },
};
