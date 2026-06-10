import { type ContractDetailViewModel } from './contract-detail-model';
import { StatusPill } from '../../../shared/ui/shell-indicators';

export function ContractDetailHeaderSection({ viewModel }: { viewModel: ContractDetailViewModel }) {
  return (
    <section className="rounded-[28px] border border-(--app-border) bg-(--app-card-gradient) p-5 shadow-(--app-shadow)">
      <div className="grid grid-cols-[auto_1fr] gap-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-[26px] bg-(--app-primary) shadow-(--app-shadow)">
          <span className="text-2xl font-semibold text-(--app-primary-contrast)">{viewModel.initials}</span>
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-3xl font-semibold tracking-tight text-(--app-text)">{viewModel.contractTitle}</h2>
            <StatusPill status={viewModel.summaryStatusLabel} />
          </div>
          <div className="mt-2 text-sm text-(--app-text-muted)">
            Dedicated contract workspace powered by a contract-scoped backend details model rather than the old
            contact-centric details endpoint.
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3">
              <div className="text-xs uppercase tracking-[0.18em] text-(--app-text-faint)">Contractor</div>
              <div className="mt-2 break-all text-sm text-(--app-primary)">{viewModel.emailLabel}</div>
            </div>
            <div className="rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3">
              <div className="text-xs uppercase tracking-[0.18em] text-(--app-text-faint)">Relationship summary</div>
              <div className="mt-2 text-sm text-(--app-text-soft)">{viewModel.relationshipSummaryLabel}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
