import assert from 'node:assert/strict';
import test from 'node:test';

import { isUnsafeEnvironment, parseOptions } from './options';

test(`parseOptions defaults and clamp`, () => {
  const defaults = parseOptions([`node`, `cli.js`, `fill`]);
  assert.equal(defaults.mode, `fill`);
  assert.equal(defaults.perTable, 20);
  assert.equal(defaults.confirm, false);

  const clampedHigh = parseOptions([`node`, `cli.js`, `fill`, `--per-table=999`]);
  assert.equal(clampedHigh.perTable, 20);

  const clampedLow = parseOptions([`node`, `cli.js`, `refresh`, `--per-table=0`, `--confirm`]);
  assert.equal(clampedLow.mode, `refresh`);
  assert.equal(clampedLow.perTable, 1);
  assert.equal(clampedLow.confirm, true);

  const cleanup = parseOptions([`node`, `cli.js`, `cleanup`]);
  assert.equal(cleanup.mode, `cleanup`);
  assert.equal(cleanup.perTable, 20);
  assert.equal(cleanup.confirm, false);
});

test(`isUnsafeEnvironment detects production`, () => {
  assert.equal(isUnsafeEnvironment(`production`), true);
  assert.equal(isUnsafeEnvironment(`PRODUCTION`), true);
  assert.equal(isUnsafeEnvironment(`development`), false);
  assert.equal(isUnsafeEnvironment(undefined), false);
});
