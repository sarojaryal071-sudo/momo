// build-status: the deploy workflow reports Live or Failed here when it finishes, so the admin can show the state.
// The workflow holds a GitHub secret BUILD_STATUS_TOKEN (a random string); the same value is the function secret of the same name.
// It can only set the site state: it cannot read or change anything else.
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  if (req.method !== 'POST') return reply(405, { message: 'Method not allowed.' });
  const expected = Deno.env.get('BUILD_STATUS_TOKEN');
  const given = req.headers.get('x-build-token') ?? '';
  if (!expected || given.length !== expected.length || given !== expected) return reply(401, { message: 'Not allowed.' });
  let body: { state?: string; detail?: string } = {};
  try { body = await req.json(); } catch { return reply(400, { message: 'Bad request.' }); }
  if (body.state !== 'live' && body.state !== 'failed') return reply(400, { message: 'State must be live or failed.' });
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const { error } = await db.rpc('set_site_status', { p_state: body.state, p_detail: (body.detail ?? '').slice(0, 200) || null });
  return error ? reply(500, { message: 'Could not save the state.' }) : reply(200, { ok: true });
});
