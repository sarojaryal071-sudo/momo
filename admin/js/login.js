import { api } from './api.js';
import { DEMO_ACCOUNTS } from './admin-config.js';

const form = document.querySelector('[data-login]');
const errorBox = form.querySelector('[data-error]');
const mock = api.backend === 'mock';
document.querySelector('[data-demo-banner]').hidden = !mock;
if (mock) {
  document.querySelector('[data-demo-logins]').hidden = false;
  const list = document.querySelector('[data-demo-list]');
  for (const a of DEMO_ACCOUNTS) {
    const li = document.createElement('li');
    li.textContent = `${a.label}: `;
    const code = document.createElement('code');
    code.textContent = `${a.email} / ${a.password}`;
    li.append(code);
    list.append(li);
  }
}
if (await api.currentUser()) location.replace('index.html');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorBox.textContent = '';
  const data = new FormData(form);
  try {
    await api.login(data.get('email'), data.get('password'));
    location.replace('index.html');
  } catch (err) {
    errorBox.textContent = err.message;
  }
});
