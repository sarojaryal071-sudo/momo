// The only data layer the admin screens use. Two implementations, chosen by siteConfig.backend:
//  - supabase: the real backend (api-supabase.js): Supabase Auth, row-level security, SQL functions.
//  - mock: data in this browser's localStorage (api-mock.js), for local work and the automated tests only.
// The build removes api-mock.js from a site that runs on Supabase.
import { siteConfig } from '../../js/site-config.js';

export const api = siteConfig.backend === 'supabase'
  ? (await import('./api-supabase.js')).supabaseApi
  : (await import('./api-mock.js')).mockApi;
