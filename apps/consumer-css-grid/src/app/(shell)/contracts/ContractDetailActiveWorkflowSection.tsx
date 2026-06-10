import Link from 'next/link';
import { type ReactNode } from 'react';

import { type ContractDetailViewModel } from './contract-detail-model';
import { DocumentIcon } from '../../../shared/ui/icons/DocumentIcon';
import { UsersIcon } from '../../../shared/ui/icons/UsersIcon';
import { Panel } from '../../../shared/ui/shell-panel';

export function ContractDetailActiveWorkflowSection({
  inlineActions,
  viewModel,
}: {
  inlineActions?: ReactNode;
  viewModel: ContractDetailViewModel;
}) {
  return (
    <Panel title="Active workflow" aside={viewModel.operatingPayment ? viewModel.summaryStatusLabel : `No activity`}>
      <div className="space-y-4">
        <div className="rounded-2xl border border-(--app-primary-soft) bg-(--app-primary-soft) px-4 py-3 text-sm text-(--app-primary)">
          {viewModel.activeWorkflow.title}
        </div>
        <div className="text-sm text-(--app-text-soft)">{viewModel.activeWorkflow.detail}</div>
        <Link
          href={viewModel.activeWorkflow.primaryAction.href}
          className="flex items-center gap-3 rounded-2xl border border-(--app-primary)/20 bg-(--app-primary-soft) px-4 py-3 text-sm text-(--app-primary) transition hover:opacity-90"
        >
          <DocumentIcon className="h-5 w-5 text-(--app-primary)" />
          {viewModel.activeWorkflow.primaryAction.label}
        </Link>
        {inlineActions}
        <div className="grid grid-cols-1 gap-3">
          {viewModel.activeWorkflowSecondaryActions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="flex items-center gap-3 rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-sm text-(--app-text-soft) transition hover:border-(--app-border-strong) hover:bg-(--app-surface-muted)"
            >
              {action.label.includes(`contact`) ? (
                <UsersIcon className="h-5 w-5 text-(--app-primary)" />
              ) : (
                <DocumentIcon className="h-5 w-5 text-(--app-primary)" />
              )}
              {action.label}
            </Link>
          ))}
        </div>
      </div>
    </Panel>
  );
}
