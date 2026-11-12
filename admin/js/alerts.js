// New-order alerts (D-056, D-057): an optional soft sound and a browser notification, both only after the owner turns them on.
import { SOUND_KEY } from './admin-config.js';

export const soundOn = () => { try { return localStorage.getItem(SOUND_KEY) === '1'; } catch { return false; } };
export const setSound = (on) => { try { localStorage.setItem(SOUND_KEY, on ? '1' : '0'); } catch { /* ignore */ } };

// One short, quiet two-note chime made in the browser (no sound file).
export function playSoftSound() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [[660, 0], [880, 0.16]].forEach(([freq, at]) => {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + at);
      gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + 0.3);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(ctx.currentTime + at); osc.stop(ctx.currentTime + at + 0.32);
    });
    setTimeout(() => ctx.close(), 800);
  } catch { /* a browser that blocks audio simply stays silent */ }
}

// 'granted', 'denied', 'default' or 'unsupported'
export const notificationState = () => (typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);
export async function askNotificationPermission() {
  if (notificationState() === 'unsupported') return 'unsupported';
  try { return await Notification.requestPermission(); } catch { return Notification.permission; }
}
export function notifyNewOrder(order) {
  if (notificationState() !== 'granted') return;
  try {
    const n = new Notification('New order', { body: `${order.order_number}${order.customer_name ? ` from ${order.customer_name}` : ''}`, tag: 'ss-new-order' });
    n.onclick = () => { window.focus(); n.close(); };
  } catch { /* some phones only allow notifications from an installed app: nothing to do */ }
}
