import Link from 'next/link';

import { buildContractDetailViewModel } from './contract-detail-model';
import { ContractDetailSections } from './contract-detail-sections';
import {
  buildContractFilesWorkspaceHref,
  buildContractPaymentDetailHref,
  buildContractPaymentFlowContext,
} from './contract-workflow-actions';
import { ContractInlineActionsClient } from './ContractInlineActionsClient';
import { type ContractDetailsResponse } from '../../../lib/consumer-api.server';
import { Panel } from '../../../shared/ui/shell-panel';

type Props = {
  contract: ContractDetailsResponse | null;
  contractId: string;
  returnToContractsHref?: string;
};

export function ContractDetailView({ contract, contractId, returnToContractsHref = `/contracts` }: Props) {
  if (!contract) {
    return (
      <Panel title="Contract workspace">
        <div className="space-y-4">
          <div className="rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-10 text-center text-sm text-(--app-text-muted)">
            Contract details are unavailable for this relationship.
          </div>
          <Link
            href={returnToContractsHref}
            className="inline-flex text-sm text-(--app-primary) hover:text-(--app-primary-strong)"
          >
            Back to contracts
          </Link>
        </div>
      </Panel>
    );
  }

  const viewModel = buildContractDetailViewModel(contract, contractId, returnToContractsHref);
  const inlineActions = viewModel.operatingPayment ? (
    <ContractInlineActionsClient
      paymentRequestId={viewModel.operatingPayment.id}
      status={viewModel.operatingPayment.status}
      role={viewModel.operatingPayment.role}
      paymentRail={viewModel.operatingPayment.paymentRail}
      paymentDetailHref={buildContractPaymentDetailHref(
        viewModel.operatingPayment.id,
        contractId,
        returnToContractsHref,
      )}
      filesHref={buildContractFilesWorkspaceHref(contractId, returnToContractsHref)}
      paymentFlowContext={buildContractPaymentFlowContext(contractId, returnToContractsHref)}
    />
  ) : null;

  return (
    <div className="space-y-5">
      <div className="mb-1">
        <Link href={returnToContractsHref} className="text-sm text-(--app-primary) hover:text-(--app-primary-strong)">
          Back to contracts
        </Link>
      </div>

      <ContractDetailSections
        inlineActions={inlineActions}
        returnToContractsHref={returnToContractsHref}
        viewModel={viewModel}
      />
    </div>
  );
}
