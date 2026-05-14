import { Injectable, Logger } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';

import { ConsumerDashboardQuery, type DashboardActivityLedgerRow } from './consumer-dashboard.query';
import { DashboardData, ActivityItem, ComplianceTask, PendingRequest, QuickDoc } from './dtos/dashboard-data.dto';
import { BalanceCalculationService, BalanceCalculationMode } from '../../../shared/balance-calculation.service';
import { buildConsumerVerificationState } from '../../../shared-common';
import { normalizeConsumerFacingTransactionStatus } from '../../consumer-status-compat';

@Injectable()
export class ConsumerDashboardService {
  private readonly logger = new Logger(ConsumerDashboardService.name);
  constructor(
    private readonly dashboardQuery: ConsumerDashboardQuery,
    private readonly balanceService: BalanceCalculationService,
  ) {}

  private getEffectiveLedgerStatus(
    entry:
      | {
          status: $Enums.TransactionStatus;
          outcomes?: Array<{ status: $Enums.TransactionStatus }>;
        }
      | null
      | undefined,
  ): $Enums.TransactionStatus | null {
    if (!entry) return null;
    return entry.outcomes?.[0]?.status ?? entry.status;
  }

  private getEffectivePaymentRequestStatus(
    paymentRequest:
      | {
          status: $Enums.TransactionStatus;
          ledgerEntries?: Array<{
            status: $Enums.TransactionStatus;
            outcomes?: Array<{ status: $Enums.TransactionStatus }>;
          }>;
        }
      | null
      | undefined,
  ): $Enums.TransactionStatus | null {
    if (!paymentRequest) return null;
    return this.getEffectiveLedgerStatus(paymentRequest.ledgerEntries?.[0]) ?? paymentRequest.status;
  }

  private isActiveDashboardPaymentRequest(
    paymentRequest:
      | {
          status: $Enums.TransactionStatus;
          ledgerEntries?: Array<{
            status: $Enums.TransactionStatus;
            outcomes?: Array<{ status: $Enums.TransactionStatus }>;
          }>;
        }
      | null
      | undefined,
  ): boolean {
    return this.getEffectivePaymentRequestStatus(paymentRequest) !== $Enums.TransactionStatus.COMPLETED;
  }

  private pickSummaryCurrencyCode(
    preferredCurrency: $Enums.CurrencyCode | null | undefined,
    ...balanceMaps: Array<Partial<Record<$Enums.CurrencyCode, number>>>
  ): $Enums.CurrencyCode {
    const hasNonZeroBalance = (currency: $Enums.CurrencyCode) =>
      balanceMaps.some((balanceMap) => Math.abs(balanceMap[currency] ?? 0) > 0.000001);

    if (preferredCurrency && hasNonZeroBalance(preferredCurrency)) {
      return preferredCurrency;
    }

    const nonZeroCurrencies = new Set<$Enums.CurrencyCode>();
    for (const balanceMap of balanceMaps) {
      for (const [currency, balance] of Object.entries(balanceMap)) {
        if (Math.abs(balance ?? 0) > 0.000001) {
          nonZeroCurrencies.add(currency as $Enums.CurrencyCode);
        }
      }
    }

    if (nonZeroCurrencies.size === 1) {
      return [...nonZeroCurrencies][0];
    }

    if (preferredCurrency && nonZeroCurrencies.size === 0) {
      return preferredCurrency;
    }

    return $Enums.CurrencyCode.USD;
  }

  private formatDashboardStatus(status: $Enums.TransactionStatus | null | undefined): string {
    const normalizedStatus = status ? normalizeConsumerFacingTransactionStatus(status) : status;
    switch (normalizedStatus) {
      case $Enums.TransactionStatus.COMPLETED:
        return `Completed`;
      case $Enums.TransactionStatus.PENDING:
        return `Pending`;
      case $Enums.TransactionStatus.WAITING:
        return `Waiting for confirmation`;
      case $Enums.TransactionStatus.DENIED:
        return `Denied`;
      case $Enums.TransactionStatus.UNCOLLECTIBLE:
        return `Failed to collect`;
      case $Enums.TransactionStatus.DRAFT:
        return `Draft`;
      default:
        return `Status updated`;
    }
  }

