// Live feed diagnostics (Step 4j): what the order feed last did, kept in sessionStorage so the Settings page can show it.
// Nothing secret is stored: only a status word, an error message, and times.
export const LIVE_BACKOFF_SECONDS = [2, 4, 8, 16, 30]; // then every 30 seconds
export const LIVE_FLAG_AFTER_SECONDS = 3; // "Reconnecting…" only shows after this long without a connection
export const backoffSeconds = (attempt) => LIVE_BACKOFF_SECONDS[Math.min(attempt, LIVE_BACKOFF_SECONDS.length - 1)];
const KEY = 'ss-live-feed';
export function readLive() { try { return JSON.parse(sessionStorage.getItem(KEY)) || {}; } catch { return {}; } }
export function recordLive(patch) { try { sessionStorage.setItem(KEY, JSON.stringify({ ...readLive(), ...patch })); } catch { /* not kept */ } }
export const recordRefresh = () => recordLive({ refreshAt: Date.now() });
