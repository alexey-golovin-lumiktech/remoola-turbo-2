import { describe, expect, it, jest } from '@jest/globals';

import { $Enums } from '@remoola/database-2';

import { type ConsumerContactsRepository } from './consumer-contacts.repository';
import { ConsumerContactsService } from './consumer-contacts.service';

function mockResolved<T>(value: T) {
  return jest.fn<() => Promise<T>>().mockResolvedValue(value);
}

function createContactsRepositoryMock(
  overrides: Partial<Record<keyof ConsumerContactsRepository, jest.Mock<(...a: any[]) => any>>> = {},
) {
  return {
    findByIdForConsumer: mockResolved(null),
    search: mockResolved([]),
    findByExactEmail: mockResolved(null),
    findPaymentRequestsForDetails: mockResolved([]),
    countForConsumer: mockResolved(0),
    listForConsumer: mockResolved([]),
    findByEmailForConsumer: mockResolved(null),
    create: mockResolved({}),
    update: mockResolved({}),
    delete: mockResolved({}),
    ...overrides,
  } as unknown as ConsumerContactsRepository;
}

describe(`ConsumerContactsService`, () => {
  it(`finds a contact through an exact email lookup without fuzzy-search limits`, async () => {
    const contactsRepository = createContactsRepositoryMock({
      findByExactEmail: mockResolved({
        id: `contact-exact-1`,
        email: `Exact@example.com`,
        name: `Exact Match`,
      }),
    });

    const service = new ConsumerContactsService(contactsRepository);
    const result = await service.findByExactEmail(`consumer-1`, ` exact@example.com `);

    expect(result).toEqual({
      id: `contact-exact-1`,
      email: `Exact@example.com`,
      name: `Exact Match`,
    });
    expect(contactsRepository.findByExactEmail).toHaveBeenCalledWith(`consumer-1`, `exact@example.com`);
  });

  it(`normalizes waiting-recipient-approval for contact payment request summaries`, async () => {
    const contactsRepository = createContactsRepositoryMock({
      findByIdForConsumer: mockResolved({
        id: `contact-1`,
        email: `requester@example.com`,
        name: `Requester`,
        address: { country: `US` },
      }),
      findPaymentRequestsForDetails: mockResolved([
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
    });

    const service = new ConsumerContactsService(contactsRepository);
    const result = await service.getDetails(`contact-1`, `consumer-1`);

    expect(result.paymentRequests[0]?.status).toBe($Enums.TransactionStatus.WAITING);
    expect(contactsRepository.findPaymentRequestsForDetails).toHaveBeenCalledWith(
      `requester@example.com`,
      `consumer-1`,
    );
  });
});
