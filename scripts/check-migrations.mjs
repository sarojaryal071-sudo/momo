// Destructive-change guard for the backend deploy workflow (D-058).
// Fails when a migration that has not been applied yet contains: drop table, drop column, truncate, or delete from without where.
// A migration whose file name contains "-approved-destructive" is allowed (a person decided on purpose).
// Usage: node scripts/check-migrations.mjs [--dir backend/supabase/migrations] [--applied applied-versions.txt]
// applied-versions.txt: one migration version per line (the part of the file name before the first underscore). Without it,
// every migration counts as new (the first run on a fresh database).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const APPROVED_MARK = '-approved-destructive';

// Comments are not statements: remove /* ... */ and -- ... before looking.
export const stripComments = (sql) => sql.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ');

export function findDestructive(sql) {
  const text = stripComments(sql);
  const found = [];
  if (/\bdrop\s+table\b/i.test(text)) found.push('drop table');
  if (/\bdrop\s+column\b/i.test(text)) found.push('drop column');
  if (/\btruncate\b/i.test(text)) found.push('truncate');
  for (const m of text.matchAll(/\bdelete\s+from\b[^;]*/gi)) {
    if (!/\bwhere\b/i.test(m[0])) found.push('delete from without where');
  }
  return [...new Set(found)];
}

export const versionOf = (file) => file.split('_')[0];

// Returns [{ file, problems }] for the migrations that need a person's decision.
export function checkMigrations(dir, applied = new Set()) {
  const out = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    if (applied.has(versionOf(file)) || file.includes(APPROVED_MARK)) continue;
    const problems = findDestructive(readFileSync(join(dir, file), 'utf8'));
    if (problems.length) out.push({ file, problems });
  }
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i > -1 ? process.argv[i + 1] : fallback; };
  const dir = arg('--dir', 'backend/supabase/migrations');
  const appliedFile = arg('--applied', null);
  const applied = new Set(appliedFile ? readFileSync(appliedFile, 'utf8').split(/\s+/).filter(Boolean) : []);
  const bad = checkMigrations(dir, applied);
  if (bad.length) {
    for (const { file, problems } of bad) console.error(`BLOCKED: ${file} contains ${problems.join(', ')}.`);
    console.error(`These changes can destroy data. If you really mean it, rename the file so that its name contains "${APPROVED_MARK}" and push again.`);
    process.exit(1);
  }
  console.log(`Migration check passed (${applied.size} already applied, the rest contain nothing destructive).`);
}
