// Runs on every admin page except the login: checks the session, wires log out.
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
}
export { api };
