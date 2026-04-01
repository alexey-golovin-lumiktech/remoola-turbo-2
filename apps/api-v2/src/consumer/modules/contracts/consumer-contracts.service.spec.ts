import { ConsumerContractsService } from './consumer-contracts.service';

describe(`ConsumerContractsService`, () => {
  it(`includes email-only payment requests in contracts read model and normalizes status`, async () => {
    const updatedAt = new Date(`2026-03-25T10:00:00.000Z`);
    const prisma = {
      contactModel: {
        count: jest.fn().mockResolvedValue(1),
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
            payerEmail: null,
            requester: null,
            requesterEmail: `vendor@example.com`,
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
        OR: [
          { payer: { email: { in: [`vendor@example.com`] } } },
          { requester: { email: { in: [`vendor@example.com`] } } },
          { payerEmail: { in: [`vendor@example.com`] } },
          { requesterEmail: { in: [`vendor@example.com`] } },
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
        attachments: true,
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
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
    });
  });

  it(`prefers latest consumer ledger outcome status for linked-consumer contracts`, async () => {
    const linkedUpdatedAt = new Date(`2026-03-27T11:45:00.000Z`);
    const prisma = {
      contactModel: {
        count: jest.fn().mockResolvedValue(1),
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
                outcomes: [{ status: `WAITING` }],
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
        count: jest.fn().mockResolvedValue(0),
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
});
