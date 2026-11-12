// Runs the database migrations and policy tests on a throw-away local PostgreSQL (backend/tests/run-local.sh).
// Skipped when no PostgreSQL server binaries are installed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';

const hasPostgres = (() => { try { return readdirSync('/usr/lib/postgresql').length > 0; } catch { return false; } })();

test('database migrations, policies, order rules and concurrency', { skip: !hasPostgres && 'PostgreSQL server binaries not installed', timeout: 120000 }, () => {
  const r = spawnSync('bash', ['backend/tests/run-local.sh'], { encoding: 'utf8' });
  assert.equal(r.status, 0, `${r.stdout.split('\n').filter((l) => !l.startsWith('ok')).join('\n')}\n${r.stderr}`);
  assert.match(r.stdout, /ALL DATABASE TESTS PASSED/);
});
