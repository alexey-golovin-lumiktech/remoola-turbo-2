import { formatDateTime, EMPTY_VALUE } from '../../../../../lib/admin-format';
import { type ConsumerPageData } from '../page.loader';

export function ConsumerCountsGrid({
  consumer,
  totalPaymentRequests,
}: {
  consumer: ConsumerPageData[`consumer`];
  totalPaymentRequests: number;
}) {
  return (
    <section className="statsGrid">
      <article className="panel">
        <h3>Counts</h3>
        <p className="muted">Notes: {consumer._count.adminNotes}</p>
        <p className="muted">Active flags: {consumer._count.adminFlags}</p>
        <p className="muted">Contacts: {consumer._count.contacts}</p>
        <p className="muted">Documents: {consumer._count.consumerResources}</p>
        <p className="muted">Payment methods: {consumer._count.paymentMethods}</p>
        <p className="muted">Payment requests: {totalPaymentRequests}</p>
        <p className="muted">Ledger entries: {consumer._count.ledgerEntries}</p>
      </article>
      <article className="panel">
        <h3>Verification snapshot</h3>
        <p className="muted">Verified: {String(consumer.verified)}</p>
        <p className="muted">Legal verified: {String(consumer.legalVerified)}</p>
        <p className="muted">Reason: {consumer.verificationReason ?? EMPTY_VALUE}</p>
        <p className="muted">Stripe status: {consumer.stripeIdentityStatus ?? EMPTY_VALUE}</p>
        <p className="muted">Stripe error code: {consumer.stripeIdentityLastErrorCode ?? EMPTY_VALUE}</p>
        <p className="muted">Stripe error: {consumer.stripeIdentityLastErrorReason ?? EMPTY_VALUE}</p>
        <p className="muted">Suspended: {consumer.suspendedAt ? `Yes` : `No`}</p>
        <p className="muted">Suspension reason: {consumer.suspensionReason ?? EMPTY_VALUE}</p>
      </article>
      <article className="panel">
        <h3>Dates</h3>
        <p className="muted">Created: {formatDateTime(consumer.createdAt)}</p>
        <p className="muted">Updated: {formatDateTime(consumer.updatedAt)}</p>
        <p className="muted">Verification updated: {formatDateTime(consumer.verificationUpdatedAt)}</p>
        <p className="muted">Stripe verified: {formatDateTime(consumer.stripeIdentityVerifiedAt)}</p>
        <p className="muted">Suspended at: {formatDateTime(consumer.suspendedAt)}</p>
      </article>
    </section>
  );
}
