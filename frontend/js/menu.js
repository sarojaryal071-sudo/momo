// Phone menu: a button that opens the navigation panel. Without this script the links simply show as a row.
const toggle = document.querySelector('[data-menu-toggle]');
const menu = document.querySelector('[data-menu]');

if (toggle && menu) {
  const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';
  // Was the last input the keyboard? Then focus goes to the first link and its ring shows; otherwise to the panel, with no ring.
  let lastInput = 'pointer';
  document.addEventListener('keydown', () => { lastInput = 'key'; }, true);
  document.addEventListener('pointerdown', () => { lastInput = 'pointer'; }, true);
  const setOpen = (open, { returnFocus = false } = {}) => {
    toggle.setAttribute('aria-expanded', String(open));
    menu.classList.toggle('is-open', open);
    document.documentElement.classList.toggle('menu-open', open);
    if (open) (lastInput === 'key' ? menu.querySelector('a') : menu)?.focus({ preventScroll: true });
    else if (returnFocus) toggle.focus();
  };
  toggle.addEventListener('click', () => setOpen(!isOpen(), { returnFocus: true }));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen()) setOpen(false, { returnFocus: true }); });
}
