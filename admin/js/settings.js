import { api } from './shell.js';
import { SAVED_MESSAGE_SECONDS } from './admin-config.js';

const settings = await api.getSettings();
const flash = (node, text, ms) => { node.textContent = text; setTimeout(() => { node.textContent = ''; }, ms * 1000); };
const setSwitch = (btn, on) => { btn.setAttribute('aria-checked', String(on)); btn.querySelector('.switch-text').textContent = on ? 'On' : 'Off'; };

for (const form of document.querySelectorAll('[data-form]')) {
  for (const input of form.querySelectorAll('[data-field]')) input.value = settings[input.dataset.field] ?? '';
  const toggle = form.querySelector('[data-switch="ordering_paused"]');
  if (toggle) {
    setSwitch(toggle, !settings.ordering_open);
    toggle.addEventListener('click', () => setSwitch(toggle, toggle.getAttribute('aria-checked') !== 'true')); // a button with role="switch": Space and Enter work too
  }
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const saved = form.querySelector('[data-saved]');
    const error = form.querySelector('[data-error]');
    error.textContent = '';
    const patch = {};
    for (const input of form.querySelectorAll('[data-field]')) patch[input.dataset.field] = input.value;
    if (toggle) patch.ordering_open = toggle.getAttribute('aria-checked') !== 'true';
    try {
      await api.saveSettings(patch);
      flash(saved, toggle ? (patch.ordering_open ? 'Saved. Ordering is open.' : 'Saved. Ordering is paused now.') : 'Saved', SAVED_MESSAGE_SECONDS);
      document.dispatchEvent(new CustomEvent('settings-changed')); // the paused strip updates at once
    } catch (err) {
      error.textContent = err.message;
    }
  });
}
// Resume from the strip on this page also flips the switch back.
document.addEventListener('settings-changed', async () => {
  const toggle = document.querySelector('[data-switch="ordering_paused"]');
  if (toggle) setSwitch(toggle, !(await api.getSettings()).ordering_open);
});
