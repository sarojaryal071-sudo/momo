// Small fetch helpers for the Supabase REST API and edge functions. Public values only: the project URL and the publishable key
// (sb_publishable_..., not a JWT, so it goes in the apikey header only). Used when siteConfig.backend is 'supabase'.
import { siteConfig } from './site-config.js';

export const isLive = (config = siteConfig) => config.backend === 'supabase' && Boolean(config.supabaseUrl && config.supabaseAnonKey);
const base = (config) => config.supabaseUrl.replace(/\/+$/, '');
const headers = (config) => ({ apikey: config.supabaseAnonKey });

async function send(url, init, config) {
  const control = new AbortController();
  const timer = setTimeout(() => control.abort(), config.gatewayTimeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: control.signal });
    return res;
  } finally { clearTimeout(timer); }
}

// GET a table or view: restGet('settings?select=key,value')
export async function restGet(path, config = siteConfig) {
  const res = await send(`${base(config)}/rest/v1/${path}`, { headers: headers(config) }, config);
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

export async function rpc(name, body, config = siteConfig) {
  const res = await send(`${base(config)}/rest/v1/rpc/${name}`, { method: 'POST', headers: { ...headers(config), 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) }, config);
  if (!res.ok) throw new Error(`${name}: ${res.status}`);
  return res.json();
}

export function callFunction(name, body, config = siteConfig) {
  return send(`${base(config)}/functions/v1/${name}`, { method: 'POST', headers: { ...headers(config), 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, config);
}

export const settingsMap = (rows) => Object.fromEntries(rows.map((r) => [r.key, r.value]));
