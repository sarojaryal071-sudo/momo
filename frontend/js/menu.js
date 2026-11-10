// Phone menu: a button that opens the navigation panel. Without this script the links simply show as a row.
const toggle = document.querySelector('[data-menu-toggle]');
const menu = document.querySelector('[data-menu]');

if (toggle && menu) {
  const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';
  const setOpen = (open, { returnFocus = false } = {}) => {
    toggle.setAttribute('aria-expanded', String(open));
    menu.classList.toggle('is-open', open);
    if (open) menu.querySelector('a')?.focus();
    else if (returnFocus) toggle.focus();
  };
  toggle.addEventListener('click', () => setOpen(!isOpen(), { returnFocus: true }));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen()) setOpen(false, { returnFocus: true }); });
  document.addEventListener('click', (e) => { if (isOpen() && !menu.contains(e.target) && !toggle.contains(e.target)) setOpen(false); });
  menu.addEventListener('focusout', (e) => { if (isOpen() && e.relatedTarget && !menu.contains(e.relatedTarget) && e.relatedTarget !== toggle) setOpen(false); });
}
