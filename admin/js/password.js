// Show or hide a password field (the button's accessible name says which).
export function wirePasswordToggle(root) {
  const toggle = root.querySelector('[data-toggle-password]');
  const input = toggle?.parentElement.querySelector('input');
  if (!toggle || !input) return;
  toggle.addEventListener('click', () => {
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    toggle.classList.toggle('is-shown', show);
    toggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    toggle.setAttribute('aria-pressed', String(show));
  });
}
