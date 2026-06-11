'use client';

import { type DocumentsClientContractContext } from './document-helpers';
import { MetricLine } from '../../../shared/ui/shell-data-display';

export function DocumentsMetricsSection({
  complianceCount,
  contractContext,
  contractsCount,
  documentsLength,
  paymentCount,
  total,
}: {
  complianceCount: number;
  contractContext: DocumentsClientContractContext | null;
  contractsCount: number;
  documentsLength: number;
  paymentCount: number;
  total: number;
}) {
  return (
    <div className="rounded-[28px] border border-(--app-border) bg-(--app-surface-muted) p-5 backdrop-blur">
      <div className="mb-4 text-lg font-semibold text-(--app-text)">
        {contractContext ? `Contract files summary` : `Storage summary`}
      </div>
      <div className="space-y-4">
        <MetricLine label="Visible on page" value={String(documentsLength)} />
        <MetricLine label={contractContext ? `Total contract files` : `Total files`} value={String(total)} />
        <MetricLine label="Compliance docs" value={String(complianceCount)} />
        <MetricLine label="Payment docs" value={String(paymentCount)} />
        <MetricLine label="Contracts" value={String(contractsCount)} />
        {contractContext ? (
          <MetricLine label="Draft payments in scope" value={String(contractContext.draftPaymentRequestIds.length)} />
        ) : null}
      </div>
    </div>
  );
}