  private formatDashboardAmount(amount: number, currencyCode: $Enums.CurrencyCode): string {
    return `${Math.abs(amount).toFixed(2)} ${currencyCode}`;
  }

  private getPendingRequestLastActivityAt(
    paymentRequest:
      | {
          updatedAt: Date;
          ledgerEntries?: Array<{
            createdAt: Date;
            outcomes?: Array<{ createdAt: Date }>;
          }>;
        }
      | null
      | undefined,
  ): Date | null {
    if (!paymentRequest) return null;
    const latestConsumerEntry = paymentRequest.ledgerEntries?.[0];
    const latestOutcomeAt = latestConsumerEntry?.outcomes?.[0]?.createdAt ?? null;
    return latestOutcomeAt ?? latestConsumerEntry?.createdAt ?? paymentRequest.updatedAt;
  }

  private formatDashboardRail(rail: $Enums.PaymentRail | null | undefined): string | null {
    if (!rail) return null;
    if ([`CARD`, `CARD_3DS`, `CARD_TOKENIZED`].includes(rail)) {
      return `via card`;
    }
    if ([`BANK_TRANSFER`, `SEPA_TRANSFER`, `SEPA_INSTANT`, `SWIFT_TRANSFER`, `ACH`, `WIRE`].includes(rail)) {
      return `via bank transfer`;
    }
    return null;
  }

  private buildActivityDescription(parts: Array<string | null | undefined>): string | undefined {
    const value = parts.filter((part): part is string => Boolean(part && part.trim())).join(` • `);
    return value || undefined;
  }

  private mapFinancialActivityItem(
    row: DashboardActivityLedgerRow,
    paymentMethodLabelById: Map<string, string>,
  ): ActivityItem | null {
    const metadata = JSON.parse(JSON.stringify(row.metadata || {})) as {
      rail?: $Enums.PaymentRail;
      paymentMethodId?: string;
      from?: string;
      to?: string;
    };
    const normalizedType = this.normalizeDashboardActivityType(row.type, row.paymentRequestId);
    const amount = Number(row.amount);
    const status = this.getEffectiveLedgerStatus(row) ?? row.status;
    const statusLabel = this.formatDashboardStatus(status);
    const rail = metadata.rail ?? row.paymentRequest?.paymentRail ?? null;
    const paymentMethodLabel =
      typeof metadata.paymentMethodId === `string`
        ? (paymentMethodLabelById.get(metadata.paymentMethodId) ?? null)
        : null;

    switch (normalizedType) {
      case $Enums.LedgerEntryType.USER_PAYMENT:
        return {
          id: row.ledgerId,
          label: amount >= 0 ? `Payment received` : `Payment sent`,
          description: this.buildActivityDescription([
            statusLabel,
            this.formatDashboardAmount(amount, row.currencyCode),
            this.formatDashboardRail(rail),
          ]),
          createdAt: row.createdAt.toISOString(),
          kind: amount >= 0 ? `payment_received` : `payment_sent`,
        };
      case $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL:
        return {
          id: row.ledgerId,
          label: `Payment reversal`,
          description: this.buildActivityDescription([
            statusLabel,
            this.formatDashboardAmount(amount, row.currencyCode),
          ]),
          createdAt: row.createdAt.toISOString(),
          kind: `payment_reversal`,
        };
      case $Enums.LedgerEntryType.USER_PAYOUT:
        return {
          id: row.ledgerId,
          label: `Withdrawal`,
          description: this.buildActivityDescription([
            statusLabel,
            this.formatDashboardAmount(amount, row.currencyCode),
            paymentMethodLabel ? `to ${paymentMethodLabel}` : this.formatDashboardRail(rail),
          ]),
          createdAt: row.createdAt.toISOString(),
          kind: `withdrawal`,
        };
      case $Enums.LedgerEntryType.USER_PAYOUT_REVERSAL:
        return {
          id: row.ledgerId,
          label: `Withdrawal reversal`,
          description: this.buildActivityDescription([
            statusLabel,
            this.formatDashboardAmount(amount, row.currencyCode),
          ]),
          createdAt: row.createdAt.toISOString(),
          kind: `withdrawal_reversal`,
        };
      case $Enums.LedgerEntryType.CURRENCY_EXCHANGE: {
        const from = typeof metadata.from === `string` ? metadata.from : null;
        const to = typeof metadata.to === `string` ? metadata.to : null;
        return {
          id: row.ledgerId,
          label: from && to ? `Exchange ${from} to ${to}` : `Currency exchange`,
          description: this.buildActivityDescription([
            statusLabel,
            this.formatDashboardAmount(amount, row.currencyCode),
          ]),
          createdAt: row.createdAt.toISOString(),
          kind: `currency_exchange`,
        };
      }
      default:
        return null;
    }
  }

