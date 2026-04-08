import { describe, expect, it, jest } from '@jest/globals';

import { $Enums } from '@remoola/database-2';

import { ConsumerContactsService } from './consumer-contacts.service';

function mockResolved<T>(value: T) {
  return jest.fn<() => Promise<T>>().mockResolvedValue(value);
}

describe(`ConsumerContactsService`, () => {
  it(`finds a contact through an exact email lookup without fuzzy-search limits`, async () => {
    const prisma = {
      contactModel: {
        findFirst: mockResolved({
          id: `contact-exact-1`,
          email: `Exact@example.com`,
          name: `Exact Match`,
        }),
      },
    } as any;

    const service = new ConsumerContactsService(prisma);
    const result = await service.findByExactEmail(`consumer-1`, ` exact@example.com `);

    expect(result).toEqual({
      id: `contact-exact-1`,
      email: `Exact@example.com`,
      name: `Exact Match`,
    });
    expect(prisma.contactModel.findFirst).toHaveBeenCalledWith({
      where: {
        consumerId: `consumer-1`,
        email: {
          equals: `exact@example.com`,
          mode: `insensitive`,
        },
      },
      select: { id: true, name: true, email: true },
    });
  });

  it(`normalizes waiting-recipient-approval for contact payment request summaries`, async () => {
    const prisma = {
      contactModel: {
        findFirst: mockResolved({
          id: `contact-1`,
          email: `requester@example.com`,
          name: `Requester`,
          address: { country: `US` },
        }),
      },
      paymentRequestModel: {
        findMany: mockResolved([
          {
            id: `pr-1`,
            amount: { toString: () => `8.76` },
            status: $Enums.TransactionStatus.PENDING,
            createdAt: new Date(`2026-03-25T17:27:00.000Z`),
            attachments: [],
            ledgerEntries: [
              {
                status: $Enums.TransactionStatus.PENDING,
                outcomes: [{ status: $Enums.TransactionStatus.WAITING_RECIPIENT_APPROVAL }],
              },
            ],
          },
        ]),
      },
    } as any;

    const service = new ConsumerContactsService(prisma);
    const result = await service.getDetails(`contact-1`, `consumer-1`);

    expect(result.paymentRequests[0]?.status).toBe($Enums.TransactionStatus.WAITING);
    expect(prisma.paymentRequestModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          ledgerEntries: expect.objectContaining({
            where: { consumerId: `consumer-1` },
          }),
        }),
      }),
    );
  });
});
