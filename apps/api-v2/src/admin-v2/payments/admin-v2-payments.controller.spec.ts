import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ForbiddenException, type INestApplication } from '@nestjs/common';
import request from 'supertest';

import { AdminV2PaymentReversalService } from './admin-v2-payment-reversal.service';
import { AdminV2PaymentsController } from './admin-v2-payments.controller';
import { AdminV2PaymentsService } from './admin-v2-payments.service';
import { bootstrapApiTestApp } from '../../../test/helpers/bootstrap-api-test-app';
import { AdminAuthService } from '../../admin-auth/admin-auth.service';
import { AdminV2AccessService } from '../admin-v2-access.service';

describe(`AdminV2PaymentsController`, () => {
  const actor = { id: `admin-1`, email: `admin@example.com`, type: `ADMIN` } as never;

  it(`createRefund: verifies step-up and delegates`, async () => {
    const assertCapability = jest.fn<(admin: unknown, capability: string) => Promise<object>>(async () => ({}));
    const verifyStepUp = jest.fn<(adminId: string, password: string) => Promise<void>>(async () => undefined);
    const createReversal = jest.fn<(id: string, body: object, adminId: string) => Promise<object>>(async () => ({
      ledgerId: `ledger-1`,
      kind: `REFUND`,
    }));
    const controller = new AdminV2PaymentsController(
      {} as never,
      { assertCapability } as never,
      { verifyStepUp } as never,
      { createReversal } as never,
    );

    const result = await controller.createRefund(actor, `payment-1`, {
      amount: 7,
      reason: `test`,
      passwordConfirmation: `Current1!@#abc`,
    } as never);

    expect(assertCapability).toHaveBeenCalledWith(actor, `payments.reverse`);
    expect(verifyStepUp).toHaveBeenCalledWith(`admin-1`, `Current1!@#abc`);
    expect(createReversal).toHaveBeenCalledWith(`payment-1`, { amount: 7, reason: `test`, kind: `REFUND` }, `admin-1`);
    expect(result).toEqual({ ledgerId: `ledger-1`, kind: `REFUND` });
  });

  it(`createChargeback: verifies step-up and delegates`, async () => {
    const assertCapability = jest.fn<(admin: unknown, capability: string) => Promise<object>>(async () => ({}));
    const verifyStepUp = jest.fn<(adminId: string, password: string) => Promise<void>>(async () => undefined);
    const createReversal = jest.fn<(id: string, body: object, adminId: string) => Promise<object>>(async () => ({
      ledgerId: `ledger-2`,
      kind: `CHARGEBACK`,
    }));
    const controller = new AdminV2PaymentsController(
      {} as never,
      { assertCapability } as never,
      { verifyStepUp } as never,
      { createReversal } as never,
    );

    const result = await controller.createChargeback(actor, `payment-2`, {
      amount: 5,
      reason: `test`,
      passwordConfirmation: `Current1!@#abc`,
    } as never);

    expect(assertCapability).toHaveBeenCalledWith(actor, `payments.reverse`);
    expect(verifyStepUp).toHaveBeenCalledWith(`admin-1`, `Current1!@#abc`);
    expect(createReversal).toHaveBeenCalledWith(
      `payment-2`,
      { amount: 5, reason: `test`, kind: `CHARGEBACK` },
      `admin-1`,
    );
    expect(result).toEqual({ ledgerId: `ledger-2`, kind: `CHARGEBACK` });
  });

  it(`createRefund: rejects before step-up when only payments.read is available`, async () => {
    const assertCapability = jest.fn<(admin: unknown, capability: string) => Promise<object>>(
      async (_admin, capability) => {
        if (capability === `payments.read`) return {};
        throw new ForbiddenException(`denied`);
      },
    );
    const verifyStepUp = jest.fn<(adminId: string, password: string) => Promise<void>>(async () => undefined);
    const createReversal = jest.fn<(id: string, body: object, adminId: string) => Promise<object>>();
    const controller = new AdminV2PaymentsController(
      {} as never,
      { assertCapability } as never,
      { verifyStepUp } as never,
      { createReversal } as never,
    );

    await expect(
      controller.createRefund(actor, `payment-1`, {
        passwordConfirmation: `Current1!@#abc`,
      } as never),
    ).rejects.toThrow(ForbiddenException);

    expect(assertCapability).toHaveBeenCalledWith(actor, `payments.reverse`);
    expect(verifyStepUp).not.toHaveBeenCalled();
    expect(createReversal).not.toHaveBeenCalled();
  });
});

