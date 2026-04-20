import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../shared/prisma.service';

import type {
  LedgerAnomaliesListParams,
  LedgerAnomalyClass,
  LedgerAnomalyClassSummary,
  LedgerAnomalyListResponse,
  LedgerAnomalySummaryResponse,
} from './admin-v2-ledger-anomalies.dto';

const CLASS_LABELS: Record<LedgerAnomalyClass, string> = {
  stalePendingEntries: `Stale pending entries`,
  inconsistentOutcomeChains: `Inconsistent outcome chains`,
  largeValueOutliers: `Large value outliers`,
};

const CLASS_HREFS: Record<LedgerAnomalyClass, string> = {
  stalePendingEntries: `/ledger/anomalies?class=stalePendingEntries`,
  inconsistentOutcomeChains: `/ledger/anomalies?class=inconsistentOutcomeChains`,
  largeValueOutliers: `/ledger/anomalies?class=largeValueOutliers`,
};

@Injectable()
export class AdminV2LedgerAnomaliesService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(): Promise<LedgerAnomalySummaryResponse> {
    void this.prisma;

    return {
      computedAt: new Date().toISOString(),
      classes: {
        stalePendingEntries: this.getUnavailableSummary(`stalePendingEntries`),
        inconsistentOutcomeChains: this.getUnavailableSummary(`inconsistentOutcomeChains`),
        largeValueOutliers: this.getUnavailableSummary(`largeValueOutliers`),
      },
      totalCount: null,
    };
  }

  async getList(params: LedgerAnomaliesListParams): Promise<LedgerAnomalyListResponse> {
    void params;

    return {
      class: params.className,
      items: [],
      nextCursor: null,
      computedAt: new Date().toISOString(),
    };
  }

  private getUnavailableSummary(className: LedgerAnomalyClass): LedgerAnomalyClassSummary {
    return {
      label: CLASS_LABELS[className],
      count: null,
      phaseStatus: `live-actionable`,
      availability: `temporarily-unavailable`,
      href: CLASS_HREFS[className],
    };
  }
}
