import { SESSION_EXPIRED_QUERY } from './session-expired-query';

describe(`session-expired-query (api-types)`, () => {
  it(`exposes SESSION_EXPIRED_QUERY`, () => {
    expect(SESSION_EXPIRED_QUERY).toBe(`session_expired`);
  });
});
