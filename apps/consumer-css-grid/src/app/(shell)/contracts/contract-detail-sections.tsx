import { type ReactNode } from 'react';

import { type ContractDetailViewModel } from './contract-detail-model';
import { ContractDetailActiveWorkflowSection } from './ContractDetailActiveWorkflowSection';
import { ContractDetailFilesSection } from './ContractDetailFilesSection';
import { ContractDetailHeaderSection } from './ContractDetailHeaderSection';
import { ContractDetailMetricsSection } from './ContractDetailMetricsSection';
import { ContractDetailPaymentHistorySection } from './ContractDetailPaymentHistorySection';
import { ContractDetailRelationshipSummarySection } from './ContractDetailRelationshipSummarySection';
import { ContractDetailTimelineSection } from './ContractDetailTimelineSection';
import { shellMainAsideBalanced } from '../../../shared/ui/shell-layout-tokens';

export function ContractDetailSections({
  inlineActions,
  returnToContractsHref,
  viewModel,
}: {
  inlineActions?: ReactNode;
  returnToContractsHref: string;
  viewModel: ContractDetailViewModel;
}) {
  return (
    <section className={shellMainAsideBalanced}>
      <div className="space-y-5">
        <ContractDetailHeaderSection viewModel={viewModel} />
        <ContractDetailMetricsSection viewModel={viewModel} />
        <ContractDetailTimelineSection viewModel={viewModel} />
        <ContractDetailPaymentHistorySection viewModel={viewModel} />
      </div>

      <div className="space-y-5">
        <ContractDetailRelationshipSummarySection viewModel={viewModel} />
        <ContractDetailFilesSection viewModel={viewModel} returnToContractsHref={returnToContractsHref} />
        <ContractDetailActiveWorkflowSection inlineActions={inlineActions} viewModel={viewModel} />
      </div>
    </section>
  );
}
