import { describe, expect, it } from '@jest/globals';

import { $Enums, Prisma } from '@remoola/database-2';

import {
  deriveLedgerPaymentRail,
  mapLedgerDisputeItem,
  mapLedgerEntryCase,
  mapLedgerListItem,
  normalizeAmountSign,
  normalizeEnumValue,
  normalizeLimit,
  normalizeSearch,
  parseLedgerMetadata,
} from './admin-v2-ledger-read.helpers';

function buildLedgerListRow(id = `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa`) {
  return {
    id,
    ledgerId: `ledger-group-1`,
    type: $Enums.LedgerEntryType.USER_PAYMENT,
    currencyCode: $Enums.CurrencyCode.USD,
    status: $Enums.TransactionStatus.PENDING,
    amount: new Prisma.Decimal(`48.00`),
    feesType: null,
    feesAmount: null,
    stripeId: null,
    idempotencyKey: null,
    metadata: null,
    consumerId: `consumer-1`,
    paymentRequestId: `payment-1`,
    createdAt: new Date(`2026-04-13T00:00:00.000Z`),
    updatedAt: new Date(`2026-04-13T01:00:00.000Z`),
    consumer: { email: `consumer@example.com` },
    paymentRequest: {
      paymentRail: $Enums.PaymentRail.CARD,
      status: $Enums.TransactionStatus.PENDING,
      payerId: `consumer-1`,
      requesterId: `consumer-2`,
    },
    outcomes: [{ status: $Enums.TransactionStatus.COMPLETED }],
    disputes: [{ id: `dispute-1` }],
  };
}

