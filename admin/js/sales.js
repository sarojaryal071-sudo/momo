// Sales (D-064): total and number of Collected orders for a period, with a simple bar chart. No library: inline SVG plus a hidden table.
import { api } from './shell.js';
import { formatMoney, SALES_PERIODS, salesBars, salesRange } from '../../js/admin-rules.js';
import { shortDate } from './dates.js';
import { el } from './dom.js';
import { ukToday } from '../../js/mock-backend.js';

const PERIOD_KEY = 'ss-sales-period'; // remembered for the session
const CHART_HEIGHT = 160, CHART_TOP = 22, BAR_GAP = 6, BAR_MIN_W = 14, BAR_MAX_W = 64;
const NS = 'http://www.w3.org/2000/svg';
const svg = (name, attrs = {}, text) => { const n = document.createElementNS(NS, name); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); if (text != null) n.textContent = text; return n; };
const store = { get() { try { return JSON.parse(sessionStorage.getItem(PERIOD_KEY)) || {}; } catch { return {}; } }, set(v) { try { sessionStorage.setItem(PERIOD_KEY, JSON.stringify(v)); } catch { /* not remembered */ } } };

const periodsBox = document.querySelector('[data-periods]');
const customForm = document.querySelector('[data-custom]');
const fromIn = document.querySelector('[data-from]'); const toIn = document.querySelector('[data-to]');
const errorBox = document.querySelector('[data-error]');
const out = document.querySelector('[data-sales]');
const today = ukToday();
const saved = store.get();
let kind = SALES_PERIODS.some(([k]) => k === saved.kind) ? saved.kind : 'week';
fromIn.value = saved.from || today; toIn.value = saved.to || today;

const fmtRange = (a, b) => (a === b ? shortDate(a, true) : `${shortDate(a)} to ${shortDate(b)}`);
const barLabel = (b) => (b.from === b.to ? shortDate(b.from) : `${shortDate(b.from)} to ${shortDate(b.to)}`);

function chart(data) {
  const max = Math.max(...data.bars.map((b) => b.total), 1);
  const n = data.bars.length;
  const slot = Math.min(BAR_MAX_W + BAR_GAP, Math.max(BAR_MIN_W + BAR_GAP, 320 / n));
  const width = Math.max(n * slot, 280);
  const plot = CHART_HEIGHT - CHART_TOP;
  const s = svg('svg', { class: 'sales-chart', viewBox: `0 0 ${width} ${CHART_HEIGHT + 36}`, role: 'img', 'aria-label': `Sales by ${data.weekly ? 'week' : 'day'}. The same numbers are in the table below.` });
  s.append(svg('line', { x1: 0, x2: width, y1: CHART_HEIGHT, y2: CHART_HEIGHT, class: 'axis' }));
  data.bars.forEach((b, i) => {
    const h = b.total ? Math.max(3, Math.round((b.total / max) * plot)) : 0;
    const x = i * slot + BAR_GAP / 2, w = slot - BAR_GAP;
    const g = svg('g', { tabindex: 0, class: 'bar', role: 'img', 'aria-label': `${barLabel(b)}: ${formatMoney(b.total)}, ${b.count} ${b.count === 1 ? 'order' : 'orders'}` });
    g.append(svg('rect', { x, y: CHART_HEIGHT - h, width: w, height: h, rx: 3 }), svg('rect', { x, y: 0, width: w, height: CHART_HEIGHT, class: 'hit' }));
    if (b.total) g.append(svg('text', { x: x + w / 2, y: CHART_HEIGHT - h - 5, 'text-anchor': 'middle', class: 'val' }, formatMoney(b.total)));
    const label = data.weekly ? shortDate(b.from).replace(/^\w+ /, '') : (n <= 7 ? shortDate(b.from).split(' ')[0] : String(Number(b.from.slice(8))));
    g.append(svg('text', { x: x + w / 2, y: CHART_HEIGHT + 18, 'text-anchor': 'middle', class: 'tick' }, label));
    s.append(g);
  });
  const wrap = el('div', { className: 'sales-chart-wrap' }); wrap.append(s);
  return wrap;
}

function table(data) {
  const t = el('table', { className: 'visually-hidden' }, el('caption', {}, `Sales by ${data.weekly ? 'week' : 'day'}`),
    el('thead', {}, el('tr', {}, el('th', { scope: 'col' }, data.weekly ? 'Week' : 'Day'), el('th', { scope: 'col' }, 'Sales'), el('th', { scope: 'col' }, 'Orders'))),
    el('tbody', {}, ...data.bars.map((b) => el('tr', {}, el('td', {}, barLabel(b)), el('td', {}, formatMoney(b.total)), el('td', {}, String(b.count))))));
  return t;
}

async function show() {
  errorBox.hidden = true;
  customForm.hidden = kind !== 'custom';
  periodsBox.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.kind === kind)));
  const range = salesRange(kind, today, fromIn.value, toIn.value);
  if (range.error) { errorBox.textContent = range.error; errorBox.hidden = false; out.replaceChildren(); return; }
  store.set({ kind, from: fromIn.value, to: toIn.value });
  out.replaceChildren(el('p', { className: 'muted' }, 'Loading…'));
  let rows;
  try { rows = await api.salesSummary(range.from, range.to); } catch (e) { out.replaceChildren(el('p', { className: 'error', role: 'alert' }, `Sales could not be loaded. ${e.message}`)); return; }
  const data = salesBars(rows);
  const dates = fmtRange(range.from, range.to);
  const figures = el('div', { className: 'panel sales-figures' },
    el('p', { className: 'sales-figure' }, el('span', { className: 'sales-label' }, 'Sales'), el('span', { className: 'sales-value' }, formatMoney(data.total)), el('span', { className: 'muted' }, dates)),
    el('p', { className: 'sales-figure' }, el('span', { className: 'sales-label' }, 'Orders'), el('span', { className: 'sales-value' }, String(data.count)), el('span', { className: 'muted' }, dates)));
  out.replaceChildren(figures);
  if (!data.count) { out.append(el('p', { className: 'muted empty-state' }, 'No collected orders in this period.')); return; }
  out.append(el('section', { className: 'panel' }, el('h2', {}, `Sales by ${data.weekly ? 'week' : 'day'}`), chart(data), table(data), el('p', { className: 'muted' }, 'Collected orders only, counted on the pickup day.')));
}

for (const [k, label] of SALES_PERIODS) {
  const b = el('button', { type: 'button', className: 'chip', 'aria-pressed': 'false', 'data-kind': k }, label);
  b.addEventListener('click', () => { kind = k; show(); });
  periodsBox.append(b);
}
customForm.addEventListener('submit', (e) => { e.preventDefault(); show(); });
await show();
