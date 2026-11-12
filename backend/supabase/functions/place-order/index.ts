// place-order: the public endpoint that saves an order (Step 3, architecture section 6).
// Everything that matters is decided in the database function public.place_order (prices, options, stock, pickup rules,
// notice period, pause, daily limit, order number). This function adds: CORS for the site's origins only, the honeypot,
// a per-IP rate limit. There is no email (D-056): new orders reach the owner through the admin panel.
// Secrets (Supabase function secrets): ALLOWED_ORIGINS.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { allowedOrigin, clientIp, LIMITS, parseOrderBody } from '../_shared/validate.ts';

const json = (status: number, body: unknown, cors: Record<string, string>) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

async function sha256(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  const origin = allowedOrigin(req.headers.get('origin'), Deno.env.get('ALLOWED_ORIGINS') ?? '');
  const cors: Record<string, string> = origin
    ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'content-type, apikey, authorization', 'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin' }
    : {};
  if (req.method === 'OPTIONS') return new Response(null, { status: origin ? 204 : 403, headers: cors });
  if (!origin) return json(403, { code: 'origin', message: 'This request is not allowed.' }, cors);
  if (req.method !== 'POST') return json(405, { code: 'method', message: 'Method not allowed.' }, cors);

  let body: unknown;
  try { body = await req.json(); } catch { return json(400, { code: 'bad_request', message: 'The order could not be read.' }, cors); }
  const parsed = parseOrderBody(body);
  if (!parsed.ok) return json(422, { code: parsed.code, message: parsed.message }, cors);
  // Honeypot: a bot filled the hidden field. Look like a success, save nothing.
  if (parsed.honeypot) return json(200, { orderNumber: 'SS-0000-00', totalPence: 0, emailed: false }, cors);

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

  const key = `order:${(await sha256(clientIp(req.headers))).slice(0, 32)}`;
  const { data: allowed, error: rateError } = await db.rpc('check_rate_limit', { p_key: key, p_limit: LIMITS.rateLimit, p_window_seconds: LIMITS.rateWindowSeconds });
  if (!rateError && allowed === false) return json(429, { code: 'rate', message: 'Too many orders from this connection. Please try again in a few minutes.' }, cors);

  const { data, error } = await db.rpc('place_order', { p: parsed.payload });
  if (error || !data) { console.error('place_order failed', error?.message); return json(500, { code: 'server', message: 'We could not place your order.' }, cors); }
  if (!data.ok) return json(422, { code: data.code, message: data.message }, cors);

  return json(200, { orderNumber: data.order_number, totalPence: data.total_pence, emailed: false }, cors);
});
