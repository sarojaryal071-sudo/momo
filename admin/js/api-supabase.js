// The admin's data layer on the real backend (Step 3, D-055): Supabase Auth for the login, row-level security for access,
// and the SQL functions for anything with rules (status changes, manual orders). The browser only ever holds the publishable key
// and the signed-in admin's own session; the database checks is_admin() on every request.
import { siteConfig } from '../../js/site-config.js';
import { prepList as computePrep } from '../../js/mock-backend.js';
import { SETTING_FIELDS, slugify, validateException, validateGroup, validateIngredients, validatePhoto, validateProduct, validateRule, validateSlot } from '../../js/admin-rules.js';

const SCRIPT = 'js/vendor/supabase.js'; // vendored, version pinned (see js/vendor/README.md); relative to the admin page
const SETTING_LIMITS = { ordering_closed_message: 300, wa_template_confirmed: 1000, wa_template_ready: 1000, wa_template_cancelled: 1000, wa_template_collected: 1000, pickup_address_text: 500 };
const BUCKET = 'product-images';
const WRONG = 'Email or password is wrong.'; // the same message for every login failure: nothing reveals whether an email exists

let clientPromise;
function loadClient() {
  clientPromise ??= new Promise((resolve, reject) => {
    const make = () => resolve(window.supabase.createClient(siteConfig.supabaseUrl, siteConfig.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'ss-admin-auth' },
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
const refuse = (message) => { throw new Error(message); };

// A database product row (with its stock and option groups) in the shape the screens use (the same as the demo backend).
const productRow = (r) => {
  const stock = Array.isArray(r.product_stock) ? r.product_stock[0] : r.product_stock;
  return {
    id: r.id, slug: r.slug, name: r.name, kind: r.kind, category: r.category, unit_label: r.unit_label || '', price_pence: r.price_pence, available: r.available, active: r.active,
    sort_order: r.sort_order, photo_path: r.photo_path, photo_alt: r.photo_alt || '', ingredients_text: r.ingredients_text || '', allergens: r.allergens || [], allergen_note: r.allergen_note || '',
    stock_quantity: stock ? stock.quantity : null,
    option_groups: (r.product_option_groups || []).map((g) => ({
      id: g.id, label: g.label, kind: g.kind, sort_order: g.sort_order, active: g.active,
      options: (g.product_options || []).map((o) => ({ id: o.id, label: o.label, price_delta_pence: o.price_delta_pence, is_default: o.is_default, sort_order: o.sort_order, active: o.active })).sort((a, b) => a.sort_order - b.sort_order),
    })).sort((a, b) => a.sort_order - b.sort_order),
  };
};
const timeRow = (r) => ({ ...r, start_time: time5(r.start_time), end_time: time5(r.end_time) });

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

  // Forgot password (D-059). The answer is always the same, so nothing reveals whether an email has an account. Supabase's built-in
  // sender only delivers to members of the Supabase organisation until a custom email sender is set up.
  async requestPasswordReset(email) {
    const sb = await loadClient();
    try { await sb.auth.resetPasswordForEmail(String(email).trim(), { redirectTo: new URL('reset', location.href).href }); } catch { /* same answer either way */ }
    return true;
  },
  // True when the page was opened from a valid reset link (the library turns the link into a short-lived session).
  async hasRecoverySession() {
    const sb = await loadClient();
    const { data } = await sb.auth.getSession();
    if (data?.session) return true;
    return new Promise((resolve) => {
      const { data: sub } = sb.auth.onAuthStateChange((event, session) => { if (event === 'PASSWORD_RECOVERY' || session) { sub.subscription.unsubscribe(); resolve(true); } });
      setTimeout(() => { sub.subscription.unsubscribe(); resolve(false); }, 4000);
    });
  },
  async updatePassword(password) {
    const sb = await loadClient();
    const { error } = await sb.auth.updateUser({ password });
    if (error) refuse('The password could not be changed. The link may have expired: ask for a new one.');
    await sb.auth.signOut(); // she logs in again with the new password
  },
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
    const rows = []; const clear = [];
    for (const [key, value] of Object.entries(patch)) {
      if (key === 'ordering_open') rows.push({ key, value: Boolean(value) });
      else if (key === 'order_prefix') { if (!/^[A-Z]{1,6}$/.test(String(value))) refuse('Order prefix: 1 to 6 capital letters.'); rows.push({ key, value: String(value) }); }
      else if (key in SETTING_FIELDS) {
        const spec = SETTING_FIELDS[key];
        if (value === null && spec.optional) clear.push(key); // no row means no limit
        else if (Number.isInteger(value) && value >= spec.min && value <= spec.max) rows.push({ key, value });
        else refuse(`${spec.label}: enter a number from ${spec.min} to ${spec.max}.`);
      } else if (key in SETTING_LIMITS) rows.push({ key, value: String(value ?? '').slice(0, SETTING_LIMITS[key]) });
      else refuse(`Unknown setting: ${key}`);
    }
    if (rows.length) unwrap(await sb.from('settings').upsert(rows, { onConflict: 'key' }));
    if (clear.length) unwrap(await sb.from('settings').delete().in('key', clear));
    return this.getSettings();
  },

  async listProducts() {
    const sb = await loadClient();
    const rows = unwrap(await sb.from('products').select('*,product_stock(quantity),product_option_groups(*,product_options(*))').order('sort_order'));
    return rows.map(productRow);
  },

  // Creates (no id) or updates one product. Products are never deleted: switch active off instead. Marks the site "unpublished" (trigger).
  async saveProduct(input) {
    const sb = await loadClient();
    const merged = { ...input, price_pence: input.price_pence ?? null };
    const error = validateProduct(merged) || validatePhoto(merged) || validateIngredients({ ingredients_text: input.ingredients_text, allergens: input.allergens || [], allergen_note: input.allergen_note });
    if (error) refuse(error);
    const fields = {
      name: String(input.name).trim(), kind: input.kind, unit_label: String(input.unit_label || '').trim(), price_pence: merged.price_pence,
      available: Boolean(input.available), active: Boolean(input.active), photo_path: input.photo_path || null, photo_alt: String(input.photo_alt || '').trim() || null,
      ingredients_text: String(input.ingredients_text || '').trim() || null, allergens: [...(input.allergens || [])], allergen_note: String(input.allergen_note || '').trim() || null,
    };
    if (input.id) return unwrap(await sb.from('products').update(fields).eq('id', input.id).select('id').single());
    const existing = unwrap(await sb.from('products').select('slug,sort_order'));
    const taken = new Set(existing.map((r) => r.slug));
    const base = slugify(input.name) || 'item'; let slug = base; let n = 2;
    while (taken.has(slug)) slug = `${base}-${n++}`;
    return unwrap(await sb.from('products').insert({ ...fields, slug, sort_order: Math.max(0, ...existing.map((r) => r.sort_order)) + 1 }).select('id').single());
  },
  async reorderProducts(ids) {
    const sb = await loadClient();
    await Promise.all(ids.map((id, i) => sb.from('products').update({ sort_order: i + 1 }).eq('id', id).then(unwrap)));
  },

  // Stock lives in its own table, so changing it never marks the site as having unpublished changes. Empty = not tracked.
  async setStock(id, quantity) {
    const sb = await loadClient();
    if (quantity === null) { unwrap(await sb.from('product_stock').delete().eq('product_id', id)); return null; }
    if (!(Number.isInteger(quantity) && quantity >= 0 && quantity <= 100000)) refuse('Stock must be a whole number, 0 or more. Leave it empty if you do not count stock.');
    unwrap(await sb.from('product_stock').upsert({ product_id: id, quantity }, { onConflict: 'product_id' }));
    return quantity;
  },

  // One option group with all its options. Options removed from the list are deleted; the single default is moved without a clash.
  async saveOptionGroup(productId, group) {
    const sb = await loadClient();
    const options = (group.options || []).map((o, i) => ({ ...o, price_delta_pence: o.price_delta_pence ?? 0, active: o.active !== false, sort_order: i + 1 }));
    const error = validateGroup(group, options);
    if (error) refuse(error);
    const gFields = { label: String(group.label).trim(), kind: group.kind, active: group.active !== false, sort_order: group.sort_order ?? 1 };
    let groupId = group.id;
    if (groupId) unwrap(await sb.from('product_option_groups').update(gFields).eq('id', groupId));
    else groupId = unwrap(await sb.from('product_option_groups').insert({ ...gFields, product_id: productId }).select('id').single()).id;
    const keep = options.filter((o) => o.id).map((o) => o.id);
    const current = unwrap(await sb.from('product_options').select('id').eq('group_id', groupId)).map((r) => r.id);
    const gone = current.filter((id) => !keep.includes(id));
    if (gone.length) unwrap(await sb.from('product_options').delete().in('id', gone));
    if (current.length) unwrap(await sb.from('product_options').update({ is_default: false }).eq('group_id', groupId));
    for (const o of options) {
      const row = { label: String(o.label).trim(), price_delta_pence: o.price_delta_pence, is_default: Boolean(o.is_default), active: o.active, sort_order: o.sort_order };
      if (o.id) unwrap(await sb.from('product_options').update(row).eq('id', o.id));
      else unwrap(await sb.from('product_options').insert({ ...row, group_id: groupId }));
    }
    return groupId;
  },
  async deleteOptionGroup(productId, groupId) { const sb = await loadClient(); unwrap(await sb.from('product_option_groups').delete().eq('id', groupId)); },

  // Photos: the screen shrinks the picture first; this uploads it to the product-images bucket (public read, admin write).
  async uploadPhoto(productId, blob, filename) {
    const sb = await loadClient();
    const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/jpeg' ? 'jpg' : 'webp';
    const path = `${slugify(filename.replace(/\.[a-z]+$/i, '')) || 'photo'}-${Date.now()}.${ext}`;
    unwrap(await sb.storage.from(BUCKET).upload(path, blob, { contentType: blob.type, upsert: false }));
    return path;
  },
  // Where to show a product photo in the admin: a bucket file, or an image that ships with the site.
  photoUrl(path) {
    if (!path) return null;
    return /\.(jpe?g|png|webp)$/i.test(path) ? `${siteConfig.supabaseUrl}/storage/v1/object/public/${BUCKET}/${path}` : `../assets/img/${path}-400.webp`;
  },

  // Pickup (D-038)
  async getPickup() {
    const sb = await loadClient();
    const [rules, exceptions] = await Promise.all([sb.from('pickup_rules').select('*').order('weekday').order('start_time').then(unwrap), sb.from('pickup_exceptions').select('*').order('date').then(unwrap)]);
    return { rules: rules.map(timeRow), exceptions: exceptions.map(timeRow) };
  },
  async saveRule(rule) {
    const sb = await loadClient();
    const error = validateRule(rule) || validateSlot(rule.slot_minutes ?? 1);
    if (error) refuse(error);
    const row = { weekday: rule.weekday, start_time: rule.start_time, end_time: rule.end_time, slot_minutes: rule.slot_minutes ?? 1, active: rule.active !== false };
    unwrap(rule.id ? await sb.from('pickup_rules').update(row).eq('id', rule.id) : await sb.from('pickup_rules').insert(row));
  },
  async deleteRule(id) { const sb = await loadClient(); unwrap(await sb.from('pickup_rules').delete().eq('id', id)); },
  async setSlotMinutes(minutes) {
    const sb = await loadClient();
    const error = validateSlot(minutes);
    if (error) refuse(error);
    unwrap(await sb.from('pickup_rules').update({ slot_minutes: minutes }).gte('weekday', 0));
    unwrap(await sb.from('pickup_exceptions').update({ slot_minutes: minutes }).eq('kind', 'extra'));
  },
  async saveException(ex) {
    const sb = await loadClient();
    const error = validateException(ex);
    if (error) refuse(error);
    const row = { date: ex.date, kind: ex.kind, start_time: ex.start_time || null, end_time: ex.end_time || null, slot_minutes: ex.slot_minutes ?? 1, note: String(ex.note || '').trim() || null };
    unwrap(ex.id ? await sb.from('pickup_exceptions').update(row).eq('id', ex.id) : await sb.from('pickup_exceptions').insert(row));
  },
  async deleteException(id) { const sb = await loadClient(); unwrap(await sb.from('pickup_exceptions').delete().eq('id', id)); },
  async fullDates(from, to) { const sb = await loadClient(); return unwrap(await sb.rpc('full_pickup_dates', { p_from: from || null, p_to: to || null })) || []; },

  // Notice banner: one row, live on the public site at once (no rebuild)
  async getNotice() {
    const sb = await loadClient();
    const row = unwrap(await sb.from('site_notice').select('message,active').eq('id', 1).maybeSingle());
    return { message: row?.message || '', active: Boolean(row?.active) };
  },
  async saveNotice({ message, active }) {
    const sb = await loadClient();
    const text = String(message || '').trim();
    if (text.length > 300) refuse('The notice can be at most 300 characters.');
    if (active && !text) refuse('Write the notice before switching it on.');
    unwrap(await sb.from('site_notice').upsert({ id: 1, message: text, active: Boolean(active) }, { onConflict: 'id' }));
  },

  // Manual orders (phone or Instagram): the database function takes stock and the next number like any order.
  async createManualOrder(order) {
    const sb = await loadClient();
    const data = unwrap(await sb.rpc('create_manual_order', { p: order }));
    if (!data?.ok) refuse(data?.message || 'The order could not be saved.');
    return data;
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

  // Live order feed (D-057): Supabase Realtime. Row-level security means only a signed-in admin receives anything. The page also
  // refreshes every minute, so a dropped connection costs at most a minute; onStatus('live' | 'reconnecting') drives a small indicator.
  subscribeOrders(onEvent, onStatus) {
    let channel; let stopped = false;
    loadClient().then((sb) => {
      if (stopped) return;
      channel = sb.channel('admin-orders')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => onEvent({ kind: payload.eventType === 'INSERT' ? 'insert' : 'change', row: payload.new }))
        .subscribe((status) => onStatus?.(status === 'SUBSCRIBED' ? 'live' : 'reconnecting'));
    }).catch(() => onStatus?.('reconnecting'));
    return () => { stopped = true; if (channel) loadClient().then((sb) => sb.removeChannel(channel)); };
  },
  onChange(callback) { return this.subscribeOrders(() => callback()); },
};
