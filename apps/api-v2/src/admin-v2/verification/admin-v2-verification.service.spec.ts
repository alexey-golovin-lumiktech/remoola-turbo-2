import { AdminV2VerificationService } from './admin-v2-verification.service';

describe(`AdminV2VerificationService`, () => {
  it(`reports SLA breaches at queue level instead of current page only`, async () => {
    const service = new AdminV2VerificationService(
      {
        consumerModel: {
          findMany: jest.fn(async () => [
            {
              id: `consumer-1`,
              email: `one@example.com`,
              accountType: `PERSONAL`,
              contractorKind: null,
              verificationStatus: `PENDING`,
              stripeIdentityStatus: null,
              createdAt: new Date(`2026-04-15T08:00:00.000Z`),
              updatedAt: new Date(`2026-04-15T08:00:00.000Z`),
              verificationUpdatedAt: new Date(`2026-04-15T08:00:00.000Z`),
              personalDetails: { firstName: `One`, lastName: `User` },
              organizationDetails: null,
              addressDetails: { country: `DE` },
              _count: { consumerResources: 1 },
            },
            {
              id: `consumer-2`,
              email: `two@example.com`,
              accountType: `PERSONAL`,
              contractorKind: null,
              verificationStatus: `MORE_INFO`,
              stripeIdentityStatus: null,
              createdAt: new Date(`2026-04-15T07:00:00.000Z`),
              updatedAt: new Date(`2026-04-15T07:00:00.000Z`),
              verificationUpdatedAt: new Date(`2026-04-15T07:00:00.000Z`),
              personalDetails: { firstName: `Two`, lastName: `User` },
              organizationDetails: null,
              addressDetails: { country: `DE` },
              _count: { consumerResources: 1 },
            },
          ]),
        },
      } as never,
      {} as never,
      {
        getSnapshot: jest.fn(async () => ({
          breachedConsumerIds: new Set<string>([`consumer-1`, `consumer-2`]),
          thresholdHours: 24,
          lastComputedAt: `2026-04-15T10:00:00.000Z`,
        })),
      } as never,
      {} as never,
      {} as never,
    );

    const queue = await service.getQueue({ page: 1, pageSize: 1 });

    expect(queue.items).toHaveLength(1);
    expect(queue.items[0]?.id).toBe(`consumer-1`);
    expect(queue.sla.breachedCount).toBe(2);
  });

  it(`sends consumer-visible email side effects for approve and persists notification metadata`, async () => {
    const auditUpdate = jest.fn(async () => undefined);
    const auditCreate = jest.fn(async () => ({ id: `audit-1` }));
    const service = new AdminV2VerificationService(
      {
        consumerModel: {
          findUnique: jest.fn(async () => ({
            id: `consumer-1`,
            email: `user@example.com`,
            verificationStatus: `PENDING`,
            updatedAt: new Date(`2026-04-15T10:00:00.000Z`),
          })),
          findUniqueOrThrow: jest.fn(async () => ({
            id: `consumer-1`,
            verificationStatus: `APPROVED`,
            verificationReason: null,
            verificationUpdatedAt: new Date(`2026-04-15T10:05:00.000Z`),
            updatedAt: new Date(`2026-04-15T10:05:00.000Z`),
          })),
        },
        adminActionAuditLogModel: {
          update: auditUpdate,
        },
        $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
          callback({
            consumerModel: {
              updateMany: jest.fn(async () => ({ count: 1 })),
              findUniqueOrThrow: jest.fn(async () => ({
                id: `consumer-1`,
                verificationStatus: `APPROVED`,
                verificationReason: null,
                verificationUpdatedAt: new Date(`2026-04-15T10:05:00.000Z`),
                updatedAt: new Date(`2026-04-15T10:05:00.000Z`),
              })),
            },
            adminActionAuditLogModel: {
              create: auditCreate,
            },
          }),
        ),
      } as never,
      {} as never,
      {
        refreshBreaches: jest.fn(async () => undefined),
      } as never,
      {
        execute: jest.fn(async ({ execute }: { execute: () => Promise<unknown> }) => execute()),
      } as never,
      {
        sendAdminV2VerificationDecisionEmail: jest.fn(async () => true),
      } as never,
    );

    const result = await service.applyDecision(
      `consumer-1`,
      `admin-1`,
      `approve`,
      { confirmed: true, version: new Date(`2026-04-15T10:00:00.000Z`).getTime() },
      { ipAddress: `127.0.0.1`, userAgent: `jest`, idempotencyKey: `idem-1` },
    );

    expect(auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: `verification_approve`,
          metadata: expect.objectContaining({
            notificationType: `email`,
            notificationSent: false,
          }),
        }),
      }),
    );
    expect(auditUpdate).toHaveBeenCalledWith({
      where: { id: `audit-1` },
      data: {
        metadata: expect.objectContaining({
          notificationType: `email`,
          notificationSent: true,
        }),
      },
    });
    expect(result).toEqual(
      expect.objectContaining({
        verificationStatus: `APPROVED`,
        notification: { type: `email`, sent: true },
      }),
    );
  });
});
