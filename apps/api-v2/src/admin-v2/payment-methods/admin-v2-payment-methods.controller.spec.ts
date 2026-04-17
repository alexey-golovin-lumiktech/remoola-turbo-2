import { AdminV2PaymentMethodsController } from './admin-v2-payment-methods.controller';

describe(`AdminV2PaymentMethodsController`, () => {
  it(`guards read routes with payment_methods.read and write routes with payment_methods.manage only`, async () => {
    const assertCapability = jest.fn(async () => ({
      role: `OPS_ADMIN`,
      capabilities: [`payment_methods.read`],
      workspaces: [`payment_methods`],
      source: `schema`,
    }));
    const listPaymentMethods = jest.fn(async () => ({ items: [], total: 0, page: 1, pageSize: 20 }));
    const getPaymentMethodCase = jest.fn(async () => ({ id: `pm-1` }));
    const disablePaymentMethod = jest.fn(async () => ({ ok: true }));
    const removeDefaultPaymentMethod = jest.fn(async () => ({ ok: true }));
    const escalateDuplicatePaymentMethod = jest.fn(async () => ({ ok: true }));
    const controller = new AdminV2PaymentMethodsController(
      {
        listPaymentMethods,
        getPaymentMethodCase,
        disablePaymentMethod,
        removeDefaultPaymentMethod,
        escalateDuplicatePaymentMethod,
      } as never,
      {
        assertCapability,
      } as never,
    );

    await controller.listPaymentMethods(
      {
        id: `admin-1`,
        email: `ops@example.com`,
        type: `ADMIN`,
        sessionId: `session-1`,
      } as never,
      {
        page: `2`,
        pageSize: `10`,
        consumerId: `consumer-1`,
        type: `BANK_ACCOUNT`,
        defaultSelected: `true`,
        fingerprint: `fp-1`,
        includeDeleted: `true`,
      },
    );

    await controller.getPaymentMethodCase(
      {
        id: `admin-1`,
        email: `ops@example.com`,
        type: `ADMIN`,
        sessionId: `session-1`,
      } as never,
      `pm-1`,
    );

    await controller.disablePaymentMethod(
      {
        id: `admin-1`,
        email: `super@example.com`,
        type: `SUPER`,
        sessionId: `session-1`,
      } as never,
      `pm-1`,
      { version: 1, confirmed: true, reason: `Fraud` },
      {
        ip: `127.0.0.1`,
        headers: {
          'user-agent': `jest`,
          'idempotency-key': `idem-1`,
        },
      } as never,
    );

    await controller.removeDefaultPaymentMethod(
      {
        id: `admin-1`,
        email: `super@example.com`,
        type: `SUPER`,
        sessionId: `session-1`,
      } as never,
      `pm-1`,
      { version: 2 },
      {
        ip: `127.0.0.1`,
        headers: {
          'user-agent': `jest`,
          'idempotency-key': `idem-2`,
        },
      } as never,
    );

    await controller.duplicateEscalatePaymentMethod(
      {
        id: `admin-1`,
        email: `super@example.com`,
        type: `SUPER`,
        sessionId: `session-1`,
      } as never,
      `pm-1`,
      { version: 3 },
      {
        ip: `127.0.0.1`,
        headers: {
          'user-agent': `jest`,
          'idempotency-key': `idem-3`,
        },
      } as never,
    );

    expect(assertCapability).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ id: `admin-1` }),
      `payment_methods.read`,
    );
    expect(listPaymentMethods).toHaveBeenCalledWith({
      page: 2,
      pageSize: 10,
      consumerId: `consumer-1`,
      type: `BANK_ACCOUNT`,
      defaultSelected: true,
      fingerprint: `fp-1`,
      includeDeleted: true,
    });
    expect(assertCapability).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ id: `admin-1` }),
      `payment_methods.read`,
    );
    expect(getPaymentMethodCase).toHaveBeenCalledWith(`pm-1`);
    expect(assertCapability).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ id: `admin-1` }),
      `payment_methods.manage`,
    );
    expect(disablePaymentMethod).toHaveBeenCalledWith(
      `pm-1`,
      `admin-1`,
      { version: 1, confirmed: true, reason: `Fraud` },
      expect.objectContaining({
        ipAddress: `127.0.0.1`,
        userAgent: `jest`,
        idempotencyKey: `idem-1`,
      }),
    );
    expect(assertCapability).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({ id: `admin-1` }),
      `payment_methods.manage`,
    );
    expect(removeDefaultPaymentMethod).toHaveBeenCalledWith(
      `pm-1`,
      `admin-1`,
      { version: 2 },
      expect.objectContaining({
        idempotencyKey: `idem-2`,
      }),
    );
    expect(assertCapability).toHaveBeenNthCalledWith(
      5,
      expect.objectContaining({ id: `admin-1` }),
      `payment_methods.manage`,
    );
    expect(escalateDuplicatePaymentMethod).toHaveBeenCalledWith(
      `pm-1`,
      `admin-1`,
      { version: 3 },
      expect.objectContaining({
        idempotencyKey: `idem-3`,
      }),
    );
  });
});
