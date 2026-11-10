import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getPickupOptions } from '../frontend/js/pickup.js';

const weekend = { weekday: 6, start_time: '10:00', end_time: '13:00', slot_minutes: 60, active: true };
const config = (over = {}) => ({
  settings: { min_lead_hours: 24, max_days_ahead: 14 },
  rules: [weekend, { ...weekend, weekday: 0 }],
  exceptions: [],
  ...over,
});
// Monday 9 November 2026, 12:00 UK time (GMT).
const monday = new Date('2026-11-09T12:00:00Z');

test('only rule weekdays, one-hour slots', () => {
  const opts = getPickupOptions(config(), monday);
  assert.deepEqual(opts.map((o) => o.date), ['2026-11-14', '2026-11-15', '2026-11-21', '2026-11-22']);
  assert.deepEqual(opts[0].times.map((t) => t.value), ['10:00', '11:00', '12:00']);
  assert.equal(opts[0].times[0].label, '10:00 to 11:00');
  assert.equal(opts[0].label, 'Saturday 14 November');
});

test('lead time hides slots that are too soon', () => {
  const friday = new Date('2026-11-13T11:30:00Z'); // 24h lead: earliest is Saturday 11:30, so only 12:00 remains
  const first = getPickupOptions(config(), friday)[0];
  assert.deepEqual([first.date, first.times.map((t) => t.value)], ['2026-11-14', ['12:00']]);
  const earlier = new Date('2026-11-13T10:30:00Z');
  assert.deepEqual(getPickupOptions(config(), earlier)[0].times.map((t) => t.value), ['11:00', '12:00']);
});

test('maximum days ahead', () => {
  const opts = getPickupOptions(config({ settings: { min_lead_hours: 0, max_days_ahead: 5 } }), monday);
  assert.deepEqual(opts.map((o) => o.date), ['2026-11-14']);
});

test('closed day and closed hours exceptions, extra day', () => {
  const closedDay = { date: '2026-11-14', kind: 'closed', start_time: null, end_time: null };
  const closedHours = { date: '2026-11-15', kind: 'closed', start_time: '11:00', end_time: '12:00' };
  const extra = { date: '2026-11-18', kind: 'extra', start_time: '16:00', end_time: '18:00' };
  const opts = getPickupOptions(config({ exceptions: [closedDay, closedHours, extra] }), monday);
  assert.equal(opts.find((o) => o.date === '2026-11-14'), undefined);
  assert.deepEqual(opts.find((o) => o.date === '2026-11-15').times.map((t) => t.value), ['10:00', '12:00']);
  assert.deepEqual(opts.find((o) => o.date === '2026-11-18').times.map((t) => t.value), ['16:00', '17:00']);
});

test('UK summer time is used for the lead time', () => {
  // 1 July 2026 23:30 UTC is 00:30 on 2 July in the UK.
  const opts = getPickupOptions({ settings: { min_lead_hours: 0, max_days_ahead: 1 }, rules: [{ weekday: 4, start_time: '00:00', end_time: '02:00', slot_minutes: 60, active: true }], exceptions: [] }, new Date('2026-07-01T23:30:00Z'));
  assert.deepEqual(opts.map((o) => [o.date, o.times[0].value]), [['2026-07-02', '01:00']]);
});

// Customised orders need a longer notice (D-031)
import { earliestPickup, noticeText } from '../frontend/js/pickup.js';

test('noticeText shows whole days or hours', () => {
  assert.equal(noticeText(48), '2 days');
  assert.equal(noticeText(24), '1 day');
  assert.equal(noticeText(36), '36 hours');
});

test('a customised cart uses the longer minimum notice, a standard cart does not', () => {
  const cfg = { settings: { min_lead_hours: 24, max_days_ahead: 14 }, rules: [{ weekday: 6, start_time: '10:00', end_time: '13:00', slot_minutes: 60, active: true }, { weekday: 0, start_time: '10:00', end_time: '13:00', slot_minutes: 60, active: true }], exceptions: [] };
  const thursday = new Date('2026-11-12T12:00:00Z');
  assert.equal(getPickupOptions(cfg, thursday)[0].date, '2026-11-14'); // 24 h: Saturday is fine
  const custom = getPickupOptions(cfg, thursday, { customised: true, customLeadHours: 72 });
  assert.equal(custom[0].date, '2026-11-15'); // 72 h: Saturday 10:00 is too soon, Sunday is the first day
  assert.equal(earliestPickup(cfg, thursday, 72).date, '2026-11-15');
  assert.equal(getPickupOptions(cfg, thursday, { customised: true, customLeadHours: 12 })[0].date, '2026-11-14'); // never shorter than the usual notice
});
