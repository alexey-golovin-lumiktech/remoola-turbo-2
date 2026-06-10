import { ActionCard } from '../../../shared/ui/shell-actions';

export function DashboardActionCardsSection() {
  return (
    <section className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
      <ActionCard
        title="Create Payment Request"
        text="Send an invoice-like request in minutes."
        cta="Create"
        href="/payments/new-request"
      />
      <ActionCard
        title="Start Payment"
        text="Create a one-off payer-side payment without waiting for a request."
        cta="Start"
        href="/payments/start"
      />
      <ActionCard
        title="Review Pending Payments"
        text="Open payer-side pending requests and continue card or bank settlement."
        cta="Review"
        highlight
        href="/payments?role=PAYER&status=PENDING"
      />
    </section>
  );
}
