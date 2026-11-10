// Phone menu: a full-screen layer opened by a button. Without this script the links simply show as a row.
import { usedKeyboard } from './input-mode.js';

const toggle = document.querySelector('[data-menu-toggle]');
const menu = document.querySelector('[data-menu]');

if (toggle && menu) {
  const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';
  // Opened with the keyboard: the first link is focused and its ring shows. Opened by touch or mouse: the layer itself, no ring.
  const setOpen = (open, { returnFocus = false } = {}) => {
    toggle.setAttribute('aria-expanded', String(open));
    menu.classList.toggle('is-open', open);
    document.documentElement.classList.toggle('menu-open', open);
    if (open) (usedKeyboard() ? menu.querySelector('.nav-list a') : menu)?.focus({ preventScroll: true });
    else if (returnFocus) toggle.focus();
  };
  toggle.addEventListener('click', () => setOpen(!isOpen(), { returnFocus: true }));
  menu.addEventListener('click', (e) => {
    if (!isOpen()) return;
    if (e.target.closest('a')) setOpen(false);
    else if (e.target.closest('[data-menu-close]')) setOpen(false, { returnFocus: true });
    else if (!e.target.closest('button')) setOpen(false, { returnFocus: true }); // a tap outside the pills
  });
  document.addEventListener('keydown', (e) => {
    if (!isOpen()) return;
    if (e.key === 'Escape') { setOpen(false, { returnFocus: true }); return; }
    if (e.key !== 'Tab') return;
    // Keep Tab inside the full-screen layer: the page behind it is not reachable while it is open.
    const items = [...menu.querySelectorAll('a[href], button')].filter((n) => n.offsetParent !== null);
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === menu)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
}
