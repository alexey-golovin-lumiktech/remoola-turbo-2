import { describe, expect, it } from '@jest/globals';

import { AUTH_INPUT_CLASS } from './authInputClass';
import { SIGNUP_INPUT_CLASS } from '../../features/signup/ui/inputClass';

describe(`auth input class`, () => {
  it(`uses an explicit Tailwind primitive instead of the legacy bare input classname`, () => {
    expect(AUTH_INPUT_CLASS).not.toMatch(/(^|\s)input(\s|$)/);
    expect(AUTH_INPUT_CLASS).toContain(`bg-white`);
    expect(AUTH_INPUT_CLASS).toContain(`dark:bg-slate-800`);
    expect(AUTH_INPUT_CLASS).toContain(`border-slate-300`);
  });

  it(`keeps signup fields aligned with the shared auth input primitive`, () => {
    expect(SIGNUP_INPUT_CLASS).toBe(AUTH_INPUT_CLASS);
  });
});
