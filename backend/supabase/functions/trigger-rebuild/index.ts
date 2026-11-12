// trigger-rebuild: the admin's Publish button. Only a signed-in admin can call it. It marks the site as Publishing and asks
// GitHub to run the deploy workflow. Secrets: GITHUB_DISPATCH_TOKEN (fine-grained, this repository only, Actions: read and write),
// ALLOWED_ORIGINS, GITHUB_REPO (optional, default sarojaryal071-sudo/momo), GITHUB_WORKFLOW (optional, default deploy.yml).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { allowedOrigin } from '../_shared/validate.ts';

Deno.serve(async (req) => {
  const origin = allowedOrigin(req.headers.get('origin'), Deno.env.get('ALLOWED_ORIGINS') ?? '');
  const cors: Record<string, string> = origin
    ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'content-type, apikey, authorization', 'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin' }
    : {};
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (req.method === 'OPTIONS') return new Response(null, { status: origin ? 204 : 403, headers: cors });
  if (!origin) return reply(403, { message: 'This request is not allowed.' });
  if (req.method !== 'POST') return reply(405, { message: 'Method not allowed.' });

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: userData, error: userError } = jwt ? await db.auth.getUser(jwt) : { data: null, error: new Error('no session') };
  if (userError || !userData?.user) return reply(401, { message: 'Please log in again.' });
  const { data: admin } = await db.from('admins').select('user_id').eq('user_id', userData.user.id).maybeSingle();
  if (!admin) return reply(403, { message: 'Only an admin can publish.' });

  const token = Deno.env.get('GITHUB_DISPATCH_TOKEN');
  if (!token) return reply(503, { message: 'Publishing is not set up yet.' });
  await db.rpc('set_site_status', { p_state: 'publishing', p_detail: null });
  const repo = Deno.env.get('GITHUB_REPO') ?? 'sarojaryal071-sudo/momo';
  const workflow = Deno.env.get('GITHUB_WORKFLOW') ?? 'deploy.yml';
  const res = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/${workflow}/dispatches`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json', 'User-Agent': 'steam-and-spice-admin' },
    body: JSON.stringify({ ref: 'main' }),
  });
  if (!res.ok) {
    await db.rpc('set_site_status', { p_state: 'failed', p_detail: `GitHub answered ${res.status}` });
    return reply(502, { message: 'Could not start the build. Try again in a minute.' });
  }
  return reply(202, { state: 'publishing' });
});
