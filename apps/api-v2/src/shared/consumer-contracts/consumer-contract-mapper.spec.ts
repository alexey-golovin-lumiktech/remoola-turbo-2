import { describe, expect, it } from '@jest/globals';

import { $Enums } from '@remoola/database-2';

import {
  buildContractDocuments,
  countUniqueAttachmentResources,
  getLatestRelationshipPayment,
  getOperatingRelationshipPayment,
  mapContractListPayment,
  mapContractPayment,
  normalizeEmail,
} from './consumer-contract-mapper';

describe(`consumer contract mapper`, () => {
  it(`normalizes emails and maps list payment statuses`, () => {
    expect(normalizeEmail(` Owner@Example.COM `)).toBe(`owner@example.com`);
    expect(
      mapContractListPayment(`consumer-1`, {
        id: `payment-1`,
        status: $Enums.TransactionStatus.PENDING,
        updatedAt: new Date(`2026-05-01T09:00:00.000Z`),
        ledgerEntries: [
          {
            consumerId: `consumer-1`,
            status: $Enums.TransactionStatus.PENDING,
            outcomes: [{ status: $Enums.TransactionStatus.WAITING_RECIPIENT_APPROVAL }],
          },
        ],
      }),
    ).toEqual({
      id: `payment-1`,
      status: `waiting`,
      updatedAt: new Date(`2026-05-01T09:00:00.000Z`),
    });
  });

  it(`keeps detail payment role mapping separate from list mapping`, () => {
    expect(
      mapContractPayment(`consumer-1`, `vendor@example.com`, {
        id: `payment-1`,
        amount: { toString: () => `42` },
        status: $Enums.TransactionStatus.COMPLETED,
        createdAt: new Date(`2026-05-01T08:00:00.000Z`),
        updatedAt: new Date(`2026-05-01T09:00:00.000Z`),
        paymentRail: $Enums.PaymentRail.BANK_TRANSFER,
        payerEmail: `vendor@example.com`,
        requesterEmail: `owner@example.com`,
        ledgerEntries: [],
      }),
    ).toEqual({
      id: `payment-1`,
      amount: `42`,
      status: `completed`,
      createdAt: new Date(`2026-05-01T08:00:00.000Z`),
      updatedAt: new Date(`2026-05-01T09:00:00.000Z`),
      role: `REQUESTER`,
      paymentRail: $Enums.PaymentRail.BANK_TRANSFER,
    });
  });

  it(`selects latest and operating relationship payments with workflow priority`, () => {
    const payments = [
      { id: `completed`, status: `completed`, updatedAt: new Date(`2026-05-03T09:00:00.000Z`) },
      { id: `draft`, status: `draft`, updatedAt: new Date(`2026-05-01T09:00:00.000Z`) },
      { id: `waiting`, status: `waiting`, updatedAt: new Date(`2026-05-02T09:00:00.000Z`) },
    ];

    expect(getLatestRelationshipPayment(payments)?.id).toBe(`completed`);
    expect(getOperatingRelationshipPayment(payments)?.id).toBe(`draft`);
  });

  it(`deduplicates attachment counts and builds merged contract documents`, () => {
    expect(
      countUniqueAttachmentResources([
        { attachments: [{ resourceId: `resource-1` }, { resourceId: `resource-1` }, { id: `attachment-2` }] },
      ]),
    ).toBe(2);

    expect(
      buildContractDocuments(
        [
          {
            id: `payment-draft`,
            status: $Enums.TransactionStatus.DRAFT,
            attachments: [
              {
                resource: {
                  id: `resource-1`,
                  originalName: `contract.pdf`,
                  createdAt: new Date(`2026-05-01T09:00:00.000Z`),
                  resourceTags: [{ tag: { name: `draft` } }],
                },
              },
            ],
          },
          {
            id: `payment-completed`,
            status: $Enums.TransactionStatus.COMPLETED,
            attachments: [
              {
                resource: {
                  id: `resource-1`,
                  originalName: `contract.pdf`,
                  createdAt: new Date(`2026-05-01T09:00:00.000Z`),
                  resourceTags: [{ tag: { name: `paid` } }],
                },
              },
            ],
          },
        ],
        `https://api.example.com`,
      ),
    ).toEqual([
      expect.objectContaining({
        id: `resource-1`,
        tags: [`draft`, `paid`],
        isAttachedToDraftPaymentRequest: true,
        attachedDraftPaymentRequestIds: [`payment-draft`],
        isAttachedToNonDraftPaymentRequest: true,
        attachedNonDraftPaymentRequestIds: [`payment-completed`],
      }),
    ]);
  });
});