  private normalizeDashboardActivityType(
    type: $Enums.LedgerEntryType,
    paymentRequestId: string | null | undefined,
  ): $Enums.LedgerEntryType {
    if (!paymentRequestId) return type;
    if (type === $Enums.LedgerEntryType.USER_DEPOSIT) return $Enums.LedgerEntryType.USER_PAYMENT;
    if (type === $Enums.LedgerEntryType.USER_DEPOSIT_REVERSAL) return $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL;
    return type;
  }

  private async buildFinancialActivity(consumerId: string): Promise<ActivityItem[]> {
    const rows = await this.dashboardQuery.findFinancialActivityRows(consumerId);

    if (rows.length === 0) {
      return [];
    }

    const latestEntryByLedgerId = new Map<string, DashboardActivityLedgerRow>();
    for (const row of rows) {
      if (!latestEntryByLedgerId.has(row.ledgerId)) {
        latestEntryByLedgerId.set(row.ledgerId, row as DashboardActivityLedgerRow);
      }
    }

    const paymentMethodIds = Array.from(
      new Set(
        Array.from(latestEntryByLedgerId.values())
          .map((row) => {
            const metadata = JSON.parse(JSON.stringify(row.metadata || {})) as { paymentMethodId?: string };
            return typeof metadata.paymentMethodId === `string` ? metadata.paymentMethodId : null;
          })
          .filter((paymentMethodId): paymentMethodId is string => Boolean(paymentMethodId)),
      ),
    );
    const paymentMethodLabelById = new Map<string, string>();

    if (paymentMethodIds.length > 0) {
      const paymentMethods = await this.dashboardQuery.findPaymentMethodLabels(consumerId, paymentMethodIds);

      for (const paymentMethod of paymentMethods) {
        const brand = paymentMethod.brand || `Bank account`;
        const last4 = paymentMethod.last4 ? ` •••• ${paymentMethod.last4}` : ``;
        paymentMethodLabelById.set(paymentMethod.id, `${brand}${last4}`);
      }
    }

    return Array.from(latestEntryByLedgerId.values())
      .map((row) => this.mapFinancialActivityItem(row, paymentMethodLabelById))
      .filter((item): item is ActivityItem => Boolean(item))
      .sort((a, b) => new Date(b.createdAt).valueOf() - new Date(a.createdAt).valueOf())
      .slice(0, 8);
  }

