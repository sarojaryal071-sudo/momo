import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { hasPlaceholderData, launchBlockers } from '../scripts/lib/validate.mjs';

test('launchBlockers finds TODO text and data-placeholder', () => {
  assert.deepEqual(launchBlockers('<p>Fine</p>'), []);
  assert.deepEqual(launchBlockers('<p data-todo>TODO: x</p>'), ['TODO: text']);
  assert.deepEqual(launchBlockers('<span data-placeholder>£1</span>'), ['data-placeholder element']);
  assert.equal(hasPlaceholderData('{ "placeholder": true }'), true);
  assert.equal(hasPlaceholderData('{ "placeholder": false }'), false);
});

test('an indexable build fails while sample values remain, a normal build passes', () => {
  const run = (indexable) => spawnSync(process.execPath, ['scripts/build.mjs'], {
    encoding: 'utf8', env: { ...process.env, SITE_URL: 'https://example.test', SITE_INDEXABLE: indexable },
  });
  const blocked = run('true');
  assert.notEqual(blocked.status, 0);
  assert.match(blocked.stderr, /data-placeholder element remains/);
  assert.match(blocked.stderr, /"placeholder": true remains/);
  assert.equal(run('false').status, 0);
});
