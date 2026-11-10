// Pickup dates and times from rules and exceptions (same shape as the future database tables).
const DEFAULT_SLOT_MINUTES = 60;
const MS_PER_MINUTE = 60000;
const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 1440;

const toMinutes = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * MINUTES_PER_HOUR + m; };
const toHhmm = (min) => `${String(Math.floor(min / MINUTES_PER_HOUR)).padStart(2, '0')}:${String(min % MINUTES_PER_HOUR).padStart(2, '0')}`;

// UK wall-clock parts for an instant.
export function ukParts(date) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date).map((p) => [p.type, p.value]));
  return { y: +parts.year, m: +parts.month, d: +parts.day, hh: +parts.hour, mm: +parts.minute };
}

const isoDate = (ms) => new Date(ms).toISOString().slice(0, 10);

export function dateLabel(iso) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${iso}T00:00:00Z`));
}

function slotsFor(start, end, slotMinutes) {
  const out = [];
  for (let t = toMinutes(start); t + slotMinutes <= toMinutes(end); t += slotMinutes) out.push(t);
  return out;
}

// Returns [{ date: '2026-11-14', label, times: [{ value: '10:00', label: '10:00 to 11:00' }] }].
export function getPickupOptions(config, now = new Date()) {
  const { min_lead_hours: lead, max_days_ahead: maxDays } = config.settings;
  const ukNow = ukParts(now);
  const todayMs = Date.UTC(ukNow.y, ukNow.m - 1, ukNow.d);
  const nowWallMin = todayMs / MS_PER_MINUTE + ukNow.hh * MINUTES_PER_HOUR + ukNow.mm;
  const earliestMin = nowWallMin + lead * MINUTES_PER_HOUR;
  const options = [];

  for (let offset = 0; offset <= maxDays; offset += 1) {
    const dayMs = todayMs + offset * MINUTES_PER_DAY * MS_PER_MINUTE;
    const date = isoDate(dayMs);
    const weekday = new Date(dayMs).getUTCDay();
    const slots = new Map(); // start minute -> slot length
    for (const r of config.rules.filter((x) => x.active && x.weekday === weekday)) {
      const len = r.slot_minutes || DEFAULT_SLOT_MINUTES;
      slotsFor(r.start_time, r.end_time, len).forEach((t) => slots.set(t, len));
    }
    for (const ex of config.exceptions.filter((x) => x.date === date)) {
      if (ex.kind === 'extra') {
        const len = ex.slot_minutes || DEFAULT_SLOT_MINUTES;
        slotsFor(ex.start_time, ex.end_time, len).forEach((t) => slots.set(t, len));
      } else if (!ex.end_time) {
        slots.clear();
      } else {
        const [from, to] = [toMinutes(ex.start_time), toMinutes(ex.end_time)];
        for (const t of [...slots.keys()]) if (t < to && t + slots.get(t) > from) slots.delete(t);
      }
    }
    const times = [...slots.entries()].sort((a, b) => a[0] - b[0])
      .filter(([t]) => dayMs / MS_PER_MINUTE + t >= earliestMin)
      .map(([t, len]) => ({ value: toHhmm(t), label: `${toHhmm(t)} to ${toHhmm(t + len)}` }));
    if (times.length) options.push({ date, label: dateLabel(date), times });
  }
  return options;
}
