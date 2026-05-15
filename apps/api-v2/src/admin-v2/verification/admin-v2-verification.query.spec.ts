import { AdminV2VerificationQuery } from './admin-v2-verification.query';

function buildQueueRow(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    email: `${id}@example.com`,
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
    ...overrides,
  };
}

function buildQuery() {
  const prisma = {
    consumerModel: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
    },
    adminActionAuditLogModel: {
      findMany: jest.fn(),
    },
    authAuditLogModel: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
  };

  return {
    query: new AdminV2VerificationQuery(prisma as never),
    prisma,
  };
}

describe(`AdminV2VerificationQuery`, () => {
  it(`loads active verification SLA candidates with the expected status filter`, async () => {
    const { query, prisma } = buildQuery();
    prisma.consumerModel.findMany.mockResolvedValueOnce([]);

    await query.listActiveVerificationSlaCandidates();

    expect(prisma.consumerModel.findMany).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        verificationStatus: { in: [`PENDING`, `MORE_INFO`, `FLAGGED`] },
      },
      select: {
        id: true,
        createdAt: true,
        verificationUpdatedAt: true,
      },
    });
  });

  it(`loads queue rows with the expected verification-status filter set`, async () => {
    const { query, prisma } = buildQuery();
    prisma.consumerModel.findMany.mockResolvedValueOnce([]);

    await query.getQueueRows({
      statuses: [`PENDING`, `MORE_INFO`, `FLAGGED`] as never,
      stripeIdentityStatus: `verified`,
      contractorKind: `BUSINESS`,
      country: `DE`,
    });

    expect(prisma.consumerModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          deletedAt: null,
          verificationStatus: { in: [`PENDING`, `MORE_INFO`, `FLAGGED`] },
          stripeIdentityStatus: `verified`,
          contractorKind: `BUSINESS`,
          addressDetails: { is: { country: `DE` } },
        },
        orderBy: [{ verificationUpdatedAt: `asc` }, { createdAt: `asc` }],
      }),
    );
  });

  it(`delegates plain queue count to consumerModel.count with the normalized where clause`, async () => {
    const { query, prisma } = buildQuery();
    prisma.consumerModel.count.mockResolvedValueOnce(17);

    await expect(
      query.countQueue({
        statuses: [`PENDING`] as never,
      }),
    ).resolves.toBe(17);

    expect(prisma.consumerModel.count).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        verificationStatus: { in: [`PENDING`] },
      },
    });
  });

  it(`loads materialized queue-count rows for missing-profile/missing-documents filtering`, async () => {
    const { query, prisma } = buildQuery();
    prisma.consumerModel.findMany.mockResolvedValueOnce([buildQueueRow(`consumer-1`)]);

    const rows = await query.getQueueCountRows({
      statuses: [`PENDING`, `MORE_INFO`, `FLAGGED`] as never,
    });

    expect(prisma.consumerModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          deletedAt: null,
          verificationStatus: { in: [`PENDING`, `MORE_INFO`, `FLAGGED`] },
        },
      }),
    );
    expect(rows).toHaveLength(1);
  });

  it(`loads decision history with the expected verification action set`, async () => {
    const { query, prisma } = buildQuery();
    prisma.adminActionAuditLogModel.findMany.mockResolvedValueOnce([]);

    await query.getDecisionHistory(`consumer-1`);

    expect(prisma.adminActionAuditLogModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          resource: `consumer`,
          resourceId: `consumer-1`,
          action: {
            in: [`verification_approve`, `verification_reject`, `verification_request_info`, `verification_flag`],
          },
        },
        take: 20,
      }),
    );
  });

  it(`returns null auth risk when the consumer does not exist`, async () => {
    const { query, prisma } = buildQuery();
    prisma.consumerModel.findUnique.mockResolvedValueOnce(null);

    await expect(query.getAuthRiskContext(`missing-consumer`)).resolves.toBeNull();
  });

  it(`loads auth risk counts and recent events for an existing consumer`, async () => {
    const { query, prisma } = buildQuery();
    prisma.consumerModel.findUnique.mockResolvedValueOnce({ email: `User@Example.com` });
    prisma.authAuditLogModel.count.mockResolvedValueOnce(2).mockResolvedValueOnce(1);
    prisma.authAuditLogModel.findMany.mockResolvedValueOnce([{ id: `event-1` }]);

    const result = await query.getAuthRiskContext(`consumer-1`);

    expect(prisma.authAuditLogModel.count).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [{ identityId: `consumer-1` }, { email: `user@example.com` }],
          event: `login_failure`,
        }),
      }),
    );
    expect(prisma.authAuditLogModel.count).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [{ identityId: `consumer-1` }, { email: `user@example.com` }],
          event: `refresh_reuse`,
        }),
      }),
    );
    expect(result).toEqual({
      loginFailures24h: 2,
      refreshReuse30d: 1,
      recentEvents: [{ id: `event-1` }],
    });
  });
});
