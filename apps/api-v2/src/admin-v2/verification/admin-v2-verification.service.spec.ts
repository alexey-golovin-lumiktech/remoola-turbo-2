import { ConflictException } from '@nestjs/common';

import { AdminV2VerificationService } from './admin-v2-verification.service';

describe(`AdminV2VerificationService`, () => {
  it(`reports SLA breaches at queue level instead of current page only`, async () => {
    const service = new AdminV2VerificationService(
      {
        $queryRaw: jest.fn(async () => []),
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

  it(`decorates queue rows with the active assignee when an assignment exists`, async () => {
    const queryRaw = jest.fn(async () => [
      { resource_id: `consumer-1`, assigned_to: `admin-7`, email: `ops7@example.com` },
    ]);
    const service = new AdminV2VerificationService(
      {
        $queryRaw: queryRaw,
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
              verificationStatus: `PENDING`,
              stripeIdentityStatus: null,
              createdAt: new Date(`2026-04-15T08:00:00.000Z`),
              updatedAt: new Date(`2026-04-15T08:00:00.000Z`),
              verificationUpdatedAt: new Date(`2026-04-15T08:00:00.000Z`),
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
          breachedConsumerIds: new Set<string>(),
          thresholdHours: 24,
          lastComputedAt: `2026-04-15T10:00:00.000Z`,
        })),
      } as never,
      {} as never,
      {} as never,
    );

    const queue = await service.getQueue({ page: 1, pageSize: 10 });

    expect(queryRaw).toHaveBeenCalled();
    const row1 = queue.items.find((item) => item.id === `consumer-1`);
    const row2 = queue.items.find((item) => item.id === `consumer-2`);
    expect(row1?.assignedTo).toEqual({ id: `admin-7`, name: null, email: `ops7@example.com` });
    expect(row2?.assignedTo).toBeNull();
  });

  it(`exposes current and historical assignment context on getCase`, async () => {
    const assignmentRows = [
      {
        id: `assignment-2`,
        resource_id: `consumer-1`,
        assigned_to: `admin-7`,
        assigned_by: `admin-7`,
        released_by: null,
        assigned_at: new Date(`2026-04-20T12:00:00.000Z`),
        released_at: null,
        expires_at: null,
        reason: `Ops follow-up`,
        assigned_to_email: `ops7@example.com`,
        assigned_by_email: `ops7@example.com`,
        released_by_email: null,
      },
      {
        id: `assignment-1`,
        resource_id: `consumer-1`,
        assigned_to: `admin-3`,
        assigned_by: `admin-3`,
        released_by: `admin-3`,
        assigned_at: new Date(`2026-04-20T08:00:00.000Z`),
        released_at: new Date(`2026-04-20T11:45:00.000Z`),
        expires_at: null,
        reason: null,
        assigned_to_email: `ops3@example.com`,
        assigned_by_email: `ops3@example.com`,
        released_by_email: `ops3@example.com`,
      },
    ];
    const service = new AdminV2VerificationService(
      {
        $queryRaw: jest.fn(async () => assignmentRows),
        adminActionAuditLogModel: {
          findMany: jest.fn(async () => []),
        },
        consumerModel: {
          findUnique: jest.fn(async () => ({ email: `user@example.com` })),
        },
        authAuditLogModel: {
          count: jest.fn(async () => 0),
          findMany: jest.fn(async () => []),
        },
      } as never,
      {
        getConsumerCase: jest.fn(async () => ({
          id: `consumer-1`,
          email: `user@example.com`,
          updatedAt: new Date(`2026-04-20T12:00:00.000Z`),
          verificationStatus: `PENDING`,
          authRisk: null,
        })),
      } as never,
      {
        getSnapshot: jest.fn(async () => ({
          breachedConsumerIds: new Set<string>(),
          thresholdHours: 24,
          lastComputedAt: `2026-04-20T12:00:00.000Z`,
        })),
      } as never,
      {} as never,
      {} as never,
    );

    const result = (await service.getCase(`consumer-1`, {
      canForceLogout: false,
      canDecide: false,
      allowedActions: [],
      canManageAssignments: true,
      canReassignAssignments: false,
    })) as unknown as {
      assignment: {
        current: { id: string; assignedTo: { id: string; email: string | null } } | null;
        history: Array<{ id: string }>;
      };
      decisionControls: { canManageAssignments: boolean; canReassignAssignments: boolean };
    };

    expect(result.assignment.current?.id).toBe(`assignment-2`);
    expect(result.assignment.current?.assignedTo).toEqual(
      expect.objectContaining({ id: `admin-7`, email: `ops7@example.com` }),
    );
    expect(result.assignment.history).toHaveLength(2);
    expect(result.decisionControls.canManageAssignments).toBe(true);
    expect(result.decisionControls.canReassignAssignments).toBe(false);
  });

  it(`returns the canonical stale-version payload for verification decisions`, async () => {
    const currentUpdatedAt = new Date(`2026-04-15T10:05:00.000Z`);
    const service = new AdminV2VerificationService(
      {
        consumerModel: {
          findUnique: jest.fn(async () => ({
            id: `consumer-1`,
            email: `user@example.com`,
            verificationStatus: `PENDING`,
            updatedAt: currentUpdatedAt,
          })),
        },
      } as never,
      {} as never,
      {} as never,
      {
        execute: jest.fn(async ({ execute }: { execute: () => Promise<unknown> }) => execute()),
      } as never,
      {} as never,
    );

    try {
      await service.applyDecision(
        `consumer-1`,
        `admin-1`,
        `approve`,
        { confirmed: true, version: new Date(`2026-04-15T10:00:00.000Z`).getTime() },
        { ipAddress: `127.0.0.1`, userAgent: `jest`, idempotencyKey: `idem-1` },
      );
      throw new Error(`Expected applyDecision to reject`);
    } catch (error) {
      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).getResponse()).toEqual({
        error: `STALE_VERSION`,
        message: `Resource has been modified by another operator`,
        currentVersion: currentUpdatedAt.getTime(),
        currentUpdatedAt: currentUpdatedAt.toISOString(),
        recommendedAction: `reload`,
      });
    }
  });
});
