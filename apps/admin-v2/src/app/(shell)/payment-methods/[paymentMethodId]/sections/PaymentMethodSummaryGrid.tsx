import { type PaymentMethodCasePageData } from '../page.loader';
import { formatDate } from '../payment-method-shared';

export function PaymentMethodSummaryGrid({
  paymentMethod,
}: {
  paymentMethod: PaymentMethodCasePageData[`paymentMethod`];
}) {
  return (
    <>
      <section className="statsGrid">
        <article className="panel">
          <h3>Core</h3>
          <p className="muted">Consumer: {paymentMethod.consumer.email ?? paymentMethod.consumer.id}</p>
          <p className="muted">Status: {paymentMethod.status}</p>
          <p className="muted">Default selected: {paymentMethod.defaultSelected ? `Yes` : `No`}</p>
          <p className="muted">Fingerprint: {paymentMethod.stripeFingerprint ?? `-`}</p>
          <p className="muted">Stripe payment method id: {paymentMethod.stripePaymentMethodId ?? `-`}</p>
        </article>
        <article className="panel">
          <h3>Dates</h3>
          <p className="muted">Created: {formatDate(paymentMethod.createdAt)}</p>
          <p className="muted">Updated: {formatDate(paymentMethod.updatedAt)}</p>
          <p className="muted">Disabled: {formatDate(paymentMethod.disabledAt)}</p>
          <p className="muted">Deleted: {formatDate(paymentMethod.deletedAt)}</p>
        </article>
        <article className="panel">
          <h3>Bank / card snapshot</h3>
          <p className="muted">Brand: {paymentMethod.brand ?? `-`}</p>
          <p className="muted">Card last4: {paymentMethod.last4 ?? `-`}</p>
          <p className="muted">Bank last4: {paymentMethod.bankLast4 ?? `-`}</p>
          <p className="muted">Bank country: {paymentMethod.bankCountry ?? `-`}</p>
          <p className="muted">Bank currency: {paymentMethod.bankCurrency ?? `-`}</p>
        </article>
      </section>

      <section className="detailGrid">
        <article className="panel">
          <h2>Detail</h2>
          <div className="formStack">
            <p className="muted">Version: {paymentMethod.version}</p>
            <p className="muted">Disabled by: {paymentMethod.disabledBy ?? `-`}</p>
            <p className="muted">Expiry month: {paymentMethod.expMonth ?? `-`}</p>
            <p className="muted">Expiry year: {paymentMethod.expYear ?? `-`}</p>
            <p className="muted">Bank name: {paymentMethod.bankName ?? `-`}</p>
            <p className="muted">Service fee: {paymentMethod.serviceFee}</p>
          </div>
        </article>

        <article className="panel">
          <h2>Billing details</h2>
          {paymentMethod.billingDetails ? (
            <div className="formStack">
              <p className="muted">Name: {paymentMethod.billingDetails.name ?? `-`}</p>
              <p className="muted">Email: {paymentMethod.billingDetails.email ?? `-`}</p>
              <p className="muted">Phone: {paymentMethod.billingDetails.phone ?? `-`}</p>
              <p className="muted">Deleted: {formatDate(paymentMethod.billingDetails.deletedAt)}</p>
            </div>
          ) : (
            <p className="muted">No billing details linked.</p>
          )}
        </article>
      </section>
    </>
  );
}
