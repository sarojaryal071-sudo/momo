// Small DOM helpers for the admin screens. Customer and product text is always put in as text, never as HTML.
export const el = (tag, props = {}, ...kids) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'role' || k === 'list' || k.startsWith('aria-') || k.startsWith('data-')) node.setAttribute(k, v === true ? '' : v);
    else node[k] = v;
  }
  node.append(...kids.flat().filter((k) => k !== null && k !== undefined && k !== false));
  return node;
};

// A switch button (role="switch") with the words On and Off, styled by .switch in admin.css.
export function makeSwitch(labelText, initial, onChange) {
  const id = `sw-${Math.random().toString(36).slice(2, 8)}`;
  const text = el('span', { className: 'switch-text' }, initial ? 'On' : 'Off');
  const btn = el('button', { type: 'button', className: 'switch', role: 'switch', 'aria-checked': String(Boolean(initial)), 'aria-labelledby': id }, el('span', { className: 'switch-track', 'aria-hidden': 'true' }), text);
  const set = (on) => { btn.setAttribute('aria-checked', String(on)); text.textContent = on ? 'On' : 'Off'; };
  btn.addEventListener('click', () => { const on = btn.getAttribute('aria-checked') !== 'true'; set(on); onChange?.(on); });
  const row = el('div', { className: 'switch-row' }, el('span', { id }, labelText), btn);
  return { row, get: () => btn.getAttribute('aria-checked') === 'true', set };
}

// A labelled field. kind: input type, or 'textarea' / 'select' (with options [[value, label]]).
export function field(label, kind, props = {}, options = []) {
  const id = `f-${Math.random().toString(36).slice(2, 8)}`;
  let control;
  if (kind === 'textarea') control = el('textarea', { id, rows: 3, ...props });
  else if (kind === 'select') { control = el('select', { id, ...props }, ...options.map(([v, l]) => el('option', { value: v }, l))); if (props.value !== undefined) control.value = props.value; }
  else control = el('input', { id, type: kind, ...props });
  return { wrap: el('div', { className: 'field' }, el('label', { htmlFor: id }, label), control, props.hint ? el('p', { className: 'hint' }, props.hint) : null), control };
}

// "Saved" next to a button for a few seconds; errors stay until the next try.
export function feedback(parent) {
  const ok = el('span', { className: 'saved', role: 'status' });
  const bad = el('p', { className: 'error', role: 'alert' });
  parent.append(ok, bad);
  let timer;
  return {
    saved(text = 'Saved', seconds = 4) { bad.textContent = ''; ok.textContent = text; clearTimeout(timer); timer = setTimeout(() => { ok.textContent = ''; }, seconds * 1000); },
    error(text) { ok.textContent = ''; bad.textContent = text; },
    clear() { ok.textContent = ''; bad.textContent = ''; },
  };
}

// Runs an async save with a busy button and shows Saved or the error message.
export async function saving(button, fb, work, message = 'Saved') {
  fb.clear(); button.disabled = true;
  try { const r = await work(); fb.saved(message); return r; } catch (e) { fb.error(e.message); return undefined; } finally { button.disabled = false; }
}

// A short message at the top of the screen (new orders). One toast at a time; it goes away by itself.
export function toast(message, { seconds = 8, href } = {}) {
  document.querySelector('.toast')?.remove();
  const node = el('div', { className: 'toast', role: 'status' }, href ? el('a', { href }, message) : message,
    el('button', { type: 'button', className: 'toast-close', 'aria-label': 'Dismiss', onclick: () => node.remove() }, '×'));
  document.body.append(node);
  setTimeout(() => node.remove(), seconds * 1000);
}

// One row of action buttons that share one "Saved" or error message. Each item: { label, work, secondary, small }.
// The buttons sit side by side and only wrap when they do not fit.
export function actionBar(items) {
  const row = el('div', { className: 'btn-row' });
  const buttons = items.map((it) => el('button', { type: 'button', className: `btn${it.secondary ? ' btn-secondary' : ''}${it.small ? ' btn-small' : ''}` }, it.label));
  row.append(...buttons);
  const fb = feedback(row);
  buttons.forEach((b, i) => b.addEventListener('click', () => saving(b, fb, items[i].work)));
  return row;
}

// A frosted-glass confirm dialog with a dimmed backdrop. Resolves true (confirmed) or false (cancelled, Escape or tap outside).
export function confirmDialog({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false, card3d = false }) {
  if (typeof HTMLDialogElement === 'undefined') return Promise.resolve(window.confirm(`${title}\n${message}`));
  return new Promise((resolve) => {
    const id = `dlg-${Math.random().toString(36).slice(2, 8)}`;
    const dialog = el('dialog', { className: `glass-dialog${card3d ? ' card-3d' : ''}`, 'aria-labelledby': id });
    const finish = (value) => { if (dialog.open) dialog.close(); dialog.remove(); resolve(value); };
    const ok = el('button', { type: 'button', className: `btn${danger ? ' btn-danger' : ''}`, onclick: () => finish(true) }, confirmLabel);
    const no = el('button', { type: 'button', className: 'btn btn-secondary', onclick: () => finish(false) }, cancelLabel);
    dialog.append(card3d ? el('img', { className: 'card-3d-mark', src: '../assets/img/logo-mark-128.webp', width: 128, height: 107, alt: '' }) : null, el('h2', { id }, title), el('p', {}, message), el('div', { className: 'btn-row' }, ok, no));
    dialog.addEventListener('cancel', (e) => { e.preventDefault(); finish(false); });
    dialog.addEventListener('click', (e) => { if (e.target === dialog) finish(false); });
    document.body.append(dialog);
    dialog.showModal();
    no.focus();
  });
}
