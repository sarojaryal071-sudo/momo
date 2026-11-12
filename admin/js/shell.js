// Runs on every admin page except the login: checks the session, wires the menu and log out, and shows the paused strip.
// With the real backend the database checks the session too; this check is only for friendliness.
import { api } from './api.js';

export const user = await api.currentUser();
if (!user) {
  location.replace('login.html');
} else {
  document.body.removeAttribute('data-auth');
  const current = document.body.dataset.page;
  document.querySelectorAll('[data-tab]').forEach((a) => { if (a.dataset.tab === current) a.setAttribute('aria-current', 'page'); });
  document.querySelectorAll('[data-logout]').forEach((b) => b.addEventListener('click', async () => { await api.logout(); location.replace('login.html'); }));

  // Menu: opens under the button, closes on Escape, on a click elsewhere, or when focus leaves.
  const menuBtn = document.querySelector('[data-menu-btn]');
  const menu = document.getElementById('admin-menu');
  const setMenu = (open) => { menu.hidden = !open; menuBtn.setAttribute('aria-expanded', String(open)); };
  menuBtn.addEventListener('click', () => { setMenu(menu.hidden); if (!menu.hidden) menu.querySelector('button').focus(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); menuBtn.focus(); } });
  document.addEventListener('click', (e) => { if (!menu.hidden && !e.target.closest('.admin-menu-wrap')) setMenu(false); });

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
