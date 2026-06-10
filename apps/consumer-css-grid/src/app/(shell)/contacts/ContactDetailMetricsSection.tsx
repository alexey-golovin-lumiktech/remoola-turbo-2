import { shellCardSm } from '../../../shared/ui/shell-card-tokens';
import { shellGridDetail3 } from '../../../shared/ui/shell-grid-tokens';

export function ContactDetailMetricsSection({
  completedPayments,
  totalDocuments,
  totalPayments,
}: {
  completedPayments: number;
  totalDocuments: number;
  totalPayments: number;
}) {
  return (
    <section className={shellGridDetail3}>
      <div className={shellCardSm}>
        <div className="text-xs uppercase tracking-[0.18em] text-(--app-text-faint)">Matching payments</div>
        <div className="mt-3 text-4xl font-semibold tracking-tight text-(--app-text)">{totalPayments}</div>
        <div className="mt-2 text-sm text-(--app-text-muted)">
          Records where this email appears as payer or requester
        </div>
      </div>
      <div className={shellCardSm}>
        <div className="text-xs uppercase tracking-[0.18em] text-(--app-text-faint)">Completed</div>
        <div className="mt-3 text-4xl font-semibold tracking-tight text-(--app-success-text)">{completedPayments}</div>
        <div className="mt-2 text-sm text-(--app-text-muted)">
          Based on the effective status returned by the backend
        </div>
      </div>
      <div className={shellCardSm}>
        <div className="text-xs uppercase tracking-[0.18em] text-(--app-text-faint)">Documents</div>
        <div className="mt-3 text-4xl font-semibold tracking-tight text-(--app-text)">{totalDocuments}</div>
        <div className="mt-2 text-sm text-(--app-text-muted)">Files attached to those matching payment records</div>
      </div>
    </section>
  );
}
