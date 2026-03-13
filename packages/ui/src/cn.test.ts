import assert from 'node:assert/strict';
import test from 'node:test';

import { cn } from './cn';

test(`merges conflicting Tailwind utilities`, () => {
  assert.equal(cn(`px-2`, `px-4`), `px-4`);
  assert.equal(cn(`text-sm`, `text-lg`), `text-lg`);
});

test(`preserves non-Tailwind and CSS-module classes`, () => {
  assert.equal(cn(`layoutRoot`, `card`, `px-2`), `layoutRoot card px-2`);
});

test(`keeps last-class-wins override semantics`, () => {
  assert.equal(cn(`px-2 py-1`, undefined, `px-8`, `py-3`, undefined), `px-8 py-3`);
});
