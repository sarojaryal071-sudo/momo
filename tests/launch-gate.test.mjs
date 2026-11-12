import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { hasPlaceholderData, launchBlockers } from '../scripts/lib/validate.mjs';

test('launchBlockers finds TODO text and data-pending', () => {
  assert.deepEqual(launchBlockers('<p>Fine</p>'), []);
  assert.deepEqual(launchBlockers('<p data-todo>TODO: x</p>'), ['TODO: text']);
  assert.deepEqual(launchBlockers('<span data-pending>£1</span>'), ['data-pending element']);
  assert.equal(hasPlaceholderData('{ "pending": true }'), true);
  assert.equal(hasPlaceholderData('{ "pending": false }'), false);
});

test('an indexable build fails while pending values remain, a normal build passes', () => {
  const run = (indexable) => spawnSync(process.execPath, ['scripts/build.mjs'], {
    encoding: 'utf8', env: { ...process.env, SITE_URL: 'https://example.test', SITE_INDEXABLE: indexable },
  });
  const blocked = run('true');
  assert.notEqual(blocked.status, 0);
  assert.match(blocked.stderr, /data-pending element remains/);
  assert.match(blocked.stderr, /"pending": true remains/);
  assert.equal(run('false').status, 0);
});
