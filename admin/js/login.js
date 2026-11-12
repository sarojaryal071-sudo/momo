import { api } from './api.js';

const form = document.querySelector('[data-login]');
const errorBox = form.querySelector('[data-error]');
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