  private async buildSetupActivity(consumerId: string): Promise<ActivityItem[]> {
    const consumer = await this.dashboardQuery.findSetupConsumer(consumerId);
    const verification = buildConsumerVerificationState(consumer);

    const items: ActivityItem[] = [];

    if (verification.effectiveVerified) {
      items.push({
        id: `kyc`,
        label: `Identity verified`,
        createdAt: verification.verifiedAt ?? verification.updatedAt ?? new Date().toISOString(),
        kind: `kyc_completed`,
      });
    } else if (verification.status === `requires_input` || verification.status === `more_info`) {
      items.push({
        id: `kyc_attention`,
        label: `Verification needs attention`,
        createdAt: verification.updatedAt ?? new Date().toISOString(),
        kind: `kyc_requires_input`,
      });
    } else if (verification.status === `pending_submission`) {
      items.push({
        id: `kyc_started`,
        label: `Verification started`,
        createdAt: verification.startedAt ?? new Date().toISOString(),
        kind: `kyc_started`,
      });
    } else {
      items.push({
        id: `kyc_pending`,
        label: `Identity verification pending`,
        createdAt: new Date().toISOString(),
        kind: `kyc_in_review`,
      });
    }

    const w9 = consumer.consumerResources.find(
      (cr) =>
        cr.resource.originalName.toLowerCase().includes(`w9`) || cr.resource.originalName.toLowerCase().includes(`w-9`),
    );

    if (w9) {
      items.push({
        id: `w9`,
        label: `W-9 pack ready`,
        createdAt: w9.resource.createdAt?.toISOString() ?? new Date().toISOString(),
        kind: `w9_ready`,
      });
    }

    if (consumer.paymentMethods.length > 0) {
      items.push({
        id: `bank`,
        label: `Bank account added`,
        createdAt: consumer.paymentMethods[0].createdAt?.toISOString() ?? new Date().toISOString(),
        kind: `bank_added`,
      });
    } else {
      items.push({
        id: `bank_pending`,
        label: `Bank details pending`,
        createdAt: new Date().toISOString(),
        kind: `bank_pending`,
      });
    }

    return items.sort((a, b) => new Date(b.createdAt).valueOf() - new Date(a.createdAt).valueOf());
  }

