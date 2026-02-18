import {
  continueWithUnknownRecipient,
  hasContactForEmail,
  isContactAlreadyExists,
  normalizeEmail,
} from './payment-request-recipient-flow';

describe(`payment request recipient flow`, () => {
  it(`normalizes email before matching contacts`, () => {
    const contacts = [{ email: `Payee@Example.com` }];
    expect(normalizeEmail(`  PAYEE@example.COM `)).toBe(`payee@example.com`);
    expect(hasContactForEmail(contacts, `payee@example.com`)).toBe(true);
  });

  it(`add & continue calls createContact then createPaymentRequest`, async () => {
    const callOrder: string[] = [];

    await continueWithUnknownRecipient({
      addToContacts: true,
      createContactAction: async () => {
        callOrder.push(`createContact`);
        return { ok: true, status: 201, message: `` };
      },
      createPaymentRequestAction: async () => {
        callOrder.push(`createPaymentRequest`);
      },
    });

    expect(callOrder).toEqual([`createContact`, `createPaymentRequest`]);
  });

  it(`continue without adding only creates payment request`, async () => {
    const createContactAction = jest.fn(async () => ({ ok: true, status: 201, message: `` }));
    const createPaymentRequestAction = jest.fn(async () => undefined);

    await continueWithUnknownRecipient({
      addToContacts: false,
      createContactAction,
      createPaymentRequestAction,
    });

    expect(createContactAction).not.toHaveBeenCalled();
    expect(createPaymentRequestAction).toHaveBeenCalledTimes(1);
  });

  it(`conflict during add contact still proceeds`, async () => {
    const createPaymentRequestAction = jest.fn(async () => undefined);

    await continueWithUnknownRecipient({
      addToContacts: true,
      createContactAction: async () => ({
        ok: false,
        status: 409,
        message: `Contact already exists`,
      }),
      createPaymentRequestAction,
    });

    expect(isContactAlreadyExists(409, `Contact already exists`)).toBe(true);
    expect(createPaymentRequestAction).toHaveBeenCalledTimes(1);
  });
});
