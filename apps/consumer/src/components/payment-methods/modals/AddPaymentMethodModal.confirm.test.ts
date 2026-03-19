import { resolveConfirmPersistErrorMessage } from './AddPaymentMethodModal';

type MockResponse = {
  ok: boolean;
  json: jest.Mock<Promise<unknown>, []>;
};

describe(`resolveConfirmPersistErrorMessage`, () => {
  it(`returns null on successful persist response`, async () => {
    const response: MockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({}),
    };

    await expect(resolveConfirmPersistErrorMessage(response)).resolves.toBeNull();
  });

  it(`returns backend message for non-ok confirm response`, async () => {
    const response: MockResponse = {
      ok: false,
      json: jest.fn().mockResolvedValue({ message: `Card fingerprint already exists` }),
    };

    await expect(resolveConfirmPersistErrorMessage(response)).resolves.toBe(`Card fingerprint already exists`);
  });

  it(`falls back when backend confirm response has no JSON body`, async () => {
    const response: MockResponse = {
      ok: false,
      json: jest.fn().mockRejectedValue(new Error(`invalid json`)),
    };

    await expect(resolveConfirmPersistErrorMessage(response)).resolves.toBe(`Failed to add payment method`);
  });
});
