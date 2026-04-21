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
      { getAssignmentContextForResource: jest.fn(async () => ({ current: null, history: [] })) } as never,
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
      { getAssignmentContextForResource: jest.fn(async () => ({ current: null, history: [] })) } as never,
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
      { getAssignmentContextForResource: jest.fn(async () => ({ current: null, history: [] })) } as never,
    );

    const queue = await service.getQueue({ page: 1, pageSize: 10 });

    expect(queryRaw).toHaveBeenCalled();
    const row1 = queue.items.find((item) => item.id === `consumer-1`);
    const row2 = queue.items.find((item) => item.id === `consumer-2`);
    expect(row1?.assignedTo).toEqual({ id: `admin-7`, name: null, email: `ops7@example.com` });
    expect(row2?.assignedTo).toBeNull();
  });

  it(`exposes current and historical assignment context on getCase via the shared assignments helper`, async () => {
    const assignmentContext = {
      current: {
        id: `assignment-2`,
        assignedTo: { id: `admin-7`, name: null, email: `ops7@example.com` },
        assignedBy: { id: `admin-7`, name: null, email: `ops7@example.com` },
        assignedAt: `2026-04-20T12:00:00.000Z`,
        reason: `Ops follow-up`,
        expiresAt: null,
      },
      history: [
        {
          id: `assignment-2`,
          assignedTo: { id: `admin-7`, name: null, email: `ops7@example.com` },
          assignedBy: { id: `admin-7`, name: null, email: `ops7@example.com` },
          assignedAt: `2026-04-20T12:00:00.000Z`,
          releasedAt: null,
          releasedBy: null,
          reason: `Ops follow-up`,
          expiresAt: null,
        },
        {
          id: `assignment-1`,
          assignedTo: { id: `admin-3`, name: null, email: `ops3@example.com` },
          assignedBy: { id: `admin-3`, name: null, email: `ops3@example.com` },
          assignedAt: `2026-04-20T08:00:00.000Z`,
          releasedAt: `2026-04-20T11:45:00.000Z`,
          releasedBy: { id: `admin-3`, name: null, email: `ops3@example.com` },
          reason: null,
          expiresAt: null,
        },
      ],
    };
    const getAssignmentContextForResource = jest.fn(async () => assignmentContext);
    const service = new AdminV2VerificationService(
      {
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
      { getAssignmentContextForResource } as never,
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

    expect(getAssignmentContextForResource).toHaveBeenCalledWith(`verification`, `consumer-1`);
    expect(result.assignment.current?.id).toBe(`assignment-2`);
    expect(result.assignment.current?.assignedTo).toEqual(
      expect.objectContaining({ id: `admin-7`, email: `ops7@example.com` }),
    );
    expect(result.assignment.history).toHaveLength(2);
    expect(result.decisionControls.canManageAssignments).toBe(true);
    expect(result.decisionControls.canReassignAssignments).toBe(false);
  });

  describe(`getQueueCount`, () => {
    function buildCountService(
      opts: {
        countResult?: number;
        countImpl?: jest.Mock;
      } = {},
    ) {
      const count = opts.countImpl ?? jest.fn(async () => opts.countResult ?? 0);
      const service = new AdminV2VerificationService(
        {
          consumerModel: { count },
        } as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
      );
      return { service, count };
    }

    it(`counts all active (PENDING/MORE_INFO/FLAGGED) non-deleted consumers when no filters provided`, async () => {
      const { service, count } = buildCountService({ countResult: 42 });

      const result = await service.getQueueCount();

      expect(result).toBe(42);
      expect(count).toHaveBeenCalledTimes(1);
      const callArgs = count.mock.calls[0]?.[0] as { where: { deletedAt: null; verificationStatus: { in: string[] } } };
      expect(callArgs.where.deletedAt).toBeNull();
      expect(callArgs.where.verificationStatus.in).toEqual([`PENDING`, `MORE_INFO`, `FLAGGED`]);
    });

    it(`treats empty filters object identically to no filters`, async () => {
      const { service, count } = buildCountService({ countResult: 17 });

      const result = await service.getQueueCount({});

      expect(result).toBe(17);
      const callArgs = count.mock.calls[0]?.[0] as { where: { verificationStatus: { in: string[] } } };
      expect(callArgs.where.verificationStatus.in).toEqual([`PENDING`, `MORE_INFO`, `FLAGGED`]);
    });

    it(`narrows verificationStatus to a single status when one of the active statuses is provided`, async () => {
      const { service, count } = buildCountService({ countResult: 5 });

      await service.getQueueCount({ status: `PENDING` });

      const callArgs = count.mock.calls[0]?.[0] as { where: { verificationStatus: { in: string[] } } };
      expect(callArgs.where.verificationStatus.in).toEqual([`PENDING`]);
    });

    it(`falls back to the full active status set when status is not active (mirrors getQueue)`, async () => {
      const { service, count } = buildCountService({ countResult: 9 });

      await service.getQueueCount({ status: `XYZ` });

      const callArgs = count.mock.calls[0]?.[0] as { where: { verificationStatus: { in: string[] } } };
      expect(callArgs.where.verificationStatus.in).toEqual([`PENDING`, `MORE_INFO`, `FLAGGED`]);
    });

    it(`applies country via addressDetails.is.country at the DB level`, async () => {
      const { service, count } = buildCountService({ countResult: 3 });

      await service.getQueueCount({ country: `US` });

      const callArgs = count.mock.calls[0]?.[0] as {
        where: { addressDetails: { is: { country: string } } };
      };
      expect(callArgs.where.addressDetails).toEqual({ is: { country: `US` } });
    });

    it(`applies contractorKind as a typed enum filter`, async () => {
      const { service, count } = buildCountService({ countResult: 1 });

      await service.getQueueCount({ contractorKind: `INDIVIDUAL` });

      const callArgs = count.mock.calls[0]?.[0] as { where: { contractorKind: string } };
      expect(callArgs.where.contractorKind).toBe(`INDIVIDUAL`);
    });

    it(`applies stripeIdentityStatus verbatim`, async () => {
      const { service, count } = buildCountService({ countResult: 11 });

      await service.getQueueCount({ stripeIdentityStatus: `verified` });

      const callArgs = count.mock.calls[0]?.[0] as { where: { stripeIdentityStatus: string } };
      expect(callArgs.where.stripeIdentityStatus).toBe(`verified`);
    });

    it(`combines multiple filters with implicit AND in a single where clause`, async () => {
      const { service, count } = buildCountService({ countResult: 2 });

      await service.getQueueCount({
        status: `MORE_INFO`,
        country: `DE`,
        contractorKind: `BUSINESS`,
        stripeIdentityStatus: `requires_input`,
      });

      const callArgs = count.mock.calls[0]?.[0] as {
        where: {
          deletedAt: null;
          verificationStatus: { in: string[] };
          addressDetails: { is: { country: string } };
          contractorKind: string;
          stripeIdentityStatus: string;
        };
      };
      expect(callArgs.where.deletedAt).toBeNull();
      expect(callArgs.where.verificationStatus.in).toEqual([`MORE_INFO`]);
      expect(callArgs.where.addressDetails).toEqual({ is: { country: `DE` } });
      expect(callArgs.where.contractorKind).toBe(`BUSINESS`);
      expect(callArgs.where.stripeIdentityStatus).toBe(`requires_input`);
    });

    it(`always filters out soft-deleted consumers via deletedAt: null`, async () => {
      const { service, count } = buildCountService({ countResult: 0 });

      await service.getQueueCount({ status: `FLAGGED` });

      const callArgs = count.mock.calls[0]?.[0] as { where: { deletedAt: null } };
      expect(callArgs.where.deletedAt).toBeNull();
    });

    it(`omits empty/whitespace optional filters from the where clause`, async () => {
      const { service, count } = buildCountService({ countResult: 0 });

      await service.getQueueCount({
        country: `   `,
        contractorKind: ``,
        stripeIdentityStatus: ``,
      });

      const callArgs = count.mock.calls[0]?.[0] as {
        where: Record<string, unknown>;
      };
      expect(callArgs.where).not.toHaveProperty(`addressDetails`);
      expect(callArgs.where).not.toHaveProperty(`contractorKind`);
      expect(callArgs.where).not.toHaveProperty(`stripeIdentityStatus`);
    });

    it(`returns the raw count number without any audit/idempotency wiring`, async () => {
      const count = jest.fn(async () => 99);
      const service = new AdminV2VerificationService(
        { consumerModel: { count } } as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
      );

      const result = await service.getQueueCount({ status: `PENDING` });

      expect(result).toBe(99);
      expect(count).toHaveBeenCalledTimes(1);
    });
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
