import { envs } from './envs';

describe(`envs`, () => {
  it(`defaults AUTH_PER_EMAIL_RATE_LIMIT to 50`, () => {
    expect(envs.AUTH_PER_EMAIL_RATE_LIMIT).toBe(50);
  });
});
