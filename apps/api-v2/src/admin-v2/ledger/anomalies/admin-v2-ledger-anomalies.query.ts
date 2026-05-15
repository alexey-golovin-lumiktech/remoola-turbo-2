import { Injectable } from '@nestjs/common';

import { AdminV2LedgerAnomaliesLatestOutcomeQuery } from './admin-v2-ledger-anomalies-latest-outcome.query';
import { AdminV2LedgerAnomaliesValueIntegrityQuery } from './admin-v2-ledger-anomalies-value-integrity.query';

@Injectable()
export class AdminV2LedgerAnomaliesQuery {
  constructor(
    private readonly latestOutcomeQuery: AdminV2LedgerAnomaliesLatestOutcomeQuery,
    private readonly valueIntegrityQuery: AdminV2LedgerAnomaliesValueIntegrityQuery,
  ) {}

  countStalePendingEntries(now: Date) {
    return this.latestOutcomeQuery.countStalePendingEntries(now);
  }

  countInconsistentOutcomeChains(now: Date) {
    return this.latestOutcomeQuery.countInconsistentOutcomeChains(now);
  }

  countLargeValueOutliers(now: Date) {
    return this.valueIntegrityQuery.countLargeValueOutliers(now);
  }

  countOrphanedEntries(now: Date) {
    return this.valueIntegrityQuery.countOrphanedEntries(now);
  }

  countDuplicateIdempotencyRisk(now: Date) {
    return this.valueIntegrityQuery.countDuplicateIdempotencyRisk(now);
  }

  countImpossibleTransitions(now: Date) {
    return this.valueIntegrityQuery.countImpossibleTransitions(now);
  }

  listStalePendingEntries(...args: Parameters<AdminV2LedgerAnomaliesLatestOutcomeQuery[`listStalePendingEntries`]>) {
    return this.latestOutcomeQuery.listStalePendingEntries(...args);
  }

  listInconsistentOutcomeChains(
    ...args: Parameters<AdminV2LedgerAnomaliesLatestOutcomeQuery[`listInconsistentOutcomeChains`]>
  ) {
    return this.latestOutcomeQuery.listInconsistentOutcomeChains(...args);
  }

  listLargeValueOutliers(...args: Parameters<AdminV2LedgerAnomaliesValueIntegrityQuery[`listLargeValueOutliers`]>) {
    return this.valueIntegrityQuery.listLargeValueOutliers(...args);
  }

  listOrphanedEntries(...args: Parameters<AdminV2LedgerAnomaliesValueIntegrityQuery[`listOrphanedEntries`]>) {
    return this.valueIntegrityQuery.listOrphanedEntries(...args);
  }

  listDuplicateIdempotencyRisk(
    ...args: Parameters<AdminV2LedgerAnomaliesValueIntegrityQuery[`listDuplicateIdempotencyRisk`]>
  ) {
    return this.valueIntegrityQuery.listDuplicateIdempotencyRisk(...args);
  }

  listImpossibleTransitions(
    ...args: Parameters<AdminV2LedgerAnomaliesValueIntegrityQuery[`listImpossibleTransitions`]>
  ) {
    return this.valueIntegrityQuery.listImpossibleTransitions(...args);
  }

  countStalePendingEntriesForRange(
    ...args: Parameters<AdminV2LedgerAnomaliesLatestOutcomeQuery[`countStalePendingEntriesForRange`]>
  ) {
    return this.latestOutcomeQuery.countStalePendingEntriesForRange(...args);
  }

  countInconsistentOutcomeChainsForRange(
    ...args: Parameters<AdminV2LedgerAnomaliesLatestOutcomeQuery[`countInconsistentOutcomeChainsForRange`]>
  ) {
    return this.latestOutcomeQuery.countInconsistentOutcomeChainsForRange(...args);
  }

  countLargeValueOutliersForRange(
    ...args: Parameters<AdminV2LedgerAnomaliesValueIntegrityQuery[`countLargeValueOutliersForRange`]>
  ) {
    return this.valueIntegrityQuery.countLargeValueOutliersForRange(...args);
  }

  countOrphanedEntriesForRange(
    ...args: Parameters<AdminV2LedgerAnomaliesValueIntegrityQuery[`countOrphanedEntriesForRange`]>
  ) {
    return this.valueIntegrityQuery.countOrphanedEntriesForRange(...args);
  }

  countDuplicateIdempotencyRiskForRange(
    ...args: Parameters<AdminV2LedgerAnomaliesValueIntegrityQuery[`countDuplicateIdempotencyRiskForRange`]>
  ) {
    return this.valueIntegrityQuery.countDuplicateIdempotencyRiskForRange(...args);
  }

  countImpossibleTransitionsForRange(
    ...args: Parameters<AdminV2LedgerAnomaliesValueIntegrityQuery[`countImpossibleTransitionsForRange`]>
  ) {
    return this.valueIntegrityQuery.countImpossibleTransitionsForRange(...args);
  }
}
