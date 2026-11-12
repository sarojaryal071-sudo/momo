// The 30-day limit (D-059). The time of the last login is kept in this browser; once ADMIN_SESSION_DAYS have passed the admin
// signs out and asks again. Supabase keeps refreshing the session itself in the meantime. Logging out clears the time.
import { ADMIN_SESSION_DAYS, LOGIN_AT_KEY } from './admin-config.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const read = () => { try { return Number(localStorage.getItem(LOGIN_AT_KEY)) || 0; } catch { return 0; } };
export const markLogin = () => { try { localStorage.setItem(LOGIN_AT_KEY, String(Date.now())); } catch { /* ignore */ } };
export const clearLogin = () => { try { localStorage.removeItem(LOGIN_AT_KEY); } catch { /* ignore */ } };

// A session with no recorded time (it started before this limit existed) gets today as its start.
export function isExpired(now = Date.now()) {
  const at = read();
  if (!at) { markLogin(); return false; }
  return now - at > ADMIN_SESSION_DAYS * DAY_MS;
}
