// Runs on every admin page except the login: checks the session, wires the Log out button and its confirm, and shows the paused strip.
// With the real backend the database checks the session too; this check is only for friendliness.
import { api } from './api.js';
import { clearLogin, isExpired } from './session.js';
import { confirmDialog } from './dom.js';

export const user = await api.currentUser();
if (user && isExpired()) { // the 30 days are over: sign out and ask again
  await api.logout();
  clearLogin();
  location.replace('login?expired=1');
} else if (!user) {
  location.replace('login');
} else {
  document.body.removeAttribute('data-auth');
  // The page scrolls under the glass bars; their heights keep the first and last line clear of them.
  const topStack = document.querySelector('.top-stack'); const tabbar = document.querySelector('.tabbar');
  // the wide-screen sidebar is not a bottom bar, so it adds no bottom space
  const measure = () => { document.body.style.setProperty('--top-h', `${topStack.offsetHeight}px`); document.body.style.setProperty('--bottom-h', `${getComputedStyle(tabbar).position === 'fixed' ? 0 : tabbar.offsetHeight}px`); };
  measure();
  if (window.ResizeObserver) { const ro = new ResizeObserver(measure); ro.observe(topStack); ro.observe(tabbar); }
  const current = document.body.dataset.highlight || document.body.dataset.page;
  document.querySelectorAll('[data-tab]').forEach((a) => { if (a.dataset.tab === current) a.setAttribute('aria-current', 'page'); });
  document.querySelectorAll('[data-logout]').forEach((b) => b.addEventListener('click', async () => { await api.logout(); clearLogin(); location.replace('login'); }));

  // Log out: the icon button opens a confirm as a raised 3D card in the centre of the screen. Escape, Cancel or a tap outside closes it.
  const outBtn = document.querySelector('[data-logout-btn]');
  outBtn.addEventListener('click', async () => {
    const yes = await confirmDialog({ title: 'Log out?', message: 'You will need your email and password to come back in.', confirmLabel: 'Log out', cancelLabel: 'Stay logged in', card3d: true });
    if (yes) { await api.logout(); clearLogin(); location.replace('login'); } else outBtn.focus();
  });

  // Paused strip: at the top of every page while ordering is paused. Settings fires "settings-changed" after a save.
  const strip = document.querySelector('[data-paused]');
  const showPaused = async () => { strip.hidden = (await api.getSettings()).ordering_open; };
  strip.querySelector('[data-resume]').addEventListener('click', async () => {
    await api.saveSettings({ ordering_open: true });
    document.dispatchEvent(new CustomEvent('settings-changed'));
  });
  document.addEventListener('settings-changed', showPaused);
  api.onChange(showPaused);
  await showPaused();
}
export { api };
