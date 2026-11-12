import { api } from './shell.js';
import { SAVED_MESSAGE_SECONDS } from './admin-config.js';

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
