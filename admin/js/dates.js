// Small date helpers for the admin. Dates are ISO strings (YYYY-MM-DD) in UK time, the same as the order records.
const parse = (iso) => new Date(`${iso}T12:00:00Z`);
export const addDays = (iso, n) => { const d = parse(iso); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
// The Sunday of the week the date falls in (weeks run Monday to Sunday).
export const endOfWeek = (iso) => { const day = parse(iso).getUTCDay(); return addDays(iso, day === 0 ? 0 : 7 - day); };
// "Sat 14 Nov", or "Saturday 14 November" when long.
export function shortDate(iso, long = false) {
  return parse(iso).toLocaleDateString('en-GB', { weekday: long ? 'long' : 'short', day: 'numeric', month: long ? 'long' : 'short', timeZone: 'UTC' });
}
