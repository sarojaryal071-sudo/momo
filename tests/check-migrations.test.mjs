import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkMigrations, findDestructive } from '../scripts/check-migrations.mjs';

test('destructive statements are found', () => {
  assert.deepEqual(findDestructive('DROP TABLE public.orders;'), ['drop table']);
  assert.deepEqual(findDestructive('drop table if exists x;'), ['drop table']);
  assert.deepEqual(findDestructive('alter table products drop column price_pence;'), ['drop column']);
  assert.deepEqual(findDestructive('TRUNCATE orders;'), ['truncate']);
  assert.deepEqual(findDestructive('delete from orders;'), ['delete from without where']);
  assert.deepEqual(findDestructive('delete from orders\n  using x;'), ['delete from without where']);
});
test('safe statements and comments pass', () => {
  assert.deepEqual(findDestructive('delete from orders where id = 1;'), []);
  assert.deepEqual(findDestructive('-- drop table orders\n/* truncate x; delete from y; */ select 1;'), []);
  assert.deepEqual(findDestructive('create table a (b uuid references c (id) on delete cascade);'), []);
  assert.deepEqual(findDestructive('alter table a add column b int; drop trigger t on a; drop function f();'), []);
});
test('only migrations that are not applied yet are checked, and the approved name is allowed', () => {
  const dir = mkdtempSync(join(tmpdir(), 'mig-'));
  writeFileSync(join(dir, '0001_old.sql'), 'drop table old;');
  writeFileSync(join(dir, '0002_new.sql'), 'truncate things;');
  writeFileSync(join(dir, '0003_fine.sql'), 'create table z (id int);');
  writeFileSync(join(dir, '0004_cleanup-approved-destructive.sql'), 'drop table gone;');
  assert.deepEqual(checkMigrations(dir, new Set(['0001'])).map((r) => r.file), ['0002_new.sql']);
  assert.deepEqual(checkMigrations(dir, new Set(['0001', '0002'])), []);
  assert.equal(checkMigrations(dir, new Set()).length, 2); // a fresh database: 0001 and 0002 are both new
});
test('the real migrations (the first run on a fresh database) contain nothing destructive', () => {
  assert.deepEqual(checkMigrations('backend/supabase/migrations'), []);
});
