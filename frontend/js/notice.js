// Site notice strip (architecture section 4): shows the message from the site_notice row on every public page while it is active.
// Silent on any failure. Space is reserved from the last known state so the page does not jump when the strip arrives.
import { isLive, restGet } from './supabase-rest.js';

const KEY = 'ss-notice-active';
const remembered = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };
const remember = (on) => { try { localStorage.setItem(KEY, on ? '1' : '0'); } catch { /* ignore */ } };

if (isLive()) {
  const strip = document.createElement('div');
  strip.className = 'notice';
  strip.setAttribute('role', 'status');
  strip.dataset.notice = '';
  if (remembered()) { strip.classList.add('notice-reserved'); document.body.prepend(strip); }
  try {
    const [row] = await restGet('site_notice?select=message,active&id=eq.1');
    if (row && row.active && row.message) {
      strip.textContent = row.message; // text only, never HTML
      strip.classList.remove('notice-reserved');
      if (!strip.isConnected) document.body.prepend(strip);
      remember(true);
    } else { strip.remove(); remember(false); }
  } catch { if (!strip.textContent) strip.remove(); }
}
