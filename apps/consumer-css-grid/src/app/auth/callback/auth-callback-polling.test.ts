import { describe, expect, it } from '@jest/globals';

import {
  AUTH_CALLBACK_MAX_SESSION_POLLS,
  AUTH_CALLBACK_SESSION_POLL_DELAY_MS,
  getAuthCallbackSessionPollDelayMs,
  pollForAuthCallbackSession,
} from './auth-callback-polling';

describe(`auth callback polling`, () => {
  it(`uses a stable 10 second polling window`, () => {
    expect(AUTH_CALLBACK_MAX_SESSION_POLLS).toBe(20);
    expect(AUTH_CALLBACK_SESSION_POLL_DELAY_MS).toBe(500);
    expect(getAuthCallbackSessionPollDelayMs(0)).toBe(500);
    expect(getAuthCallbackSessionPollDelayMs(10)).toBe(500);
  });

  it(`keeps polling until a delayed session becomes available`, async () => {
    let attempts = 0;
    const sleeps: number[] = [];

    const result = await pollForAuthCallbackSession({
      poll: async () => {
        attempts += 1;
        return attempts >= 4;
      },
      sleep: async (delayMs) => {
        sleeps.push(delayMs);
      },
    });

    expect(result).toBe(true);
    expect(attempts).toBe(4);
    expect(sleeps).toEqual([500, 500, 500]);
  });

  it(`stops after the configured retry budget`, async () => {
    let attempts = 0;
    const sleeps: number[] = [];

    const result = await pollForAuthCallbackSession({
      maxPolls: 3,
      poll: async () => {
        attempts += 1;
        return false;
      },
      sleep: async (delayMs) => {
        sleeps.push(delayMs);
      },
    });

    expect(result).toBe(false);
    expect(attempts).toBe(3);
    expect(sleeps).toEqual([500, 500]);
  });
});
