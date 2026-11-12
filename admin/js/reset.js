// Set a new password from the reset link (D-059). Opened by the link in the reset email.
import { api } from './api.js';
import { MIN_PASSWORD_LENGTH } from './admin-config.js';
import { wirePasswordToggle } from './password.js';

const form = document.querySelector('[data-reset-form]');
const message = document.querySelector('[data-message]');
const errorBox = form.querySelector('[data-error]');
const submit = form.querySelector('[data-submit]');
wirePasswordToggle(form);

if (await api.hasRecoverySession()) { form.hidden = false; message.hidden = true; }
else message.textContent = 'This link is not valid or has expired. Go back to log in and choose "Forgot password" for a new one.';

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorBox.textContent = '';
  const password = form.password.value;
  if (password.length < MIN_PASSWORD_LENGTH) { errorBox.textContent = `Use at least ${MIN_PASSWORD_LENGTH} characters.`; return; }
  if (password !== form.confirm.value) { errorBox.textContent = 'The two passwords are not the same.'; return; }
  submit.disabled = true; submit.setAttribute('aria-busy', 'true'); submit.textContent = 'Saving...';
  try { await api.updatePassword(password); location.replace('login.html?reset=1'); }
  catch (err) { errorBox.textContent = err.message; submit.disabled = false; submit.setAttribute('aria-busy', 'false'); submit.textContent = 'Save new password'; }
});
