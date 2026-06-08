import { describe, expect, it } from '@jest/globals';

import { $Enums } from '@remoola/database-2';

import {
  getDashboardPaymentRequestEffectiveStatus,
  getPendingDashboardRequestLastActivityAt,
  isActiveDashboardPaymentRequest,
} from './consumer-dashboard-payment-request.policy';

describe(`consumer-dashboard-payment-request policy`, () => {
  it(`derives effective status from the latest ledger outcome`, () => {
    const paymentRequest = {
      status: $Enums.TransactionStatus.PENDING,
      ledgerEntries: [
        {
          status: $Enums.TransactionStatus.PENDING,
          outcomes: [{ status: $Enums.TransactionStatus.WAITING }],
        },
      ],
    };

    expect(getDashboardPaymentRequestEffectiveStatus(paymentRequest)).toBe($Enums.TransactionStatus.WAITING);
  });

  it(`treats effectively completed requests as inactive`, () => {
    const paymentRequest = {
      status: $Enums.TransactionStatus.PENDING,
      ledgerEntries: [
        {
          status: $Enums.TransactionStatus.PENDING,
          outcomes: [{ status: $Enums.TransactionStatus.COMPLETED }],
        },
      ],
    };

    expect(isActiveDashboardPaymentRequest(paymentRequest)).toBe(false);
  });

  it(`keeps stale completed requests active when the latest outcome is not completed`, () => {
    const paymentRequest = {
      status: $Enums.TransactionStatus.COMPLETED,
      ledgerEntries: [
        {
          status: $Enums.TransactionStatus.PENDING,
          outcomes: [{ status: $Enums.TransactionStatus.WAITING }],
        },
      ],
    };

    expect(isActiveDashboardPaymentRequest(paymentRequest)).toBe(true);
  });

  it(`prefers the latest outcome timestamp for pending request last activity`, () => {
    const updatedAt = new Date(`2026-03-27T12:13:35.558Z`);
    const entryCreatedAt = new Date(`2026-03-27T12:13:35.560Z`);
    const outcomeCreatedAt = new Date(`2026-03-27T12:50:00.000Z`);
    const paymentRequest = {
      updatedAt,
      ledgerEntries: [
        {
          createdAt: entryCreatedAt,
          outcomes: [{ createdAt: outcomeCreatedAt }],
        },
      ],
    };

    expect(getPendingDashboardRequestLastActivityAt(paymentRequest)).toBe(outcomeCreatedAt);
  });

  it(`falls back from outcome to ledger entry and then request updatedAt`, () => {
    const updatedAt = new Date(`2026-03-27T12:13:35.558Z`);
    const entryCreatedAt = new Date(`2026-03-27T12:13:35.560Z`);

    expect(
      getPendingDashboardRequestLastActivityAt({
        updatedAt,
        ledgerEntries: [
          {
            createdAt: entryCreatedAt,
            outcomes: [],
          },
        ],
      }),
    ).toBe(entryCreatedAt);

    expect(
      getPendingDashboardRequestLastActivityAt({
        updatedAt,
        ledgerEntries: [],
      }),
    ).toBe(updatedAt);
  });
});
