// The admin's data layer on the real backend (Step 3, D-055): Supabase Auth for the login, row-level security for access,
// and the SQL functions for anything with rules (status changes, manual orders). The browser only ever holds the publishable key
// and the signed-in admin's own session; the database checks is_admin() on every request.
import { siteConfig } from '../../js/site-config.js';
import { prepList as computePrep } from '../../js/mock-backend.js';

const SCRIPT = 'js/vendor/supabase.js'; // vendored, version pinned (see js/vendor/README.md); relative to the admin page
const SETTING_LIMITS = { ordering_closed_message: 300, wa_template_confirmed: 1000, wa_template_ready: 1000, wa_template_cancelled: 1000, pickup_address_text: 500 };
const WRONG = 'Email or password is wrong.'; // the same message for every login failure: nothing reveals whether an email exists

let clientPromise;
function loadClient() {
  clientPromise ??= new Promise((resolve, reject) => {
    const make = () => resolve(window.supabase.createClient(siteConfig.supabaseUrl, siteConfig.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'ss-admin-auth' },
    }));
    if (window.supabase) return make();
    const tag = document.createElement('script');
    tag.src = SCRIPT;
    tag.onload = make;
    tag.onerror = () => reject(new Error('The admin could not load. Please reload the page.'));
    document.head.append(tag);
  });
  return clientPromise;
}

const fail = (error) => { throw new Error(error?.message || 'Something went wrong. Please try again.'); };
const unwrap = ({ data, error }) => (error ? fail(error) : data);
const time5 = (t) => (t ? String(t).slice(0, 5) : null);
const orderRow = (r) => ({ ...r, pickup_time: time5(r.pickup_time) });

export const supabaseApi = {
  backend: 'supabase',

  async login(email, password) {
    const sb = await loadClient();
    const { data, error } = await sb.auth.signInWithPassword({ email: String(email).trim(), password });
    if (error || !data?.user) throw new Error(WRONG);
    const { data: row } = await sb.from('admins').select('user_id').eq('user_id', data.user.id).maybeSingle();
    if (!row) { await sb.auth.signOut(); throw new Error(WRONG); } // a valid user who is not an admin gets the same message
    return { email: data.user.email };
  },
  async logout() { const sb = await loadClient(); await sb.auth.signOut(); },
  async currentUser() {
    const sb = await loadClient();
    const { data } = await sb.auth.getSession(); // refreshes the token when it has expired
    return data?.session ? { email: data.session.user.email } : null;
  },

  async listOrders({ from = null, to = null, statuses = null } = {}) {
    const sb = await loadClient();
    let q = sb.from('orders').select('*');
    if (statuses?.length) q = q.in('status', statuses);
    if (from || to) { // orders without a pickup date are always included
      const range = [from && `pickup_date.gte.${from}`, to && `pickup_date.lte.${to}`].filter(Boolean).join(',');
      q = q.or(`pickup_date.is.null,and(${range})`);
    }
    const rows = unwrap(await q.order('pickup_date', { ascending: true, nullsFirst: false }).order('pickup_time', { ascending: true }).order('created_at', { ascending: true }).limit(1000));
    return rows.map(orderRow);
  },

  // The only way a status changes: the database function moves the stock exactly once and refuses a re-open without stock.
  async setOrderStatus(id, status) {
    const sb = await loadClient();
    const data = unwrap(await sb.rpc('set_order_status', { p_order_id: id, p_status: status }));
    if (!data?.ok) throw new Error(data?.message || 'The status could not be changed.');
    return data;
  },

  async getSettings() {
    const sb = await loadClient();
    return Object.fromEntries(unwrap(await sb.from('settings').select('key,value')).map((r) => [r.key, r.value]));
  },
  async saveSettings(patch) {
    const sb = await loadClient();
    const rows = Object.entries(patch).map(([key, value]) => {
      if (key === 'ordering_open') return { key, value: Boolean(value) };
      if (key in SETTING_LIMITS) return { key, value: String(value ?? '').slice(0, SETTING_LIMITS[key]) };
      throw new Error(`Unknown setting: ${key}`);
    });
    unwrap(await sb.from('settings').upsert(rows, { onConflict: 'key' }));
    return this.getSettings();
  },

  async listProducts() {
    const sb = await loadClient();
    return unwrap(await sb.from('products').select('*,product_stock(quantity),product_option_groups(*,product_options(*))').order('sort_order'));
  },

  // The totals for the kitchen are computed in the browser with the same function the tests use.
  async prepList(from, to) {
    const rows = await this.listOrders({ from, to, statuses: ['new', 'confirmed', 'ready', 'collected'] });
    return computePrep({ orders: rows }, from, to);
  },

  // Publish pipeline (D-055). The Publish button itself is built in Step 4bc; these are its calls.
  async getSiteStatus() {
    const sb = await loadClient();
    return unwrap(await sb.from('site_status').select('state,unpublished,detail,updated_at').eq('id', 1).single());
  },
  async publish() {
    const sb = await loadClient();
    const { data } = await sb.auth.getSession();
    const res = await fetch(`${siteConfig.supabaseUrl}/functions/v1/trigger-rebuild`, {
      method: 'POST', headers: { apikey: siteConfig.supabaseAnonKey, Authorization: `Bearer ${data?.session?.access_token ?? ''}`, 'Content-Type': 'application/json' }, body: '{}',
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.message || 'Could not start publishing.');
    return body;
  },

  onChange() { /* the orders page refreshes itself every minute; there is no live subscription (D-045g) */ },
};
