import { Injectable } from '@nestjs/common';

import { type AdminV2OverviewSignalSummary, type AdminV2OverviewSummaryResponse } from '@remoola/api-types';
import { $Enums } from '@remoola/database-2';

import {
  buildAvailableCountSignal,
  buildLedgerAnomaliesSignal,
  buildPendingVerificationsSignal,
  buildRateStaleCutoff,
  buildRecentAdminActionsSignal,
  buildSuspiciousAuthEventsSignal,
  buildUnavailableCountSignal,
  buildUnavailableLedgerAnomaliesSignal,
} from './admin-v2-overview-policy';
import { AdminV2OverviewQuery } from './admin-v2-overview.query';
import { envs } from '../../envs';
import { AdminV2LedgerAnomaliesService } from '../ledger/anomalies/admin-v2-ledger-anomalies.service';
import { AdminV2VerificationSlaService } from '../verification/admin-v2-verification-sla.service';

@Injectable()
export class AdminV2OverviewService {
  constructor(
    private readonly query: AdminV2OverviewQuery,
    private readonly verificationSla: AdminV2VerificationSlaService,
    private readonly ledgerAnomalies: AdminV2LedgerAnomaliesService,
  ) {}

  private async getCountSignal(params: {
    label: string;
    href: string;
    loadCount: () => Promise<number>;
  }): Promise<AdminV2OverviewSignalSummary> {
    try {
      const count = await params.loadCount();

      return buildAvailableCountSignal({
        label: params.label,
        href: params.href,
        count,
      });
    } catch {
      return buildUnavailableCountSignal({
        label: params.label,
        href: params.href,
      });
    }
  }

  private async getOpenDisputesSignal(): Promise<AdminV2OverviewSignalSummary> {
    return this.getCountSignal({
      label: `Open disputes`,
      href: `/ledger?view=disputes`,
      loadCount: () => this.query.countOpenDisputes(),
    });
  }

  private getRateStaleCutoff(now: Date) {
    return buildRateStaleCutoff(now, envs.EXCHANGE_RATE_MAX_AGE_HOURS);
  }

  private async getFailedScheduledConversionsSignal(): Promise<AdminV2OverviewSignalSummary> {
    return this.getCountSignal({
      label: `Failed scheduled FX`,
      href: `/exchange/scheduled?status=FAILED`,
      loadCount: () => this.query.countFailedScheduledConversions(),
    });
  }

  private async getLedgerAnomaliesSignal(): Promise<AdminV2OverviewSignalSummary> {
    try {
      const summary = await this.ledgerAnomalies.getSummary();
      return buildLedgerAnomaliesSignal(summary.totalCount);
    } catch {
      return buildUnavailableLedgerAnomaliesSignal();
    }
  }

  private async getStaleExchangeRatesSignal(now: Date): Promise<AdminV2OverviewSignalSummary> {
    const staleCutoff = this.getRateStaleCutoff(now);
    return this.getCountSignal({
      label: `Stale exchange rates`,
      href: `/exchange/rates?stale=true`,
      loadCount: () => this.query.countStaleExchangeRates({ now, staleCutoff }),
    });
  }

  async getSummary(): Promise<AdminV2OverviewSummaryResponse> {
    const now = new Date();
    const authWindowStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [
      pendingVerifications,
      suspiciousAuthEvents,
      recentAdminActions,
      overduePaymentRequestsSignal,
      uncollectiblePaymentRequestsSignal,
      slaSnapshot,
      openDisputes,
      ledgerAnomalies,
      failedScheduledConversions,
      staleExchangeRates,
    ] = await Promise.all([
      this.query.countPendingVerifications(),
      this.query.countSuspiciousAuthEvents(authWindowStart),
      this.query.listRecentAdminActions(5),
      this.getCountSignal({
        label: `Overdue payment requests`,
        href: `/payments?overdue=true`,
        loadCount: () => this.query.countOverduePaymentRequests(now),
      }),
      this.getCountSignal({
        label: `Uncollectible payment requests`,
        href: `/payments?status=${$Enums.TransactionStatus.UNCOLLECTIBLE}`,
        loadCount: () => this.query.countUncollectiblePaymentRequests(),
      }),
      this.verificationSla.getSnapshot(),
      this.getOpenDisputesSignal(),
      this.getLedgerAnomaliesSignal(),
      this.getFailedScheduledConversionsSignal(),
      this.getStaleExchangeRatesSignal(now),
    ]);

    return {
      computedAt: now.toISOString(),
      signals: {
        pendingVerifications: buildPendingVerificationsSignal({
          count: pendingVerifications,
          slaBreachedCount: slaSnapshot.breachedConsumerIds.size,
        }),
        recentAdminActions: buildRecentAdminActionsSignal(recentAdminActions),
        suspiciousAuthEvents: buildSuspiciousAuthEventsSignal({
          count: suspiciousAuthEvents,
          authWindowStart,
        }),
        overduePaymentRequests: overduePaymentRequestsSignal,
        uncollectiblePaymentRequests: uncollectiblePaymentRequestsSignal,
        openDisputes,
        ledgerAnomalies,
        failedScheduledConversions,
        staleExchangeRates,
      },
    };
  }
}
