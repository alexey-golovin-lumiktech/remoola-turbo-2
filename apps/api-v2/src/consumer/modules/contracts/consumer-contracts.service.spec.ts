import { ConsumerContractsService } from './consumer-contracts.service';

describe(`ConsumerContractsService`, () => {
  it(`includes email-only payment requests in contracts read model and normalizes status`, async () => {
    const updatedAt = new Date(`2026-03-25T10:00:00.000Z`);
    const prisma = {
      consumerModel: {
        findUnique: jest.fn().mockResolvedValue({ email: `owner@example.com` }),
      },
      contactModel: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: `contact-1`,
            consumerId: `consumer-1`,
            email: `vendor@example.com`,
            name: `Vendor LLC`,
            updatedAt,
          },
        ]),
      },
      paymentRequestModel: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: `payment-request-1`,
            payer: null,
            payerEmail: `vendor@example.com`,
            requester: null,
            requesterEmail: `owner@example.com`,
            status: `COMPLETED`,
            updatedAt,
            ledgerEntries: [],
            attachments: [{ id: `att-1` }, { id: `att-2` }],
          },
        ]),
      },
    } as any;

    const service = new ConsumerContractsService(prisma);
    const result = await service.getContracts(`consumer-1`);

    expect(prisma.paymentRequestModel.findMany).toHaveBeenCalledWith({
      where: {
        AND: [
          { deletedAt: null },
          {
            OR: [
              { requesterId: `consumer-1` },
              { payerId: `consumer-1` },
              { requesterId: null, requesterEmail: { equals: `owner@example.com`, mode: `insensitive` } },
              { payerId: null, payerEmail: { equals: `owner@example.com`, mode: `insensitive` } },
            ],
          },
          {
            OR: [
              { payer: { email: { equals: `vendor@example.com`, mode: `insensitive` } } },
              { requester: { email: { equals: `vendor@example.com`, mode: `insensitive` } } },
              { payerEmail: { equals: `vendor@example.com`, mode: `insensitive` } },
              { requesterEmail: { equals: `vendor@example.com`, mode: `insensitive` } },
            ],
          },
        ],
      },
      include: {
        payer: true,
        requester: true,
        ledgerEntries: {
          where: { consumerId: `consumer-1` },
          orderBy: { createdAt: `desc` },
          take: 1,
          include: {
            outcomes: {
              orderBy: { createdAt: `desc` },
              take: 1,
              select: { status: true },
            },
          },
        },
        attachments: {
          where: {
            deletedAt: null,
            resource: {
              deletedAt: null,
            },
          },
        },
      },
    });
    expect(result).toEqual({
      items: [
        {
          id: `contact-1`,
          name: `Vendor LLC`,
          email: `vendor@example.com`,
          lastRequestId: `payment-request-1`,
          lastStatus: `completed`,
          lastActivity: updatedAt,
          docs: 2,
          paymentsCount: 1,
          completedPaymentsCount: 1,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
    });
  });

  it(`normalizes waiting-recipient-approval for linked-consumer contracts`, async () => {
    const linkedUpdatedAt = new Date(`2026-03-27T11:45:00.000Z`);
    const prisma = {
      contactModel: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: `contact-2`,
            consumerId: `consumer-1`,
            email: `linked@example.com`,
            name: `Linked Counterparty`,
            updatedAt: linkedUpdatedAt,
          },
        ]),
      },
      paymentRequestModel: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: `payment-request-2`,
            payer: { id: `linked-consumer`, email: `linked@example.com` },
            payerEmail: null,
            requester: { id: `consumer-1`, email: `owner@example.com` },
            requesterEmail: null,
            status: `PENDING`,
            updatedAt: linkedUpdatedAt,
            ledgerEntries: [
              {
                id: `ledger-entry-1`,
                consumerId: `consumer-1`,
                status: `PENDING`,
                outcomes: [{ status: `WAITING_RECIPIENT_APPROVAL` }],
              },
            ],
            attachments: [{ id: `att-1` }],
          },
        ]),
      },
    } as any;

    const service = new ConsumerContractsService(prisma);
    const result = await service.getContracts(`consumer-1`);

    expect(result).toEqual({
      items: [
        {
          id: `contact-2`,
          name: `Linked Counterparty`,
          email: `linked@example.com`,
          lastRequestId: `payment-request-2`,
          lastStatus: `waiting`,
          lastActivity: linkedUpdatedAt,
          docs: 1,
          paymentsCount: 1,
          completedPaymentsCount: 0,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
    });
  });

  it(`returns empty items when consumer has no contacts`, async () => {
    const prisma = {
      contactModel: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      paymentRequestModel: {
        findMany: jest.fn(),
      },
    } as any;

    const service = new ConsumerContractsService(prisma);
    const result = await service.getContracts(`consumer-1`);

    expect(result).toEqual({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
    });
    expect(prisma.paymentRequestModel.findMany).not.toHaveBeenCalled();
  });

  it(`filters contacts by query across name and email before pagination`, async () => {
    const updatedAt = new Date(`2026-03-28T09:15:00.000Z`);
    const prisma = {
      contactModel: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: `contact-3`,
            consumerId: `consumer-1`,
            email: `search-hit@example.com`,
            name: `Search Hit LLC`,
            updatedAt,
          },
        ]),
      },
      paymentRequestModel: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    } as any;

    const service = new ConsumerContractsService(prisma);
    const result = await service.getContracts(`consumer-1`, 2, 25, `search hit`);

    expect(prisma.contactModel.findMany).toHaveBeenCalledWith({
      where: {
        consumerId: `consumer-1`,
        deletedAt: null,
        OR: [
          { email: { contains: `search hit`, mode: `insensitive` } },
          { name: { contains: `search hit`, mode: `insensitive` } },
        ],
      },
      orderBy: { updatedAt: `desc` },
    });
    expect(result).toEqual({
      items: [],
      total: 1,
      page: 2,
      pageSize: 25,
    });
  });

  it(`does not add search filters when query is blank`, async () => {
    const prisma = {
      contactModel: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      paymentRequestModel: {
        findMany: jest.fn(),
      },
    } as any;

    const service = new ConsumerContractsService(prisma);
    await service.getContracts(`consumer-1`, 1, 10, `   `);

    expect(prisma.contactModel.findMany).toHaveBeenCalledWith({
      where: { consumerId: `consumer-1`, deletedAt: null },
      orderBy: { updatedAt: `desc` },
    });
  });

  it(`filters contracts by effective status after building the read model`, async () => {
    const pendingUpdatedAt = new Date(`2026-03-29T09:15:00.000Z`);
    const waitingUpdatedAt = new Date(`2026-03-29T10:15:00.000Z`);
    const completedUpdatedAt = new Date(`2026-03-29T11:15:00.000Z`);
    const prisma = {
      contactModel: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: `contact-no-activity`,
            consumerId: `consumer-1`,
            email: `new@example.com`,
            name: `New Vendor`,
            updatedAt: new Date(`2026-03-29T08:15:00.000Z`),
          },
          {
            id: `contact-pending`,
            consumerId: `consumer-1`,
            email: `pending@example.com`,
            name: `Pending Vendor`,
            updatedAt: pendingUpdatedAt,
          },
          {
            id: `contact-waiting`,
            consumerId: `consumer-1`,
            email: `waiting@example.com`,
            name: `Waiting Vendor`,
            updatedAt: waitingUpdatedAt,
          },
          {
            id: `contact-completed`,
            consumerId: `consumer-1`,
            email: `completed@example.com`,
            name: `Completed Vendor`,
            updatedAt: completedUpdatedAt,
          },
        ]),
      },
      paymentRequestModel: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: `payment-request-pending`,
            payer: null,
            payerEmail: null,
            requester: null,
            requesterEmail: `pending@example.com`,
            status: `PENDING`,
            updatedAt: pendingUpdatedAt,
            ledgerEntries: [],
            attachments: [],
          },
          {
            id: `payment-request-waiting`,
            payer: null,
            payerEmail: null,
            requester: null,
            requesterEmail: `waiting@example.com`,
            status: `PENDING`,
            updatedAt: waitingUpdatedAt,
            ledgerEntries: [
              {
                id: `ledger-entry-2`,
                consumerId: `consumer-1`,
                status: `PENDING`,
                outcomes: [{ status: `WAITING_RECIPIENT_APPROVAL` }],
              },
            ],
            attachments: [],
          },
          {
            id: `payment-request-completed`,
            payer: null,
            payerEmail: null,
            requester: null,
            requesterEmail: `completed@example.com`,
            status: `COMPLETED`,
            updatedAt: completedUpdatedAt,
            ledgerEntries: [],
            attachments: [],
          },
        ]),
      },
    } as any;

    const service = new ConsumerContractsService(prisma);

    await expect(service.getContracts(`consumer-1`, 1, 10, undefined, `completed`)).resolves.toEqual({
      items: [
        {
          id: `contact-completed`,
          name: `Completed Vendor`,
          email: `completed@example.com`,
          lastRequestId: `payment-request-completed`,
          lastStatus: `completed`,
          lastActivity: completedUpdatedAt,
          docs: 0,
          paymentsCount: 1,
          completedPaymentsCount: 1,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
    });

    await expect(service.getContracts(`consumer-1`, 1, 10, undefined, `waiting`)).resolves.toEqual({
      items: [
        {
          id: `contact-waiting`,
          name: `Waiting Vendor`,
          email: `waiting@example.com`,
          lastRequestId: `payment-request-waiting`,
          lastStatus: `waiting`,
          lastActivity: waitingUpdatedAt,
          docs: 0,
          paymentsCount: 1,
          completedPaymentsCount: 0,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
    });

    await expect(service.getContracts(`consumer-1`, 1, 10, undefined, `pending`)).resolves.toEqual({
      items: [
        {
          id: `contact-pending`,
          name: `Pending Vendor`,
          email: `pending@example.com`,
          lastRequestId: `payment-request-pending`,
          lastStatus: `pending`,
          lastActivity: pendingUpdatedAt,
          docs: 0,
          paymentsCount: 1,
          completedPaymentsCount: 0,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
    });

    await expect(service.getContracts(`consumer-1`, 1, 10, undefined, `no_activity`)).resolves.toEqual({
      items: [
        {
          id: `contact-no-activity`,
          name: `New Vendor`,
          email: `new@example.com`,
          lastRequestId: null,
          lastStatus: null,
          lastActivity: null,
          docs: 0,
          paymentsCount: 0,
          completedPaymentsCount: 0,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
    });
  });

  it(`paginates after status filtering`, async () => {
    const firstUpdatedAt = new Date(`2026-03-30T08:15:00.000Z`);
    const secondUpdatedAt = new Date(`2026-03-30T09:15:00.000Z`);
    const prisma = {
      contactModel: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: `contact-older`,
            consumerId: `consumer-1`,
            email: `older@example.com`,
            name: `Older Completed Vendor`,
            updatedAt: firstUpdatedAt,
          },
          {
            id: `contact-newer`,
            consumerId: `consumer-1`,
            email: `newer@example.com`,
            name: `Newer Completed Vendor`,
            updatedAt: secondUpdatedAt,
          },
        ]),
      },
      paymentRequestModel: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: `payment-request-older`,
            payer: null,
            payerEmail: null,
            requester: null,
            requesterEmail: `older@example.com`,
            status: `COMPLETED`,
            updatedAt: firstUpdatedAt,
            ledgerEntries: [],
            attachments: [],
          },
          {
            id: `payment-request-newer`,
            payer: null,
            payerEmail: null,
            requester: null,
            requesterEmail: `newer@example.com`,
            status: `COMPLETED`,
            updatedAt: secondUpdatedAt,
            ledgerEntries: [],
            attachments: [],
          },
        ]),
      },
    } as any;

    const service = new ConsumerContractsService(prisma);
    const result = await service.getContracts(`consumer-1`, 2, 1, undefined, `completed`);

    expect(result).toEqual({
      items: [
        {
          id: `contact-older`,
          name: `Older Completed Vendor`,
          email: `older@example.com`,
          lastRequestId: `payment-request-older`,
          lastStatus: `completed`,
          lastActivity: firstUpdatedAt,
          docs: 0,
          paymentsCount: 1,
          completedPaymentsCount: 1,
        },
      ],
      total: 2,
      page: 2,
      pageSize: 1,
    });
  });

  it(`filters by document/payment presence and sorts by payment volume`, async () => {
    const prisma = {
      contactModel: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: `contact-no-payments`,
            consumerId: `consumer-1`,
            email: `nopayments@example.com`,
            name: `No Payments`,
            updatedAt: new Date(`2026-03-30T08:15:00.000Z`),
          },
          {
            id: `contact-with-payments`,
            consumerId: `consumer-1`,
            email: `withpayments@example.com`,
            name: `With Payments`,
            updatedAt: new Date(`2026-03-30T09:15:00.000Z`),
          },
          {
            id: `contact-most-payments`,
            consumerId: `consumer-1`,
            email: `mostpayments@example.com`,
            name: `Most Payments`,
            updatedAt: new Date(`2026-03-30T10:15:00.000Z`),
          },
        ]),
      },
      paymentRequestModel: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: `payment-request-1`,
            payer: null,
            payerEmail: null,
            requester: null,
            requesterEmail: `withpayments@example.com`,
            status: `COMPLETED`,
            updatedAt: new Date(`2026-03-31T10:15:00.000Z`),
            paymentRail: null,
            ledgerEntries: [],
            attachments: [{ id: `att-1` }],
          },
          {
            id: `payment-request-2`,
            payer: null,
            payerEmail: null,
            requester: null,
            requesterEmail: `mostpayments@example.com`,
            status: `COMPLETED`,
            updatedAt: new Date(`2026-03-31T11:15:00.000Z`),
            paymentRail: null,
            ledgerEntries: [],
            attachments: [{ id: `att-2` }],
          },
          {
            id: `payment-request-3`,
            payer: null,
            payerEmail: null,
            requester: null,
            requesterEmail: `mostpayments@example.com`,
            status: `PENDING`,
            updatedAt: new Date(`2026-03-31T12:15:00.000Z`),
            paymentRail: null,
            ledgerEntries: [],
            attachments: [],
          },
        ]),
      },
    } as any;

    const service = new ConsumerContractsService(prisma);

    await expect(
      service.getContracts(`consumer-1`, 1, 10, undefined, undefined, `yes`, `yes`, `payments_count`),
    ).resolves.toEqual({
      items: [
        {
          id: `contact-most-payments`,
          name: `Most Payments`,
          email: `mostpayments@example.com`,
          lastRequestId: `payment-request-3`,
          lastStatus: `pending`,
          lastActivity: new Date(`2026-03-31T12:15:00.000Z`),
          docs: 1,
          paymentsCount: 2,
          completedPaymentsCount: 1,
        },
        {
          id: `contact-with-payments`,
          name: `With Payments`,
          email: `withpayments@example.com`,
          lastRequestId: `payment-request-1`,
          lastStatus: `completed`,
          lastActivity: new Date(`2026-03-31T10:15:00.000Z`),
          docs: 1,
          paymentsCount: 1,
          completedPaymentsCount: 1,
        },
      ],
      total: 2,
      page: 1,
      pageSize: 10,
    });
  });

  it(`counts unique relationship files instead of raw attachment rows in the contracts list`, async () => {
    const prisma = {
      contactModel: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: `contact-shared-docs`,
            consumerId: `consumer-1`,
            email: `shared@example.com`,
            name: `Shared Docs Vendor`,
            updatedAt: new Date(`2026-03-30T10:15:00.000Z`),
          },
        ]),
      },
      paymentRequestModel: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: `payment-request-1`,
            payer: null,
            payerEmail: null,
            requester: null,
            requesterEmail: `shared@example.com`,
            status: `COMPLETED`,
            updatedAt: new Date(`2026-03-31T10:15:00.000Z`),
            paymentRail: null,
            ledgerEntries: [],
            attachments: [
              { id: `att-1`, resourceId: `resource-shared-1` },
              { id: `att-2`, resourceId: `resource-unique-1` },
            ],
          },
          {
            id: `payment-request-2`,
            payer: null,
            payerEmail: null,
            requester: null,
            requesterEmail: `shared@example.com`,
            status: `PENDING`,
            updatedAt: new Date(`2026-03-31T12:15:00.000Z`),
            paymentRail: null,
            ledgerEntries: [],
            attachments: [{ id: `att-3`, resourceId: `resource-shared-1` }],
          },
        ]),
      },
    } as any;

    const service = new ConsumerContractsService(prisma);

    await expect(service.getContracts(`consumer-1`)).resolves.toEqual({
      items: [
        {
          id: `contact-shared-docs`,
          name: `Shared Docs Vendor`,
          email: `shared@example.com`,
          lastRequestId: `payment-request-2`,
          lastStatus: `pending`,
          lastActivity: new Date(`2026-03-31T12:15:00.000Z`),
          docs: 2,
          paymentsCount: 2,
          completedPaymentsCount: 1,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
    });
  });

  it(`prioritizes an older draft workflow over a newer closed payment in the contracts list`, async () => {
    const completedUpdatedAt = new Date(`2026-04-01T11:15:00.000Z`);
    const draftUpdatedAt = new Date(`2026-03-31T09:15:00.000Z`);
    const prisma = {
      contactModel: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: `contact-draft-priority`,
            consumerId: `consumer-1`,
            email: `priority@example.com`,
            name: `Priority Vendor`,
            updatedAt: new Date(`2026-03-30T08:15:00.000Z`),
          },
        ]),
      },
      paymentRequestModel: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: `payment-completed-1`,
            payer: null,
            payerEmail: null,
            requester: null,
            requesterEmail: `priority@example.com`,
            status: `COMPLETED`,
            updatedAt: completedUpdatedAt,
            paymentRail: null,
            ledgerEntries: [],
            attachments: [],
          },
          {
            id: `payment-draft-1`,
            payer: null,
            payerEmail: null,
            requester: null,
            requesterEmail: `priority@example.com`,
            status: `DRAFT`,
            updatedAt: draftUpdatedAt,
            paymentRail: null,
            ledgerEntries: [],
            attachments: [],
          },
        ]),
      },
    } as any;

    const service = new ConsumerContractsService(prisma);

    await expect(service.getContracts(`consumer-1`, 1, 10, undefined, `draft`)).resolves.toEqual({
      items: [
        {
          id: `contact-draft-priority`,
          name: `Priority Vendor`,
          email: `priority@example.com`,
          lastRequestId: `payment-draft-1`,
          lastStatus: `draft`,
          lastActivity: completedUpdatedAt,
          docs: 0,
          paymentsCount: 2,
          completedPaymentsCount: 1,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
    });
  });

  it(`sorts contracts by name case-insensitively when requested`, async () => {
    const prisma = {
      contactModel: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: `contact-zeta`,
            consumerId: `consumer-1`,
            email: `zeta@example.com`,
            name: `zeta Partners`,
            updatedAt: new Date(`2026-04-01T08:15:00.000Z`),
          },
          {
            id: `contact-alpha`,
            consumerId: `consumer-1`,
            email: `alpha@example.com`,
            name: `Alpha Partners`,
            updatedAt: new Date(`2026-04-01T09:15:00.000Z`),
          },
          {
            id: `contact-beta`,
            consumerId: `consumer-1`,
            email: `beta@example.com`,
            name: `beta Partners`,
            updatedAt: new Date(`2026-04-01T10:15:00.000Z`),
          },
        ]),
      },
      paymentRequestModel: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    } as any;

    const service = new ConsumerContractsService(prisma);
    const result = await service.getContracts(`consumer-1`, 1, 10, undefined, undefined, undefined, undefined, `name`);

    expect(result).toEqual({
      items: [
        {
          id: `contact-alpha`,
          name: `Alpha Partners`,
          email: `alpha@example.com`,
          lastRequestId: null,
          lastStatus: null,
          lastActivity: null,
          docs: 0,
          paymentsCount: 0,
          completedPaymentsCount: 0,
        },
        {
          id: `contact-beta`,
          name: `beta Partners`,
          email: `beta@example.com`,
          lastRequestId: null,
          lastStatus: null,
          lastActivity: null,
          docs: 0,
          paymentsCount: 0,
          completedPaymentsCount: 0,
        },
        {
          id: `contact-zeta`,
          name: `zeta Partners`,
          email: `zeta@example.com`,
          lastRequestId: null,
          lastStatus: null,
          lastActivity: null,
          docs: 0,
          paymentsCount: 0,
          completedPaymentsCount: 0,
        },
      ],
      total: 3,
      page: 1,
      pageSize: 10,
    });
  });

  it(`falls back to recent activity ordering when payment volume ties`, async () => {
    const olderUpdatedAt = new Date(`2026-04-02T08:15:00.000Z`);
    const newerUpdatedAt = new Date(`2026-04-02T09:15:00.000Z`);
    const prisma = {
      contactModel: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: `contact-older`,
            consumerId: `consumer-1`,
            email: `older@example.com`,
            name: `Older Vendor`,
            updatedAt: olderUpdatedAt,
          },
          {
            id: `contact-newer`,
            consumerId: `consumer-1`,
            email: `newer@example.com`,
            name: `Newer Vendor`,
            updatedAt: newerUpdatedAt,
          },
        ]),
      },
      paymentRequestModel: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: `payment-request-older`,
            payer: null,
            payerEmail: null,
            requester: null,
            requesterEmail: `older@example.com`,
            status: `COMPLETED`,
            updatedAt: olderUpdatedAt,
            paymentRail: null,
            ledgerEntries: [],
            attachments: [],
          },
          {
            id: `payment-request-newer`,
            payer: null,
            payerEmail: null,
            requester: null,
            requesterEmail: `newer@example.com`,
            status: `COMPLETED`,
            updatedAt: newerUpdatedAt,
            paymentRail: null,
            ledgerEntries: [],
            attachments: [],
          },
        ]),
      },
    } as any;

    const service = new ConsumerContractsService(prisma);
    const result = await service.getContracts(
      `consumer-1`,
      1,
      10,
      undefined,
      undefined,
      undefined,
      `yes`,
      `payments_count`,
    );

    expect(result).toEqual({
      items: [
        {
          id: `contact-newer`,
          name: `Newer Vendor`,
          email: `newer@example.com`,
          lastRequestId: `payment-request-newer`,
          lastStatus: `completed`,
          lastActivity: newerUpdatedAt,
          docs: 0,
          paymentsCount: 1,
          completedPaymentsCount: 1,
        },
        {
          id: `contact-older`,
          name: `Older Vendor`,
          email: `older@example.com`,
          lastRequestId: `payment-request-older`,
          lastStatus: `completed`,
          lastActivity: olderUpdatedAt,
          docs: 0,
          paymentsCount: 1,
          completedPaymentsCount: 1,
        },
      ],
      total: 2,
      page: 1,
      pageSize: 10,
    });
  });

  it(`returns dedicated contract details with summary, documents, and payments`, async () => {
    const contactUpdatedAt = new Date(`2026-03-29T08:15:00.000Z`);
    const paymentCreatedAt = new Date(`2026-03-30T09:15:00.000Z`);
    const paymentUpdatedAt = new Date(`2026-03-31T09:15:00.000Z`);
    const documentCreatedAt = new Date(`2026-03-30T08:15:00.000Z`);
    const prisma = {
      consumerModel: {
        findUnique: jest.fn().mockResolvedValue({ email: `owner@example.com` }),
      },
      contactModel: {
        findFirst: jest.fn().mockResolvedValue({
          id: `contact-1`,
          consumerId: `consumer-1`,
          email: `vendor@example.com`,
          name: `Vendor LLC`,
          updatedAt: contactUpdatedAt,
          address: {
            street: `221B Baker Street`,
            city: `London`,
            state: `Greater London`,
            postalCode: `NW1 6XE`,
            country: `United Kingdom`,
          },
        }),
      },
      paymentRequestModel: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: `payment-1`,
            amount: { toString: () => `100` },
            status: `COMPLETED`,
            createdAt: paymentCreatedAt,
            updatedAt: paymentUpdatedAt,
            ledgerEntries: [],
            attachments: [
              {
                resource: {
                  id: `resource-1`,
                  originalName: `contract.pdf`,
                  createdAt: documentCreatedAt,
                  resourceTags: [{ tag: { name: `contract` } }],
                },
              },
            ],
          },
        ]),
      },
    } as any;

    const service = new ConsumerContractsService(prisma);
    const result = await service.getDetails(`contact-1`, `consumer-1`, `http://localhost:3334`);

    expect(prisma.contactModel.findFirst).toHaveBeenCalledWith({
      where: {
        id: `contact-1`,
        consumerId: `consumer-1`,
        deletedAt: null,
      },
    });
    expect(prisma.paymentRequestModel.findMany).toHaveBeenCalledWith({
      where: {
        AND: [
          { deletedAt: null },
          {
            OR: [
              { requesterId: `consumer-1` },
              { payerId: `consumer-1` },
              { requesterId: null, requesterEmail: { equals: `owner@example.com`, mode: `insensitive` } },
              { payerId: null, payerEmail: { equals: `owner@example.com`, mode: `insensitive` } },
            ],
          },
          {
            OR: [
              { payer: { email: { equals: `vendor@example.com`, mode: `insensitive` } } },
              { requester: { email: { equals: `vendor@example.com`, mode: `insensitive` } } },
              { payerEmail: { equals: `vendor@example.com`, mode: `insensitive` } },
              { requesterEmail: { equals: `vendor@example.com`, mode: `insensitive` } },
            ],
          },
        ],
      },
      include: {
        ledgerEntries: {
          where: { consumerId: `consumer-1` },
          orderBy: { createdAt: `desc` },
          take: 1,
          include: {
            outcomes: {
              orderBy: { createdAt: `desc` },
              take: 1,
              select: { status: true },
            },
          },
        },
        attachments: {
          where: {
            deletedAt: null,
            resource: {
              deletedAt: null,
            },
          },
          include: {
            resource: {
              include: {
                resourceTags: {
                  include: {
                    tag: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [{ updatedAt: `desc` }, { createdAt: `desc` }],
    });
    expect(result).toEqual({
      id: `contact-1`,
      name: `Vendor LLC`,
      email: `vendor@example.com`,
      updatedAt: contactUpdatedAt,
      address: {
        street: `221B Baker Street`,
        city: `London`,
        state: `Greater London`,
        postalCode: `NW1 6XE`,
        country: `United Kingdom`,
      },
      summary: {
        lastStatus: `completed`,
        lastActivity: paymentUpdatedAt,
        lastRequestId: `payment-1`,
        documentsCount: 1,
        paymentsCount: 1,
        completedPaymentsCount: 1,
        draftPaymentsCount: 0,
        pendingPaymentsCount: 0,
        waitingPaymentsCount: 0,
      },
      payments: [
        {
          id: `payment-1`,
          amount: `100`,
          status: `completed`,
          createdAt: paymentCreatedAt,
          updatedAt: paymentUpdatedAt,
          role: `REQUESTER`,
          paymentRail: undefined,
        },
      ],
      documents: [
        {
          id: `resource-1`,
          name: `contract.pdf`,
          downloadUrl: `http://localhost:3334/api/consumer/documents/resource-1/download`,
          createdAt: documentCreatedAt,
          tags: [`contract`],
          isAttachedToDraftPaymentRequest: false,
          attachedDraftPaymentRequestIds: [],
          isAttachedToNonDraftPaymentRequest: true,
          attachedNonDraftPaymentRequestIds: [`payment-1`],
        },
      ],
    });
  });

  it(`keeps contract details focused on the active workflow when a newer payment is already closed`, async () => {
    const contactUpdatedAt = new Date(`2026-03-29T08:15:00.000Z`);
    const draftCreatedAt = new Date(`2026-03-30T09:15:00.000Z`);
    const draftUpdatedAt = new Date(`2026-03-31T09:15:00.000Z`);
    const completedCreatedAt = new Date(`2026-04-01T09:15:00.000Z`);
    const completedUpdatedAt = new Date(`2026-04-01T10:15:00.000Z`);
    const prisma = {
      contactModel: {
        findFirst: jest.fn().mockResolvedValue({
          id: `contact-2`,
          consumerId: `consumer-1`,
          email: `priority@example.com`,
          name: `Priority Vendor`,
          updatedAt: contactUpdatedAt,
          address: null,
        }),
      },
      paymentRequestModel: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: `payment-completed-1`,
            amount: { toString: () => `250` },
            status: `COMPLETED`,
            createdAt: completedCreatedAt,
            updatedAt: completedUpdatedAt,
            paymentRail: null,
            ledgerEntries: [],
            attachments: [],
          },
          {
            id: `payment-draft-1`,
            amount: { toString: () => `100` },
            status: `DRAFT`,
            createdAt: draftCreatedAt,
            updatedAt: draftUpdatedAt,
            paymentRail: null,
            ledgerEntries: [],
            attachments: [],
          },
        ]),
      },
    } as any;

    const service = new ConsumerContractsService(prisma);
    const result = await service.getDetails(`contact-2`, `consumer-1`, `http://localhost:3334`);

    expect(result.summary).toEqual({
      lastStatus: `draft`,
      lastActivity: completedUpdatedAt,
      lastRequestId: `payment-draft-1`,
      documentsCount: 0,
      paymentsCount: 2,
      completedPaymentsCount: 1,
      draftPaymentsCount: 1,
      pendingPaymentsCount: 0,
      waitingPaymentsCount: 0,
    });
    expect(result.payments.map((payment) => payment.id)).toEqual([`payment-completed-1`, `payment-draft-1`]);
  });

  it(
    [
      `bounds contract details to the current consumer relationship`,
      `even when another tenant uses the same contact email`,
    ].join(` `),
    async () => {
      const prisma = {
        consumerModel: {
          findUnique: jest.fn().mockResolvedValue({ email: `owner@example.com` }),
        },
        contactModel: {
          findFirst: jest.fn().mockResolvedValue({
            id: `contact-tenant-safe`,
            consumerId: `consumer-1`,
            email: `shared-vendor@example.com`,
            name: `Shared Vendor`,
            updatedAt: new Date(`2026-04-02T09:00:00.000Z`),
            address: null,
          }),
        },
        paymentRequestModel: {
          findMany: jest.fn().mockResolvedValue([]),
        },
      } as any;

      const service = new ConsumerContractsService(prisma);

      await service.getDetails(`contact-tenant-safe`, `consumer-1`, `http://localhost:3334`);

      expect(prisma.paymentRequestModel.findMany).toHaveBeenCalledWith({
        where: {
          AND: [
            { deletedAt: null },
            {
              OR: [
                { requesterId: `consumer-1` },
                { payerId: `consumer-1` },
                { requesterId: null, requesterEmail: { equals: `owner@example.com`, mode: `insensitive` } },
                { payerId: null, payerEmail: { equals: `owner@example.com`, mode: `insensitive` } },
              ],
            },
            {
              OR: [
                { payer: { email: { equals: `shared-vendor@example.com`, mode: `insensitive` } } },
                { requester: { email: { equals: `shared-vendor@example.com`, mode: `insensitive` } } },
                { payerEmail: { equals: `shared-vendor@example.com`, mode: `insensitive` } },
                { requesterEmail: { equals: `shared-vendor@example.com`, mode: `insensitive` } },
              ],
            },
          ],
        },
        include: {
          ledgerEntries: {
            where: { consumerId: `consumer-1` },
            orderBy: { createdAt: `desc` },
            take: 1,
            include: {
              outcomes: {
                orderBy: { createdAt: `desc` },
                take: 1,
                select: { status: true },
              },
            },
          },
          attachments: {
            where: {
              deletedAt: null,
              resource: {
                deletedAt: null,
              },
            },
            include: {
              resource: {
                include: {
                  resourceTags: {
                    include: {
                      tag: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: [{ updatedAt: `desc` }, { createdAt: `desc` }],
      });
    },
  );

  it(`ignores soft-deleted contacts when building the contracts list`, async () => {
    const prisma = {
      contactModel: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      paymentRequestModel: {
        findMany: jest.fn(),
      },
    } as any;

    const service = new ConsumerContractsService(prisma);
    await service.getContracts(`consumer-1`);

    expect(prisma.contactModel.findMany).toHaveBeenCalledWith({
      where: { consumerId: `consumer-1`, deletedAt: null },
      orderBy: { updatedAt: `desc` },
    });
    expect(prisma.paymentRequestModel.findMany).not.toHaveBeenCalled();
  });
});