  /** Main entry point */
  async getDashboardData(consumerId: string): Promise<DashboardData> {
    try {
      const [summary, pendingRequests, activity, tasks, quickDocs] = await Promise.all([
        this.buildSummary(consumerId),
        this.buildPendingRequests(consumerId),
        this.buildActivity(consumerId),
        this.buildTasks(consumerId),
        this.buildQuickDocs(consumerId),
      ]);
      const verification = await this.buildVerification(consumerId);

      const response = {
        summary,
        pendingRequests,
        activity,
        tasks,
        quickDocs,
        verification,
      };

      return response;
    } catch (error) {
      this.logger.error(`Failed to build dashboard data`, {
        consumerId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  private async buildSummary(consumerId: string) {
    const consumerEmail = await this.dashboardQuery.getConsumerEmail(consumerId);
    const [settledBalanceResult, availableBalanceResult, activeRequestCandidates, lastPayment, settings] =
      await Promise.all([
        this.balanceService.calculateMultiCurrency(consumerId, {
          mode: BalanceCalculationMode.COMPLETED,
        }),
        this.balanceService.calculateMultiCurrency(consumerId, {
          mode: BalanceCalculationMode.COMPLETED_AND_PENDING,
        }),
        this.dashboardQuery.findActiveRequestCandidates(consumerId, consumerEmail),
        this.dashboardQuery.findLastPayment(consumerId),
        this.dashboardQuery.findSettings(consumerId),
      ]);
    const activeRequests = activeRequestCandidates.filter((paymentRequest) =>
      this.isActiveDashboardPaymentRequest(paymentRequest),
    ).length;

    const settledBalanceByCurrency = settledBalanceResult.balances as Partial<Record<$Enums.CurrencyCode, number>>;
    const availableBalanceByCurrency = availableBalanceResult.balances as Partial<Record<$Enums.CurrencyCode, number>>;
    const preferredCurrency = settings?.preferredCurrency ?? null;
    const balanceCurrencyCode = this.pickSummaryCurrencyCode(
      preferredCurrency,
      settledBalanceByCurrency,
      availableBalanceByCurrency,
    );
    const balanceMajor = settledBalanceByCurrency[balanceCurrencyCode] ?? 0;
    const availableBalanceMajor = availableBalanceByCurrency[balanceCurrencyCode] ?? 0;

    return {
      balanceCents: Math.round(balanceMajor * 100),
      balanceCurrencyCode,
      availableBalanceCents: Math.round(availableBalanceMajor * 100),
      availableBalanceCurrencyCode: balanceCurrencyCode,

      activeRequests,
      lastPaymentAt: lastPayment?.createdAt.toISOString() ?? null,
    };
  }

  private async buildPendingRequests(consumerId: string): Promise<PendingRequest[]> {
    const consumerEmail = await this.dashboardQuery.getConsumerEmail(consumerId);
    const paymentRequests = await this.dashboardQuery.findPendingPaymentRequests(consumerId, consumerEmail);

    return paymentRequests
      .map((paymentRequest) => {
        const effectiveStatus = this.getEffectivePaymentRequestStatus(paymentRequest) ?? paymentRequest.status;
        const lastActivityAt = this.getPendingRequestLastActivityAt(paymentRequest);
        return {
          id: paymentRequest.id,
          counterpartyName: paymentRequest.requester?.email ?? paymentRequest.requesterEmail ?? ``,
          amount: Number(paymentRequest.amount),
          currencyCode: paymentRequest.currencyCode,
          effectiveStatus,
          status: this.formatDashboardStatus(effectiveStatus),
          lastActivityAt,
          lastActivityTime: lastActivityAt?.getTime() ?? 0,
        };
      })
      .filter((paymentRequest) => paymentRequest.effectiveStatus !== $Enums.TransactionStatus.COMPLETED)
      .sort((left, right) => {
        const leftTime = left.lastActivityTime;
        const rightTime = right.lastActivityTime;
        if (rightTime !== leftTime) return rightTime - leftTime;
        return right.id.localeCompare(left.id);
      })
      .map((paymentRequest) => {
        return {
          id: paymentRequest.id,
          counterpartyName: paymentRequest.counterpartyName,
          amount: paymentRequest.amount,
          currencyCode: paymentRequest.currencyCode,
          status: paymentRequest.status,
          lastActivityAt: paymentRequest.lastActivityAt?.toISOString() ?? null,
        };
      });
  }

  private async buildActivity(consumerId: string): Promise<ActivityItem[]> {
    const financialActivity = await this.buildFinancialActivity(consumerId);
    if (financialActivity.length > 0) {
      return financialActivity;
    }

    return this.buildSetupActivity(consumerId);
  }

  private async buildTasks(consumerId: string): Promise<ComplianceTask[]> {
    const consumer = await this.dashboardQuery.findSetupConsumer(consumerId);
    const verification = buildConsumerVerificationState(consumer);

    const hasW9 = consumer.consumerResources.some((consumerResource) => {
      const originalName = consumerResource.resource.originalName.toLowerCase();
      return originalName.includes(`w9`) || originalName.includes(`w-9`);
    });

    return [
      {
        id: `kyc`,
        label: `Complete KYC`,
        completed: verification.effectiveVerified,
      },
      {
        id: `profile`,
        label: `Complete your profile`,
        completed: verification.profileComplete,
      },
      {
        id: `w9`,
        label: `Upload W-9 form`,
        completed: hasW9,
      },
      {
        id: `bank`,
        label: `Add bank account`,
        completed: consumer.paymentMethods.filter((x) => x.type === `BANK_ACCOUNT`).length > 0,
      },
    ];
  }

  private async buildVerification(consumerId: string) {
    const consumer = await this.dashboardQuery.findVerificationConsumer(consumerId);

    return buildConsumerVerificationState(consumer);
  }

  private async buildQuickDocs(consumerId: string): Promise<QuickDoc[]> {
    const consumerResources = await this.dashboardQuery.findQuickDocs(consumerId);

    return consumerResources.map((consumerResource) => ({
      id: consumerResource.resource.id,
      name: consumerResource.resource.originalName,
      createdAt: consumerResource.resource.createdAt?.toISOString() ?? ``,
    }));
  }
}
