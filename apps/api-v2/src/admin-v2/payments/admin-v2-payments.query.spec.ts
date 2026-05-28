import { describe, expect, it, jest } from '@jest/globals';

import { $Enums } from '@remoola/database-2';

import { AdminV2PaymentsQuery } from './admin-v2-payments.query';

describe(`AdminV2PaymentsQuery`, () => {
  it(`applies due-date and created-time filters on payment list`, async () => {
    const findMany = jest.fn<(...a: any[]) => any>(async () => []);
    const query = new AdminV2PaymentsQuery({
      paymentRequestModel: {
        findMany,
      },
    } as never);

    const dueDateFrom = new Date(`2026-04-01T00:00:00.000Z`);
    const dueDateTo = new Date(`2026-04-30T23:59:59.999Z`);
    const createdFrom = new Date(`2026-03-01T00:00:00.000Z`);
    const createdTo = new Date(`2026-03-31T23:59:59.999Z`);

    await query.listPaymentRequests({
      cursor: null,
      limit: 25,
      dueDateFrom,
      dueDateTo,
      createdFrom,
      createdTo,
      now: new Date(`2026-05-01T00:00:00.000Z`),
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          dueDate: {
            gte: dueDateFrom,
            lte: dueDateTo,
          },
          createdAt: {
            gte: createdFrom,
            lte: createdTo,
          },
        }),
      }),
    );
  });

  it(`builds queue source reads with stale approval separated from overdue semantics`, async () => {
    const findMany = jest.fn<(...a: any[]) => any>(async () => []);
    const query = new AdminV2PaymentsQuery({
      paymentRequestModel: {
        findMany,
      },
    } as never);

    await query.getPaymentOperationsQueueBuckets({
      now: new Date(`2026-05-15T00:00:00.000Z`),
      staleWaitingRecipientApprovalThreshold: new Date(`2026-05-14T00:00:00.000Z`),
      limitPerBucket: 25,
    });

    expect(findMany).toHaveBeenCalledTimes(5);
    expect(findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          dueDate: expect.objectContaining({ lt: expect.any(Date) }),
          status: { in: [`WAITING`, `WAITING_RECIPIENT_APPROVAL`, `PENDING`] },
        }),
      }),
    );
    expect(findMany).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          status: `WAITING_RECIPIENT_APPROVAL`,
          updatedAt: expect.objectContaining({ lte: expect.any(Date) }),
        }),
      }),
    );
    const thirdCallArgs = findMany.mock.calls[2] as unknown as [{ where: Record<string, unknown> }];
    expect(thirdCallArgs[0].where).not.toHaveProperty(`OR`);
  });

  it(`loads payment case and audit context through dedicated read methods`, async () => {
    const paymentRequestModelFindUnique = jest.fn<(...a: any[]) => any>(async () => ({ id: `payment-1` }));
    const auditFindMany = jest.fn<(...a: any[]) => any>(async () => []);
    const query = new AdminV2PaymentsQuery({
      paymentRequestModel: {
        findUnique: paymentRequestModelFindUnique,
      },
      adminActionAuditLogModel: {
        findMany: auditFindMany,
      },
    } as never);

    await query.getPaymentRequestCase(`payment-1`);
    await query.getPaymentRequestAuditContext(`payment-1`);

    expect(paymentRequestModelFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: `payment-1` },
      }),
    );
    expect(auditFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { resourceId: `payment-1` },
        take: 20,
      }),
    );
  });

  it(`adds overdue status filtering when overdue list mode is requested`, async () => {
    const findMany = jest.fn<(...a: any[]) => any>(async () => []);
    const query = new AdminV2PaymentsQuery({
      paymentRequestModel: {
        findMany,
      },
    } as never);

    await query.listPaymentRequests({
      cursor: null,
      limit: 25,
      overdue: true,
      status: $Enums.TransactionStatus.PENDING,
      now: new Date(`2026-05-15T00:00:00.000Z`),
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          dueDate: expect.objectContaining({ lt: expect.any(Date) }),
          status: { in: [`WAITING`, `WAITING_RECIPIENT_APPROVAL`, `PENDING`] },
        }),
      }),
    );
  });
});
