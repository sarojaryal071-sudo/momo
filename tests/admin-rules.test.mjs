import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ordersToCsv, parseSettings, penceToPounds, poundsToPence, slugify, validateException, validateGroup, validateIngredients, validatePhoto, validateProduct, validateRule } from '../frontend/js/admin-rules.js';

test('pounds and pence', () => {
  assert.equal(poundsToPence('10'), 1000);
  assert.equal(poundsToPence('£10.5'), 1050);
  assert.equal(poundsToPence('0.05'), 5);
  for (const bad of ['', '-1', '1.234', 'ten', '1,5', '99999999']) assert.equal(poundsToPence(bad), null, bad);
  assert.equal(penceToPounds(1000), '10');
  assert.equal(penceToPounds(1050), '10.50');
  assert.equal(penceToPounds(null), '');
});
test('products: name, kind, price and the rule that a shown item needs a price', () => {
  const ok = { name: 'Frozen chicken momo', kind: 'pack', unit_label: '40 pieces', price_pence: 1000, available: true, active: true };
  assert.equal(validateProduct(ok), null);
  assert.match(validateProduct({ ...ok, name: ' ' }), /name/);
  assert.match(validateProduct({ ...ok, kind: 'x' }), /kind/);
  assert.match(validateProduct({ ...ok, price_pence: -5 }), /£0 or more/);
  assert.match(validateProduct({ ...ok, price_pence: null }), /Set a price/);
  assert.equal(validateProduct({ ...ok, price_pence: null, available: false, active: false }), null);
  assert.equal(slugify('Hot Sauce & Chutney Pot!'), 'hot-sauce-and-chutney-pot');
});
test('a photo needs alt text', () => {
  assert.match(validatePhoto({ photo_path: 'a.webp', photo_alt: ' ' }), /alt text/);
  assert.equal(validatePhoto({ photo_path: 'a.webp', photo_alt: 'A bag of momo' }), null);
  assert.equal(validatePhoto({ photo_path: null, photo_alt: '' }), null);
  assert.equal(validatePhoto({ photo_path: 'pack-chicken', photo_alt: '' }), null); // a picture that ships with the site
});
test('ingredients and allergens accept only the 14 allergens', () => {
  assert.equal(validateIngredients({ ingredients_text: 'Chicken', allergens: ['gluten', 'sesame'], allergen_note: '' }), null);
  assert.match(validateIngredients({ ingredients_text: '', allergens: ['kiwi'], allergen_note: '' }), /Unknown/);
});
test('option groups: exactly one default in a one-choice group, no negative price, no duplicates', () => {
  const o = (label, d = false, p = 0) => ({ label, is_default: d, price_delta_pence: p, active: true });
  assert.equal(validateGroup({ label: 'Spice level', kind: 'single' }, [o('Mild'), o('Medium', true), o('Hot')]), null);
  assert.match(validateGroup({ label: 'Spice level', kind: 'single' }, [o('Mild'), o('Hot')]), /exactly one default/);
  assert.match(validateGroup({ label: 'Spice level', kind: 'single' }, [o('Mild', true), o('Hot', true)]), /exactly one default/);
  assert.equal(validateGroup({ label: 'Leave out', kind: 'multiple' }, [o('No onion'), o('No coriander')]), null);
  assert.match(validateGroup({ label: 'Leave out', kind: 'multiple' }, [o('No onion', true), o('No coriander', true)]), /Only one/);
  assert.match(validateGroup({ label: 'G', kind: 'single' }, [o('A', true, -1)]), /£0 or more/);
  assert.match(validateGroup({ label: 'G', kind: 'multiple' }, [o('A'), o('a')]), /twice/);
  assert.equal(validateGroup({ label: 'G', kind: 'single' }, []), null);
});
test('pickup rules and exceptions', () => {
  assert.equal(validateRule({ weekday: 6, start_time: '10:00', end_time: '18:00' }), null);
  assert.match(validateRule({ weekday: 6, start_time: '18:00', end_time: '10:00' }), /after the start/);
  assert.match(validateRule({ weekday: 9, start_time: '10:00', end_time: '18:00' }), /day of the week/);
  assert.equal(validateException({ date: '2026-11-21', kind: 'closed' }), null);
  assert.equal(validateException({ date: '2026-11-21', kind: 'closed', start_time: '12:00', end_time: '14:00' }), null);
  assert.match(validateException({ date: '2026-11-21', kind: 'extra' }), /start and end/);
  assert.match(validateException({ date: '2026-11-21', kind: 'closed', start_time: '12:00' }), /both times/);
});
test('settings: whole numbers in range, empty daily limit means none, prefix upper-cased', () => {
  const v = { min_lead_hours: '24', custom_min_lead_hours: '48', max_days_ahead: '14', max_qty_per_item: '10', low_stock_threshold: '5', max_orders_per_day: '', order_prefix: 'ss' };
  assert.deepEqual(parseSettings(v), { ok: true, patch: { min_lead_hours: 24, custom_min_lead_hours: 48, max_days_ahead: 14, max_qty_per_item: 10, low_stock_threshold: 5, max_orders_per_day: null, order_prefix: 'SS' } });
  assert.equal(parseSettings({ ...v, max_orders_per_day: '8' }).patch.max_orders_per_day, 8);
  const bad = parseSettings({ ...v, min_lead_hours: 'x', max_days_ahead: '0', order_prefix: 'S1', custom_min_lead_hours: '10', max_orders_per_day: '0' });
  assert.deepEqual(Object.keys(bad.errors).sort(), ['max_days_ahead', 'max_orders_per_day', 'min_lead_hours', 'order_prefix']);
  assert.match(parseSettings({ ...v, custom_min_lead_hours: '12' }).errors.custom_min_lead_hours, /less notice/);
});
test('the CSV has options, the customised flag, source and status, and cannot run as a formula', () => {
  const csv = ordersToCsv([{ order_number: 'SS-1311-01', status: 'new', source: 'manual', order_date: '2026-11-13', pickup_date: '2026-11-14', pickup_time: '10:30', customer_name: '=cmd|x', customer_phone: '07700 900123', notes: 'a, "b"\nc', total_pence: 2050,
    items: [{ qty: 2, name: 'Frozen chicken momo', options: [{ label: 'Hot' }, { label: 'No onion' }], customised: true }, { qty: 1, name: 'Chutney pot', options: [] }] }]);
  const [header, row] = csv.replace('﻿', '').split('\r\n');
  assert.match(header, /^Order number,Status,Source,/);
  assert.match(row, /^SS-1311-01,new,manual,2026-11-13,2026-11-14,10:30,'=cmd\|x,07700 900123,"2 x Frozen chicken momo \[Hot, No onion\] \(customised\); 1 x Chutney pot",yes,"a, ""b""\nc",20\.50/);
});
