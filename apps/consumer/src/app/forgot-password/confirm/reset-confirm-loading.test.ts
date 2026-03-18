import { shouldFinalizeResetConfirmLoading } from './reset-confirm-loading';

describe(`shouldFinalizeResetConfirmLoading (consumer web)`, () => {
  it(`returns false when redirect navigation already started`, () => {
    expect(shouldFinalizeResetConfirmLoading(true)).toBe(false);
  });

  it(`returns true when redirect navigation has not started`, () => {
    expect(shouldFinalizeResetConfirmLoading(false)).toBe(true);
  });
});
