import { shouldFinalizeLoginLoading } from './login-loading-guard';

describe(`shouldFinalizeLoginLoading (consumer-mobile)`, () => {
  it(`returns false when redirect navigation already started`, () => {
    expect(shouldFinalizeLoginLoading(true)).toBe(false);
  });

  it(`returns true when redirect navigation has not started`, () => {
    expect(shouldFinalizeLoginLoading(false)).toBe(true);
  });
});
