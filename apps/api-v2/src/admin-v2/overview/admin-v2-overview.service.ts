import { Injectable } from '@nestjs/common';

import { type AdminV2OverviewSignalSummary, type AdminV2OverviewSummaryResponse } from '@remoola/api-types';
import { $Enums } from '@remoola/database-2';

import { AdminV2OverviewQuery } from './admin-v2-overview.query';
import { envs } from '../../envs';
import { AUTH_AUDIT_EVENTS } from '../../shared/auth-audit.service';
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

      return {
        label: params.label,
        count,
        phaseStatus: `live-actionable`,
        availability: `available`,
        href: params.href,
      };
    } catch {
      return {
        label: params.label,
        count: null,
        phaseStatus: `live-actionable`,
        availability: `temporarily-unavailable`,
        href: params.href,
      };
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
    const hours = envs.EXCHANGE_RATE_MAX_AGE_HOURS;
    const ageMs = Number.isFinite(hours) && hours > 0 ? hours * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    return new Date(now.getTime() - ageMs);
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
      return {
        label: `Ledger anomalies`,
        count: summary.totalCount,
        phaseStatus: `live-actionable`,
        availability: summary.totalCount == null ? `temporarily-unavailable` : `available`,
        href: `/ledger/anomalies`,
      };
    } catch {
      return {
        label: `Ledger anomalies`,
        count: null,
        phaseStatus: `live-actionable`,
        availability: `temporarily-unavailable`,
        href: `/ledger/anomalies`,
      };
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
        pendingVerifications: {
          label: `Pending verifications`,
          count: pendingVerifications,
          phaseStatus: `live-actionable`,
          availability: `available`,
          href: `/verification`,
          slaBreachedCount: slaSnapshot.breachedConsumerIds.size,
        },
        recentAdminActions: {
          label: `Recent admin actions`,
          phaseStatus: `live-actionable`,
          availability: `available`,
          href: `/audit/admin-actions`,
          items: recentAdminActions.map((item) => ({
            id: item.id,
            action: item.action,
            resource: item.resource,
            resourceId: item.resourceId,
            adminEmail: item.admin.email,
            createdAt: item.createdAt,
          })),
        },
        suspiciousAuthEvents: {
          label: `Suspicious auth events`,
          count: suspiciousAuthEvents,
          phaseStatus: `live-actionable`,
          availability: `available`,
          href: `/audit/auth?event=${AUTH_AUDIT_EVENTS.login_failure}&dateFrom=${authWindowStart.toISOString()}`,
        },
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
