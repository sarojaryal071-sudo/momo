// Admin configuration: named constants in one place (D-022).
// Backend `mock` (D-048): two fixed logins, not shown on the page. They are never a security control; Step 3 replaces
// them with real Supabase Auth.
export const DEMO_ACCOUNTS = [
  { label: 'Owner', email: 'owner@demo.test', password: 'owner-demo-1' },
  { label: 'Developer', email: 'dev@demo.test', password: 'dev-demo-1' },
];
export const SESSION_KEY = 'ss-demo-session';
export const SEEN_KEY = 'ss-admin-seen'; // ids of orders she has opened, so new ones stay highlighted until then
export const ORDERS_REFRESH_SECONDS = 60; // the orders list refreshes itself (no sound, no live subscription, D-045g)
export const PREP_DEFAULT_OFFSET_DAYS = 1; // the prep list opens on tomorrow
export const SAVED_MESSAGE_SECONDS = 4;
export const STATUS_LABELS = { new: 'New', confirmed: 'Confirmed', ready: 'Ready', collected: 'Collected', cancelled: 'Cancelled' };
export const TEMPLATE_BY_STATUS = { new: 'confirmed', confirmed: 'confirmed', ready: 'ready', collected: 'ready', cancelled: 'cancelled' };
export const TEMPLATE_PLACEHOLDERS = ['{name}', '{order_number}', '{pickup}', '{items}', '{address}'];
export const NEXT_STATUS = { new: { status: 'confirmed', label: 'Confirm' }, confirmed: { status: 'ready', label: 'Mark ready' }, ready: { status: 'collected', label: 'Mark collected' } }; // the one main button on an order
export const PREP_DAY_CHIPS = 8; // today and the next 7 days
