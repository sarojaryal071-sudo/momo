import { api } from './shell.js';
import { RESET_CONFIRM_SECONDS, SAVED_MESSAGE_SECONDS } from './admin-config.js';

const settings = await api.getSettings();
const field = (form, name) => form.querySelector(`[data-field="${name}"]`);
const flash = (node, text, ms) => { node.textContent = text; setTimeout(() => { node.textContent = ''; }, ms * 1000); };

for (const form of document.querySelectorAll('[data-form]')) {
  for (const input of form.querySelectorAll('[data-field]')) {
    const name = input.dataset.field;
    if (name === 'ordering_paused') input.checked = !settings.ordering_open;
    else input.value = settings[name] ?? '';
  }
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const saved = form.querySelector('[data-saved]');
    const error = form.querySelector('[data-error]');
    error.textContent = '';
    const patch = {};
    for (const input of form.querySelectorAll('[data-field]')) {
      if (input.dataset.field === 'ordering_paused') patch.ordering_open = !input.checked;
      else patch[input.dataset.field] = input.value;
    }
    try {
      await api.saveSettings(patch);
      flash(saved, form.dataset.form === 'pause' ? (patch.ordering_open ? 'Saved. Ordering is open.' : 'Saved. Ordering is paused now.') : 'Saved', SAVED_MESSAGE_SECONDS);
    } catch (err) {
      error.textContent = err.message;
    }
  });
}

const demoOnly = document.querySelector('[data-demo-only]');
if (api.backend === 'mock') {
  demoOnly.hidden = false;
  const button = demoOnly.querySelector('[data-reset]');
  const msg = demoOnly.querySelector('[data-reset-msg]');
  let armed = false;
  button.addEventListener('click', async () => {
    if (!armed) {
      armed = true; button.textContent = 'Tap again to reset everything';
      setTimeout(() => { armed = false; button.textContent = 'Reset demo data'; }, RESET_CONFIRM_SECONDS * 1000);
      return;
    }
    armed = false; button.textContent = 'Reset demo data';
    await api.resetDemo();
    flash(msg, 'Demo data reset', SAVED_MESSAGE_SECONDS);
    const fresh = await api.getSettings();
    for (const form of document.querySelectorAll('[data-form]')) for (const input of form.querySelectorAll('[data-field]')) {
      if (input.dataset.field === 'ordering_paused') input.checked = !fresh.ordering_open; else input.value = fresh[input.dataset.field] ?? '';
    }
  });
}