describe(`AdminV2PaymentsController integration`, () => {
  let app: INestApplication;
  let close: (() => Promise<void>) | undefined;

  const admin = { id: `00000000-0000-4000-8000-000000000101`, email: `admin@example.com`, type: `ADMIN` };
  const listPaymentRequests = jest.fn<(params?: unknown) => Promise<{ items: unknown[] }>>(async () => ({ items: [] }));
  const assertCapability = jest.fn<(admin: unknown, capability: string) => Promise<void>>(async () => undefined);

  beforeAll(async () => {
    const harness = await bootstrapApiTestApp({
      controllers: [AdminV2PaymentsController],
      providers: [
        { provide: AdminV2PaymentsService, useValue: { listPaymentRequests, getPaymentOperationsQueue: jest.fn() } },
        { provide: AdminV2AccessService, useValue: { assertCapability } },
        { provide: AdminAuthService, useValue: { verifyStepUp: jest.fn() } },
        { provide: AdminV2PaymentReversalService, useValue: { createReversal: jest.fn() } },
      ],
      preset: `validationOnly`,
      identity: admin,
    });

    app = harness.app;
    close = harness.close;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    listPaymentRequests.mockResolvedValue({ items: [] });
  });

  afterAll(async () => {
    if (close) {
      await close();
    }
  });

  it(`binds and transforms validated list query DTO values`, async () => {
    await request(app.getHttpServer())
      .get(`/api/admin-v2/payments?limit=10&amountMin=5&overdue=true&createdFrom=2026-01-01T00:00:00.000Z`)
      .expect(200);

    expect(assertCapability).toHaveBeenCalledWith(admin, `payments.read`);
    expect(listPaymentRequests).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 10,
        amountMin: 5,
        overdue: true,
        createdFrom: new Date(`2026-01-01T00:00:00.000Z`),
      }),
    );
  });

  it(`preserves string false boolean query values`, async () => {
    await request(app.getHttpServer()).get(`/api/admin-v2/payments?overdue=false`).expect(200);

    expect(listPaymentRequests).toHaveBeenCalledWith(
      expect.objectContaining({
        overdue: false,
      }),
    );
  });

  it(`normalizes empty optional query values before service dispatch`, async () => {
    await request(app.getHttpServer()).get(`/api/admin-v2/payments?q=%20&status=&amountMin=&limit=10`).expect(200);

    expect(listPaymentRequests).toHaveBeenCalledWith(
      expect.objectContaining({
        q: undefined,
        status: undefined,
        amountMin: undefined,
        limit: 10,
      }),
    );
  });

  it(`rejects repeated optional string and number query params before service dispatch`, async () => {
    await request(app.getHttpServer()).get(`/api/admin-v2/payments?q=a&q=b&amountMin=1&amountMin=2`).expect(400);

    expect(listPaymentRequests).not.toHaveBeenCalled();
  });

  it(`rejects malformed list query values before service dispatch`, async () => {
    await request(app.getHttpServer()).get(`/api/admin-v2/payments?limit=abc&createdFrom=not-a-date`).expect(400);

    expect(listPaymentRequests).not.toHaveBeenCalled();
  });

  it(`rejects repeated optional date query params before service dispatch`, async () => {
    await request(app.getHttpServer())
      .get(`/api/admin-v2/payments?createdFrom=2026-01-01T00:00:00.000Z&createdFrom=2026-01-02T00:00:00.000Z`)
      .expect(400);

    expect(listPaymentRequests).not.toHaveBeenCalled();
  });

  it(`rejects malformed payment request ids before service dispatch`, async () => {
    await request(app.getHttpServer()).get(`/api/admin-v2/payments/not-a-uuid`).expect(400);
  });
});
