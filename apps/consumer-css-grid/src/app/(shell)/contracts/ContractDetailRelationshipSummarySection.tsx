import { type ContractDetailViewModel } from './contract-detail-model';
import { MetricLine } from '../../../shared/ui/shell-data-display';
import { Panel } from '../../../shared/ui/shell-panel';

export function ContractDetailRelationshipSummarySection({ viewModel }: { viewModel: ContractDetailViewModel }) {
  return (
    <Panel title="Relationship summary">
      <div className="space-y-3">
        <MetricLine label="Contractor email" value={viewModel.emailLabel} />
        <MetricLine label="Address" value={viewModel.addressLabel} />
        <MetricLine
          label="Latest activity"
          value={
            viewModel.contract.summary.lastActivity
              ? viewModel.relationshipSummaryLabel.replace(`Latest relationship activity `, ``)
              : `—`
          }
        />
        <MetricLine label="Relationship status" value={viewModel.summaryStatusLabel} />
        <MetricLine label="Latest payment" value={viewModel.latestPaymentLabel} />
        <MetricLine label="Files linked" value={`${viewModel.contract.summary.documentsCount}`} />
      </div>
      <div className="mt-4 rounded-2xl border border-(--app-primary-soft) bg-(--app-primary-soft) px-4 py-3 text-sm text-(--app-primary)">
        <div className="font-medium">{viewModel.readiness.label}</div>
        <div className="mt-1 text-blue-100/80">{viewModel.readiness.description}</div>
      </div>
    </Panel>
  );
}
