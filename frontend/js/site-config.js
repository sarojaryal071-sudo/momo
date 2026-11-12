// Browser configuration (public values only). One place for limits and settings (D-022).
// Shop growth rules (D-028). Counts of products, not prices.
export const HOME_PRODUCT_LIMIT = 8; // most product cards on the home page
export const SEARCH_MIN_PRODUCTS = 8; // the shop search box appears from this many products
export const LOW_STOCK_THRESHOLD = 5; // "Only N left" shows at or below this many
export const CUSTOM_MIN_LEAD_HOURS = 48; // mock value: minimum notice for a cart with a customised item (Step 3 reads the setting)
export const PICKUP_STEP_MINUTES = 1; // pickup times can be any minute inside her window (D-038); Step 3 reads the rule's slot_minutes
export const KIND_LABELS = { pack: 'Momo', addon: 'Sauces' }; // filter chip labels by product kind

export const siteConfig = {
  backend: 'mock', // 'mock' or 'supabase' (Step 3)
  whatsappNumber: '447413069241', // also her phone number; the same digits are in the HTML links and scripts/build.mjs
  currency: 'GBP',
  socialLinks: { instagram: '' }, // the build fills the footer and menu Instagram line from this; empty hides the line
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
  pickupStepMinutes: PICKUP_STEP_MINUTES,
  lowStockThreshold: LOW_STOCK_THRESHOLD,
  customMinLeadHours: CUSTOM_MIN_LEAD_HOURS,
  homeProductLimit: HOME_PRODUCT_LIMIT,
  searchMinProducts: SEARCH_MIN_PRODUCTS,
  kindLabels: KIND_LABELS,
  gatewayTimeoutMs: 8000,
  swipeClosePx: 80, // how far a swipe down must go to close the details sheet
  addedFlashMs: 1600, // how long the Add to cart button says "Added"
  mock: { delayMs: 400 }, // the demo backend saves orders in this browser (js/mock-backend.js)
};
