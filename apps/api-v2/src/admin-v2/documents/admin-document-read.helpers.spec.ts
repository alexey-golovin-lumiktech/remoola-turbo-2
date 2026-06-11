import { describe, expect, it } from '@jest/globals';

import { Prisma } from '@remoola/database-2';

import {
  buildLinkedPaymentRequestIds,
  buildLinkedPaymentRequests,
  buildListDocumentsWhere,
  mapDocumentCase,
  mapDocumentListItem,
  normalizeAccess,
  normalizeCreatedRange,
  normalizePage,
  normalizePageSize,
  normalizeSizeRange,
} from './admin-document-read.helpers';

describe(`admin-document-read.helpers`, () => {
  describe(`pagination and filter normalization`, () => {
    it(`keeps the current page and pageSize defaults and clamp behavior`, () => {
      expect(normalizePage(undefined)).toBe(1);
      expect(normalizePage(0)).toBe(1);
      expect(normalizePage(2.9)).toBe(2);

      expect(normalizePageSize(undefined)).toBe(20);
      expect(normalizePageSize(0)).toBe(20);
      expect(normalizePageSize(101)).toBe(100);
      expect(normalizePageSize(7.9)).toBe(7);
    });

    it(`degrades invalid access, date, and size filters quietly to undefined`, () => {
      expect(normalizeAccess(``)).toBeUndefined();
      expect(normalizeAccess(`INVALID`)).toBeUndefined();
      expect(normalizeCreatedRange(`bad`, `still-bad`)).toBeUndefined();
      expect(normalizeSizeRange(Number.NaN, Number.NaN)).toBeUndefined();
    });

    it(`builds the current list where shape with evidence scope and all supported filters`, () => {
      expect(
        buildListDocumentsWhere({
          q: ` proof `,
          consumerId: ` consumer-1 `,
          access: `PRIVATE`,
          mimetype: ` application/pdf `,
          sizeMin: 10,
          sizeMax: 20,
          createdFrom: `2026-04-17T00:00:00.000Z`,
          createdTo: `2026-04-18T00:00:00.000Z`,
          paymentRequestId: ` payment-1 `,
          tag: ` Evidence `,
          tagId: ` tag-1 `,
        }),
      ).toEqual({
        deletedAt: null,
        AND: [
          {
            OR: [{ consumerResources: { some: { deletedAt: null } } }, { attachments: { some: { deletedAt: null } } }],
          },
          {
            OR: [
              { id: `proof` },
              {
                originalName: {
                  contains: `proof`,
                  mode: `insensitive`,
                },
              },
            ],
          },
          {
            consumerResources: {
              some: {
                consumerId: `consumer-1`,
                deletedAt: null,
              },
            },
          },
          { access: `PRIVATE` },
          {
            mimetype: {
              equals: `application/pdf`,
              mode: `insensitive`,
            },
          },
          { size: { gte: 10, lte: 20 } },
          {
            createdAt: {
              gte: new Date(`2026-04-17T00:00:00.000Z`),
              lte: new Date(`2026-04-18T00:00:00.000Z`),
            },
          },
          {
            attachments: {
              some: {
                paymentRequestId: `payment-1`,
                deletedAt: null,
              },
            },
          },
          {
            resourceTags: {
              some: {
                tag: {
                  name: `evidence`,
                },
              },
            },
          },
          {
            resourceTags: {
              some: {
                tagId: `tag-1`,
              },
            },
          },
        ],
      });
    });
  });

  describe(`list mapping`, () => {
    it(`maps canonical list items with singular consumer linkage and deduped payment ids`, () => {
      expect(
        mapDocumentListItem(
          {
            id: `doc-1`,
            originalName: `proof.pdf`,
            access: `PRIVATE`,
            mimetype: `application/pdf`,
            size: 2048,
            createdAt: new Date(`2026-04-17T08:00:00.000Z`),
            updatedAt: new Date(`2026-04-17T08:10:00.000Z`),
            consumerResources: [
              {
                consumer: {
                  id: `consumer-1`,
                  email: `owner@example.com`,
                  deletedAt: null,
                },
              },
            ],
            resourceTags: [{ tag: { name: `evidence` } }, { tag: { name: `invoice` } }],
            attachments: [
              { paymentRequest: { id: `payment-1` } },
              { paymentRequest: { id: `payment-1` } },
              { paymentRequest: { id: `payment-2` } },
            ],
          },
          { id: `admin-1`, email: `ops@example.com` },
        ),
      ).toEqual({
        id: `doc-1`,
        originalName: `proof.pdf`,
        access: `PRIVATE`,
        mimeType: `application/pdf`,
        size: 2048,
        consumerId: `consumer-1`,
        consumerEmail: `owner@example.com`,
        createdAt: `2026-04-17T08:00:00.000Z`,
        version: new Date(`2026-04-17T08:10:00.000Z`).getTime(),
        tags: [`evidence`, `invoice`],
        linkedPaymentRequestIds: [`payment-1`, `payment-2`],
        assignedTo: { id: `admin-1`, email: `ops@example.com` },
      });
    });

    it(`degrades ambiguous consumer linkage to null in list mapping`, () => {
      expect(
        mapDocumentListItem(
          {
            id: `doc-1`,
            originalName: `proof.pdf`,
            access: `PRIVATE`,
            mimetype: `application/pdf`,
            size: 2048,
            createdAt: new Date(`2026-04-17T08:00:00.000Z`),
            updatedAt: new Date(`2026-04-17T08:10:00.000Z`),
            consumerResources: [
              {
                consumer: {
                  id: `consumer-1`,
                  email: `owner-1@example.com`,
                  deletedAt: null,
                },
              },
              {
                consumer: {
                  id: `consumer-2`,
                  email: `owner-2@example.com`,
                  deletedAt: null,
                },
              },
            ],
            resourceTags: [],
            attachments: [],
          },
          null,
        ),
      ).toEqual(
        expect.objectContaining({
          consumerId: null,
          consumerEmail: null,
          assignedTo: null,
        }),
      );
    });

    it(`dedupes linked payment request ids with first-seen order`, () => {
      expect(
        buildLinkedPaymentRequestIds([
          { paymentRequest: { id: `payment-1` } },
          { paymentRequest: { id: `payment-2` } },
          { paymentRequest: { id: `payment-1` } },
        ]),
      ).toEqual([`payment-1`, `payment-2`]);
    });
  });

  describe(`case mapping`, () => {
    it(`maps the canonical case contract with deduped linked payment requests`, () => {
      expect(
        mapDocumentCase(
          {
            id: `doc-1`,
            originalName: `proof.pdf`,
            access: `PRIVATE`,
            mimetype: `application/pdf`,
            size: 2048,
            createdAt: new Date(`2026-04-17T08:00:00.000Z`),
            updatedAt: new Date(`2026-04-17T08:10:00.000Z`),
            deletedAt: null,
            consumerResources: [
              {
                consumer: {
                  id: `consumer-1`,
                  email: `owner@example.com`,
                  deletedAt: null,
                },
              },
            ],
            resourceTags: [{ tag: { id: `tag-1`, name: `evidence` } }],
            attachments: [
              {
                paymentRequest: {
                  id: `payment-1`,
                  amount: new Prisma.Decimal(`42.00`),
                  status: `WAITING`,
                  createdAt: new Date(`2026-04-17T08:05:00.000Z`),
                },
              },
              {
                paymentRequest: {
                  id: `payment-1`,
                  amount: new Prisma.Decimal(`42.00`),
                  status: `WAITING`,
                  createdAt: new Date(`2026-04-17T08:05:00.000Z`),
                },
              },
            ],
          },
          { current: null, history: [] },
          `https://api.example.com`,
        ),
      ).toEqual({
        id: `doc-1`,
        core: {
          id: `doc-1`,
          originalName: `proof.pdf`,
          access: `PRIVATE`,
          mimeType: `application/pdf`,
          size: 2048,
          createdAt: `2026-04-17T08:00:00.000Z`,
          deletedAt: null,
        },
        consumer: {
          id: `consumer-1`,
          email: `owner@example.com`,
        },
        tags: [
          {
            id: `tag-1`,
            name: `evidence`,
          },
        ],
        linkedPaymentRequests: [
          {
            id: `payment-1`,
            amount: `42`,
            status: `WAITING`,
            createdAt: `2026-04-17T08:05:00.000Z`,
          },
        ],
        downloadUrl: `https://api.example.com/api/admin-v2/documents/doc-1/download`,
        version: new Date(`2026-04-17T08:10:00.000Z`).getTime(),
        updatedAt: `2026-04-17T08:10:00.000Z`,
        staleWarning: false,
        dataFreshnessClass: `exact`,
        assignment: { current: null, history: [] },
      });
    });

    it(`degrades ambiguous consumer linkage to null in case mapping`, () => {
      expect(
        mapDocumentCase(
          {
            id: `doc-1`,
            originalName: `proof.pdf`,
            access: `PRIVATE`,
            mimetype: `application/pdf`,
            size: 2048,
            createdAt: new Date(`2026-04-17T08:00:00.000Z`),
            updatedAt: new Date(`2026-04-17T08:10:00.000Z`),
            deletedAt: null,
            consumerResources: [
              {
                consumer: {
                  id: `consumer-1`,
                  email: `owner-1@example.com`,
                  deletedAt: null,
                },
              },
              {
                consumer: {
                  id: `consumer-2`,
                  email: `owner-2@example.com`,
                  deletedAt: null,
                },
              },
            ],
            resourceTags: [],
            attachments: [],
          },
          { current: null, history: [] },
        ),
      ).toEqual(
        expect.objectContaining({
          consumer: null,
          linkedPaymentRequests: [],
        }),
      );
    });

    it(`dedupes linked payment requests with first-seen order and stringifies amounts`, () => {
      expect(
        buildLinkedPaymentRequests([
          {
            paymentRequest: {
              id: `payment-2`,
              amount: new Prisma.Decimal(`99.50`),
              status: `PENDING`,
              createdAt: new Date(`2026-04-17T09:00:00.000Z`),
            },
          },
          {
            paymentRequest: {
              id: `payment-1`,
              amount: new Prisma.Decimal(`42.00`),
              status: `WAITING`,
              createdAt: new Date(`2026-04-17T08:05:00.000Z`),
            },
          },
          {
            paymentRequest: {
              id: `payment-2`,
              amount: new Prisma.Decimal(`99.50`),
              status: `PENDING`,
              createdAt: new Date(`2026-04-17T09:00:00.000Z`),
            },
          },
        ]),
      ).toEqual([
        {
          id: `payment-2`,
          amount: `99.5`,
          status: `PENDING`,
          createdAt: `2026-04-17T09:00:00.000Z`,
        },
        {
          id: `payment-1`,
          amount: `42`,
          status: `WAITING`,
          createdAt: `2026-04-17T08:05:00.000Z`,
        },
      ]);
    });
  });
});
