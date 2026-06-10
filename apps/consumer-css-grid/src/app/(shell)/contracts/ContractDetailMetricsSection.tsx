import { type ContractDetailViewModel } from './contract-detail-model';
import { shellCardSm } from '../../../shared/ui/shell-card-tokens';
import { shellGridDetail3 } from '../../../shared/ui/shell-grid-tokens';

export function ContractDetailMetricsSection({ viewModel }: { viewModel: ContractDetailViewModel }) {
  return (
    <>
      <section className={shellGridDetail3}>
        <div className={shellCardSm}>
          <div className="text-xs uppercase tracking-[0.18em] text-(--app-text-faint)">Payment history</div>
          <div className="mt-3 text-4xl font-semibold tracking-tight text-(--app-text)">
            {viewModel.contract.summary.paymentsCount}
          </div>
          <div className="mt-2 text-sm text-(--app-text-muted)">Requests currently connected to this contractor</div>
        </div>
        <div className={shellCardSm}>
          <div className="text-xs uppercase tracking-[0.18em] text-(--app-text-faint)">Completed</div>
          <div className="mt-3 text-4xl font-semibold tracking-tight text-(--app-success-text)">
            {viewModel.contract.summary.completedPaymentsCount}
          </div>
          <div className="mt-2 text-sm text-(--app-text-muted)">
            Effective completed outcomes inside this relationship
          </div>
        </div>
        <div className={shellCardSm}>
          <div className="text-xs uppercase tracking-[0.18em] text-(--app-text-faint)">Files</div>
          <div className="mt-3 text-4xl font-semibold tracking-tight text-(--app-text)">
            {viewModel.contract.summary.documentsCount}
          </div>
          <div className="mt-2 text-sm text-(--app-text-muted)">
            Documents linked to payment records for this contractor
          </div>
        </div>
      </section>

      <section className={shellGridDetail3}>
        <div className={shellCardSm}>
          <div className="text-xs uppercase tracking-[0.18em] text-(--app-text-faint)">Drafts</div>
          <div className="mt-3 text-3xl font-semibold tracking-tight text-amber-200">
            {viewModel.contract.summary.draftPaymentsCount}
          </div>
          <div className="mt-2 text-sm text-(--app-text-muted)">
            Requester-side drafts still open for this relationship
          </div>
        </div>
        <div className={shellCardSm}>
          <div className="text-xs uppercase tracking-[0.18em] text-(--app-text-faint)">Pending</div>
          <div className="mt-3 text-3xl font-semibold tracking-tight text-(--app-primary)">
            {viewModel.contract.summary.pendingPaymentsCount}
          </div>
          <div className="mt-2 text-sm text-(--app-text-muted)">Payments still waiting for a payer-side action</div>
        </div>
        <div className={shellCardSm}>
          <div className="text-xs uppercase tracking-[0.18em] text-(--app-text-faint)">Waiting</div>
          <div className="mt-3 text-3xl font-semibold tracking-tight text-indigo-200">
            {viewModel.contract.summary.waitingPaymentsCount}
          </div>
          <div className="mt-2 text-sm text-(--app-text-muted)">
            In-flight settlements already moving through the rail
          </div>
        </div>
      </section>
    </>
  );
}