describe(`admin-v2-ledger-read.helpers`, () => {
  describe(`normalization`, () => {
    it(`clamps limit, trims search, and degrades invalid enum/sign values to undefined`, () => {
      expect(normalizeLimit(undefined)).toBe(25);
      expect(normalizeLimit(0)).toBe(1);
      expect(normalizeLimit(101)).toBe(100);

      expect(normalizeSearch(undefined)).toBeUndefined();
      expect(normalizeSearch(`   `)).toBeUndefined();
      expect(normalizeSearch(`  abc  `)).toBe(`abc`);
      expect(normalizeSearch(`x`.repeat(205))).toHaveLength(200);

      expect(normalizeEnumValue(`PENDING`, Object.values($Enums.TransactionStatus) as $Enums.TransactionStatus[])).toBe(
        `PENDING`,
      );
      expect(
        normalizeEnumValue(`not-a-status`, Object.values($Enums.TransactionStatus) as $Enums.TransactionStatus[]),
      ).toBeUndefined();

      expect(normalizeAmountSign(`positive`)).toBe(`positive`);
      expect(normalizeAmountSign(` negative `)).toBe(`negative`);
      expect(normalizeAmountSign(`INVALID`)).toBeUndefined();
    });
  });

  describe(`metadata and rail parsing`, () => {
    it(`preserves JSON clone semantics for metadata parsing`, () => {
      expect(parseLedgerMetadata({ rail: `BANK_TRANSFER`, nested: { reason: `manual` } })).toEqual({
        rail: `BANK_TRANSFER`,
        nested: { reason: `manual` },
      });
      expect(parseLedgerMetadata(null)).toEqual({});
    });

    it(`prefers metadata.rail over payment request paymentRail`, () => {
      expect(
        deriveLedgerPaymentRail({
          metadata: { rail: $Enums.PaymentRail.BANK_TRANSFER },
          paymentRequest: { paymentRail: $Enums.PaymentRail.CARD },
        }),
      ).toBe($Enums.PaymentRail.BANK_TRANSFER);

      expect(
        deriveLedgerPaymentRail({
          metadata: {},
          paymentRequest: { paymentRail: $Enums.PaymentRail.CARD },
        }),
      ).toBe($Enums.PaymentRail.CARD);
    });
  });

  describe(`list mapping`, () => {
    it(`maps ledger list items with effective status, stale warning, and rail precedence`, () => {
      expect(
        mapLedgerListItem({
          ...buildLedgerListRow(),
          metadata: { rail: $Enums.PaymentRail.BANK_TRANSFER },
        } as never),
      ).toEqual({
        id: `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa`,
        ledgerId: `ledger-group-1`,
        type: $Enums.LedgerEntryType.USER_PAYMENT,
        amount: `48`,
        currencyCode: $Enums.CurrencyCode.USD,
        persistedStatus: $Enums.TransactionStatus.PENDING,
        effectiveStatus: $Enums.TransactionStatus.COMPLETED,
        paymentRail: $Enums.PaymentRail.BANK_TRANSFER,
        consumerId: `consumer-1`,
        consumerEmail: `consumer@example.com`,
        paymentRequestId: `payment-1`,
        paymentRequestStatus: $Enums.TransactionStatus.PENDING,
        createdAt: new Date(`2026-04-13T00:00:00.000Z`),
        updatedAt: new Date(`2026-04-13T01:00:00.000Z`),
        disputeCount: 1,
        staleWarning: true,
        dataFreshnessClass: `exact`,
      });
    });
  });

  describe(`case mapping`, () => {
    it(`maps ledger case contract with latest outcome semantics and related effective statuses`, () => {
      expect(
        mapLedgerEntryCase(
          {
            entry: {
              ...buildLedgerListRow(`ledger-1`),
              stripeId: `pi_123`,
              idempotencyKey: `idem-1`,
              feesType: null,
              feesAmount: null,
              paymentRequest: {
                id: `payment-1`,
                amount: new Prisma.Decimal(`48.00`),
                currencyCode: $Enums.CurrencyCode.USD,
                status: $Enums.TransactionStatus.PENDING,
                paymentRail: $Enums.PaymentRail.CARD,
                payerId: `consumer-1`,
                requesterId: `consumer-2`,
                payer: { email: `payer@example.com` },
                requester: { email: `requester@example.com` },
              },
              outcomes: [
                {
                  id: `outcome-latest`,
                  status: $Enums.TransactionStatus.COMPLETED,
                  source: `stripe`,
                  externalId: `pi_123`,
                  createdAt: new Date(`2026-04-13T03:00:00.000Z`),
                },
                {
                  id: `outcome-earliest`,
                  status: $Enums.TransactionStatus.WAITING,
                  source: `stripe`,
                  externalId: `pi_122`,
                  createdAt: new Date(`2026-04-13T02:00:00.000Z`),
                },
              ],
              disputes: [
                {
                  id: `dispute-1`,
                  stripeDisputeId: `dp_1`,
                  metadata: { status: `open` },
                  createdAt: new Date(`2026-04-13T04:00:00.000Z`),
                },
              ],
            },
            relatedEntries: [
              {
                id: `ledger-related-1`,
                ledgerId: `ledger-group-1`,
                type: $Enums.LedgerEntryType.USER_PAYMENT,
                amount: new Prisma.Decimal(`48.00`),
                currencyCode: $Enums.CurrencyCode.USD,
                status: $Enums.TransactionStatus.PENDING,
                createdAt: new Date(`2026-04-13T00:00:00.000Z`),
                outcomes: [{ status: $Enums.TransactionStatus.COMPLETED }],
              },
            ],
            auditContext: [
              {
                id: `audit-1`,
                action: `payment_reviewed`,
                resource: `payment_request`,
                resourceId: `payment-1`,
                createdAt: new Date(`2026-04-13T05:00:00.000Z`),
                admin: { email: `admin@example.com` },
              },
            ],
          },
          { current: null, history: [] },
        ),
      ).toEqual({
        id: `ledger-1`,
        core: {
          id: `ledger-1`,
          ledgerId: `ledger-group-1`,
          type: $Enums.LedgerEntryType.USER_PAYMENT,
          amount: `48`,
          currencyCode: $Enums.CurrencyCode.USD,
          persistedStatus: $Enums.TransactionStatus.PENDING,
          effectiveStatus: $Enums.TransactionStatus.COMPLETED,
          paymentRail: $Enums.PaymentRail.CARD,
          feesType: null,
          feesAmount: null,
          stripeId: `pi_123`,
          idempotencyKey: `idem-1`,
          createdAt: new Date(`2026-04-13T00:00:00.000Z`),
          updatedAt: new Date(`2026-04-13T01:00:00.000Z`),
        },
        consumer: {
          id: `consumer-1`,
          email: `consumer@example.com`,
        },
        paymentRequest: {
          id: `payment-1`,
          amount: `48`,
          currencyCode: $Enums.CurrencyCode.USD,
          status: $Enums.TransactionStatus.PENDING,
          paymentRail: $Enums.PaymentRail.CARD,
          payerId: `consumer-1`,
          payerEmail: `payer@example.com`,
          requesterId: `consumer-2`,
          requesterEmail: `requester@example.com`,
        },
        metadata: {},
        outcomes: [
          {
            id: `outcome-latest`,
            status: $Enums.TransactionStatus.COMPLETED,
            source: `stripe`,
            externalId: `pi_123`,
            createdAt: new Date(`2026-04-13T03:00:00.000Z`),
          },
          {
            id: `outcome-earliest`,
            status: $Enums.TransactionStatus.WAITING,
            source: `stripe`,
            externalId: `pi_122`,
            createdAt: new Date(`2026-04-13T02:00:00.000Z`),
          },
        ],
        disputes: [
          {
            id: `dispute-1`,
            stripeDisputeId: `dp_1`,
            metadata: { status: `open` },
            createdAt: new Date(`2026-04-13T04:00:00.000Z`),
          },
        ],
        relatedEntries: [
          {
            id: `ledger-related-1`,
            ledgerId: `ledger-group-1`,
            type: $Enums.LedgerEntryType.USER_PAYMENT,
            amount: `48`,
            currencyCode: $Enums.CurrencyCode.USD,
            effectiveStatus: $Enums.TransactionStatus.COMPLETED,
            createdAt: new Date(`2026-04-13T00:00:00.000Z`),
          },
        ],
        auditContext: [
          {
            id: `audit-1`,
            action: `payment_reviewed`,
            resource: `payment_request`,
            resourceId: `payment-1`,
            adminEmail: `admin@example.com`,
            createdAt: new Date(`2026-04-13T05:00:00.000Z`),
          },
        ],
        assignment: { current: null, history: [] },
        staleWarning: true,
        dataFreshnessClass: `exact`,
      });
    });
  });

  describe(`dispute mapping`, () => {
    it(`derives disputeStatus from metadata precedence and keeps append-only freshness`, () => {
      expect(
        mapLedgerDisputeItem({
          id: `dispute-row-1`,
          stripeDisputeId: `dp_fixture_open`,
          metadata: { disputeStatus: `open`, status: `needs_response`, reason: `fraudulent`, amount: 4800 },
          createdAt: new Date(`2026-04-13T00:00:00.000Z`),
          ledgerEntry: {
            id: `ledger-1`,
            ledgerId: `ledger-group-1`,
            paymentRequestId: `payment-1`,
            consumerId: `consumer-1`,
            type: $Enums.LedgerEntryType.USER_PAYMENT,
            amount: new Prisma.Decimal(`48.00`),
            currencyCode: $Enums.CurrencyCode.USD,
            paymentRequest: {
              paymentRail: $Enums.PaymentRail.CARD,
            },
          },
        }),
      ).toEqual({
        id: `dispute-row-1`,
        stripeDisputeId: `dp_fixture_open`,
        disputeStatus: `needs_response`,
        reason: `fraudulent`,
        amountMinor: 4800,
        updatedAt: null,
        createdAt: new Date(`2026-04-13T00:00:00.000Z`),
        metadata: {
          disputeStatus: `open`,
          status: `needs_response`,
          reason: `fraudulent`,
          amount: 4800,
        },
        ledgerEntry: {
          id: `ledger-1`,
          ledgerId: `ledger-group-1`,
          paymentRequestId: `payment-1`,
          consumerId: `consumer-1`,
          type: $Enums.LedgerEntryType.USER_PAYMENT,
          amount: `48`,
          currencyCode: $Enums.CurrencyCode.USD,
          paymentRail: $Enums.PaymentRail.CARD,
        },
        dataFreshnessClass: `append-only-log`,
      });
    });
  });
});
