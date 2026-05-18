import { $Enums } from '@remoola/database-2';

import {
  derivePayoutStatus,
  getEffectiveLedgerStatus,
  getEscalationBlockReason,
  getOutcomeAgeHours,
  getLatestOutcomeTimestamp,
  PAYOUT_STUCK_THRESHOLD_HOURS,
} from './payout-status-deriver';

describe(`payout-status-deriver`, () => {
  const now = new Date(`2026-04-18T12:00:00.000Z`);
  const recent = new Date(`2026-04-18T11:00:00.000Z`);
  const stuckBoundary = new Date(now.getTime() - PAYOUT_STUCK_THRESHOLD_HOURS * 60 * 60 * 1000);

  it(`uses the latest outcome status before the persisted ledger status`, () => {
    expect(
      getEffectiveLedgerStatus({
        status: $Enums.TransactionStatus.PENDING,
        outcomes: [{ status: $Enums.TransactionStatus.DENIED }],
      }),
    ).toBe($Enums.TransactionStatus.DENIED);
  });

  it(`uses the latest outcome timestamp for age calculations`, () => {
    const entry = {
      createdAt: new Date(`2026-04-17T00:00:00.000Z`),
      outcomes: [{ createdAt: recent }],
    };

    expect(getLatestOutcomeTimestamp(entry)).toBe(recent);
    expect(getOutcomeAgeHours(entry, now)).toBe(1);
  });

  it.each([
    [`completed`, $Enums.TransactionStatus.PENDING, $Enums.TransactionStatus.COMPLETED],
    [`failed`, $Enums.TransactionStatus.PENDING, $Enums.TransactionStatus.DENIED],
  ] as const)(`derives %s from the latest outcome`, (expectedStatus, persistedStatus, outcomeStatus) => {
    expect(
      derivePayoutStatus(
        {
          type: $Enums.LedgerEntryType.USER_PAYOUT,
          status: persistedStatus,
          createdAt: recent,
          outcomes: [{ status: outcomeStatus, createdAt: recent }],
        },
        now,
      ),
    ).toBe(expectedStatus);
  });

  it(`derives reversed from payout reversal entries regardless of transaction status`, () => {
    expect(
      derivePayoutStatus(
        {
          type: $Enums.LedgerEntryType.USER_PAYOUT_REVERSAL,
          status: $Enums.TransactionStatus.COMPLETED,
          createdAt: recent,
          outcomes: [],
        },
        now,
      ),
    ).toBe(`reversed`);
  });

  it(`keeps waiting payouts pending before the stuck threshold`, () => {
    expect(
      derivePayoutStatus(
        {
          type: $Enums.LedgerEntryType.USER_PAYOUT,
          status: $Enums.TransactionStatus.WAITING,
          createdAt: recent,
          outcomes: [],
        },
        now,
      ),
    ).toBe(`pending`);
  });

  it(`keeps non-waiting pending-like payouts processing before the stuck threshold`, () => {
    expect(
      derivePayoutStatus(
        {
          type: $Enums.LedgerEntryType.USER_PAYOUT,
          status: $Enums.TransactionStatus.PENDING,
          createdAt: recent,
          outcomes: [],
        },
        now,
      ),
    ).toBe(`processing`);
  });

  it(`marks pending-like payouts stuck at the threshold boundary`, () => {
    expect(
      derivePayoutStatus(
        {
          type: $Enums.LedgerEntryType.USER_PAYOUT,
          status: $Enums.TransactionStatus.PENDING,
          createdAt: stuckBoundary,
          outcomes: [],
        },
        now,
      ),
    ).toBe(`stuck`);
  });

  it(`blocks escalation when an active escalation marker already exists`, () => {
    expect(getEscalationBlockReason({ derivedStatus: `failed`, escalation: { id: `esc-1` } })).toBe(
      `Payout already has an active escalation marker`,
    );
  });

  it(`allows escalation only for failed or stuck payouts`, () => {
    expect(getEscalationBlockReason({ derivedStatus: `failed`, escalation: null })).toBeNull();
    expect(getEscalationBlockReason({ derivedStatus: `stuck`, escalation: null })).toBeNull();
    expect(getEscalationBlockReason({ derivedStatus: `processing`, escalation: null })).toBe(
      `Only failed or stuck payouts can receive an escalation marker in the current operator slice`,
    );
  });
});
