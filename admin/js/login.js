import { api } from './api.js';
import { ADMIN_SESSION_DAYS } from './admin-config.js';
import { clearLogin, isExpired, markLogin } from './session.js';
import { wirePasswordToggle } from './password.js';

const form = document.querySelector('[data-login]');
const forgotForm = document.querySelector('[data-forgot-form]');
const message = document.querySelector('[data-message]');
const errorBox = form.querySelector('[data-error]');
const submit = form.querySelector('[data-submit]');
const params = new URLSearchParams(location.search);
wirePasswordToggle(form);

const say = (text) => { message.textContent = text; message.hidden = !text; };
if (params.get('reset')) say('Your password was changed. Log in with the new password.');

// Already signed in: straight to Home, unless the 30 days are over (then sign out and ask again).
if (await api.currentUser()) {
  if (isExpired()) { await api.logout(); clearLogin(); say(`Your session ended after ${ADMIN_SESSION_DAYS} days. Please log in again.`); }
  else location.replace('./');
} else if (params.get('expired')) say(`Your session ended after ${ADMIN_SESSION_DAYS} days. Please log in again.`);

const card = form.closest('.login-card');
const inputs = [...form.querySelectorAll('input')];
const clearInvalid = () => { inputs.forEach((i) => i.removeAttribute('aria-invalid')); errorBox.textContent = ''; };
inputs.forEach((i) => i.addEventListener('input', clearInvalid));
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// A wrong login: the card shakes, both fields are marked (with a message, not colour alone), and the password is selected for retyping.
function refuse(text) {
  errorBox.textContent = text;
  inputs.forEach((i) => i.setAttribute('aria-invalid', 'true'));
  card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
  form.password.focus(); form.password.select();
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearInvalid();
  const data = new FormData(form);
  if (!String(data.get('email')).trim() || !data.get('password')) { refuse('Enter your email and password.'); return; }
  form.classList.add('is-logging-in'); inputs.forEach((i) => { i.readOnly = true; });
  submit.disabled = true; submit.setAttribute('aria-busy', 'true'); submit.textContent = 'Logging in';
  const started = Date.now();
  try {
    await api.login(data.get('email'), data.get('password'));
    markLogin();
    await wait(Math.max(0, 700 - (Date.now() - started))); // a quick answer still shows the state, not a flash
    form.classList.remove('is-logging-in'); form.classList.add('is-welcome');
    submit.setAttribute('aria-busy', 'false'); submit.textContent = 'Welcome back';
    await wait(reduced ? 150 : 650);
    location.replace('./');
  } catch (err) {
    form.classList.remove('is-logging-in'); inputs.forEach((i) => { i.readOnly = false; });
    submit.disabled = false; submit.setAttribute('aria-busy', 'false'); submit.textContent = 'Log in';
    refuse(err.message);
  }
});

// Forgot password: the answer is always the same, whether or not the email has an account.
form.querySelector('[data-forgot]').addEventListener('click', () => { form.hidden = true; forgotForm.hidden = false; forgotForm.querySelector('input').value = form.email.value; forgotForm.querySelector('input').focus(); });
forgotForm.querySelector('[data-back]').addEventListener('click', () => { forgotForm.hidden = true; form.hidden = false; form.email.focus(); });
forgotForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const note = forgotForm.querySelector('[data-reset-message]'); const bad = forgotForm.querySelector('[data-reset-error]');
  const button = forgotForm.querySelector('[data-reset-submit]');
  note.textContent = ''; bad.textContent = '';
  const email = forgotForm.email.value.trim();
  if (!email) { bad.textContent = 'Enter your email.'; return; }
  button.disabled = true; button.setAttribute('aria-busy', 'true'); button.textContent = 'Sending...';
  await api.requestPasswordReset(email);
  note.textContent = 'If that email has an account, a reset link is on its way.';
  button.disabled = false; button.setAttribute('aria-busy', 'false'); button.textContent = 'Send reset link';
});
