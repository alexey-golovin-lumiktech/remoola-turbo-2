import { describe, expect, it } from '@jest/globals';

import { AUTH_CALLBACK_MAX_SESSION_POLLS, getAuthCallbackSessionPollDelayMs } from './auth-callback-polling';

describe(`auth callback polling`, () => {
  it(`uses bounded backoff instead of a hot 100ms loop`, () => {
    expect(AUTH_CALLBACK_MAX_SESSION_POLLS).toBe(6);
    expect(getAuthCallbackSessionPollDelayMs(0)).toBe(250);
    expect(getAuthCallbackSessionPollDelayMs(1)).toBe(500);
    expect(getAuthCallbackSessionPollDelayMs(2)).toBe(750);
    expect(getAuthCallbackSessionPollDelayMs(3)).toBe(1000);
    expect(getAuthCallbackSessionPollDelayMs(10)).toBe(1000);
  });
});
