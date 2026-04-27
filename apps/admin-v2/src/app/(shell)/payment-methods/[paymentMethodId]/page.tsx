import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ActionGhost } from '../../../../components/action-ghost';
import { AdminSurfaceAccessDenied, AdminSurfaceUnavailable } from '../../../../components/admin-surface-state';
import { ContextStat } from '../../../../components/context-stat';
import { Panel } from '../../../../components/panel';
import {
  nestedPanelClass,
  operatorFormActionsClass,
  operatorFormClass,
  operatorFormConfirmClass,
  operatorFormFieldsClass,
  operatorFormFullWidthCtaClass,
  operatorFormIntroClass,
  operatorFormSecondaryClass,
  operatorFormSectionClass,
} from '../../../../components/ui-classes';
import { WorkspaceLayout } from '../../../../components/workspace-layout';
import { getAdminIdentity, getPaymentMethodCaseResult } from '../../../../lib/admin-api.server';
import {
  disablePaymentMethodAction,
  escalateDuplicatePaymentMethodAction,
  removeDefaultPaymentMethodAction,
} from '../../../../lib/admin-mutations.server';
import { readReturnTo } from '../../../../lib/navigation-context';

function formatDate(value: string | null | undefined): string {
  if (!value) return `-`;
  return new Date(value).toLocaleString();
}

function renderMethodLabel(paymentMethod: {
  type: string;
  brand: string | null;
  last4: string | null;
  bankLast4: string | null;
}) {
  const suffix = paymentMethod.last4 ?? paymentMethod.bankLast4 ?? `----`;
  if (paymentMethod.type === `CREDIT_CARD`) {
    return `${paymentMethod.brand ?? `Card`} •••• ${suffix}`;
  }

  return `${paymentMethod.type} •••• ${suffix}`;
}

export default async function PaymentMethodCasePage({
  params,
  searchParams,
}: {
  params: Promise<{ paymentMethodId: string }>;
  searchParams?: Promise<{ from?: string }>;
}) {
  const { paymentMethodId } = await params;
  const resolvedSearchParams = await searchParams;
  const [identity, paymentMethodResult] = await Promise.all([
    getAdminIdentity(),
    getPaymentMethodCaseResult(paymentMethodId),
  ]);

  if (paymentMethodResult.status === `not_found`) {
    notFound();
  }
  if (paymentMethodResult.status === `forbidden`) {
    return (
      <AdminSurfaceAccessDenied
        title="Payment method unavailable"
        description="Your admin identity can sign in, but it cannot access this payment-method surface."
      />
    );
  }
  if (paymentMethodResult.status === `error`) {
    return (
      <AdminSurfaceUnavailable
        title="Payment method unavailable"
        description="The payment-method case could not be loaded from the backend right now. Retry shortly."
      />
    );
  }
  const paymentMethod = paymentMethodResult.data;

  const canManage = identity?.capabilities.includes(`payment_methods.manage`) ?? false;
  const fingerprintHref = paymentMethod.stripeFingerprint
    ? `/payment-methods?fingerprint=${encodeURIComponent(paymentMethod.stripeFingerprint)}&includeDeleted=true`
    : null;
  const backToQueueHref = readReturnTo(resolvedSearchParams?.from, `/payment-methods`);
  const context = (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        <ContextStat
          label="Status"
          value={paymentMethod.status}
          tone={paymentMethod.status === `DISABLED` ? `rose` : `cyan`}
        />
        <ContextStat label="Default selected" value={paymentMethod.defaultSelected ? `Yes` : `No`} />
        <ContextStat
          label="Fingerprint duplicates"
          value={paymentMethod.fingerprintDuplicates.length}
          tone={paymentMethod.fingerprintDuplicates.length > 0 ? `amber` : `neutral`}
        />
        <ContextStat
          label="Deleted"
          value={paymentMethod.deletedAt ? `Yes` : `No`}
          tone={paymentMethod.deletedAt ? `rose` : `neutral`}
        />
      </div>
      <div className="contextRailSection">
        <h4>Quick links</h4>
        <div className="contextRailLinks">
          <ActionGhost href={backToQueueHref}>Back to queue</ActionGhost>
          <ActionGhost href={`/consumers/${paymentMethod.consumer.id}`}>Consumer case</ActionGhost>
          <ActionGhost href={`/payment-methods?consumerId=${paymentMethod.consumer.id}&includeDeleted=true`}>
            Consumer methods
          </ActionGhost>
          {fingerprintHref ? <ActionGhost href={fingerprintHref}>Fingerprint cohort</ActionGhost> : null}
        </div>
      </div>
    </>
  );

  return (
    <WorkspaceLayout
      workspace="payment-method-case"
      context={context}
      contextTitle="Method snapshot"
      contextDescription="Operational status, duplicate fingerprint posture, and shortcut links for the current method."
    >
      <>
        <Panel
          eyebrow="Payment method"
          title="Payment Method"
          description={renderMethodLabel(paymentMethod)}
          actions={
            <div className="flex flex-wrap gap-2">
              <ActionGhost href={backToQueueHref}>Back to queue</ActionGhost>
              <ActionGhost href={`/consumers/${paymentMethod.consumer.id}`}>Consumer case</ActionGhost>
              <ActionGhost href={`/payment-methods?consumerId=${paymentMethod.consumer.id}&includeDeleted=true`}>
                Consumer payment methods
              </ActionGhost>
              {fingerprintHref ? <ActionGhost href={fingerprintHref}>Fingerprint cohort</ActionGhost> : null}
            </div>
          }
          surface="primary"
        >
          <p className="muted mono">{paymentMethod.id}</p>
          <div className="pillRow">
            <span className="pill">{paymentMethod.type}</span>
            <span className="pill">{paymentMethod.status}</span>
            {paymentMethod.defaultSelected ? <span className="pill">Default selected</span> : null}
            {paymentMethod.stripeFingerprint ? <span className="pill">Fingerprint present</span> : null}
            {paymentMethod.duplicateEscalation ? <span className="pill">Duplicate escalated</span> : null}
            {paymentMethod.disabledAt ? <span className="pill">Disabled</span> : null}
            {paymentMethod.deletedAt ? <span className="pill">Soft-deleted method</span> : null}
          </div>
        </Panel>

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

        {canManage ? (
          <section className="detailGrid">
            {paymentMethod.deletedAt ? (
              <article className="panel">
                <h2>Payment method actions</h2>
                <p className="muted">
                  Soft-deleted methods stay investigation-only. Management actions are not available.
                </p>
              </article>
            ) : null}

            {!paymentMethod.deletedAt && paymentMethod.status !== `DISABLED` ? (
              <article className="panel">
                <h2>Disable</h2>
                <form action={disablePaymentMethodAction.bind(null, paymentMethod.id)} className={operatorFormClass}>
                  <input type="hidden" name="version" value={String(paymentMethod.version)} />
                  <input type="hidden" name="consumerId" value={paymentMethod.consumer.id} />
                  <input type="hidden" name="confirmed" value="false" />
                  <div className={operatorFormSectionClass}>
                    <div className={operatorFormIntroClass}>
                      <p className="text-sm font-medium text-white/90">Disable method</p>
                      <p className="muted">Mandatory reason is recorded for audit and future operator review.</p>
                    </div>
                    <div className={operatorFormFieldsClass}>
                      <label className="field">
                        <span>Reason</span>
                        <textarea
                          name="reason"
                          required
                          maxLength={500}
                          placeholder="Mandatory disable reason for audit."
                        />
                      </label>
                    </div>
                    {paymentMethod.defaultSelected ? (
                      <div className={operatorFormSecondaryClass}>
                        <p className="muted">
                          This action also clears the default marker on the same method. A disabled method cannot remain
                          the default destination.
                        </p>
                      </div>
                    ) : null}
                    <div className={operatorFormConfirmClass}>
                      <label className="field">
                        <span>Confirmation</span>
                        <input type="checkbox" name="confirmed" value="true" required />
                      </label>
                    </div>
                    <div className={operatorFormActionsClass}>
                      <button
                        className={`dangerButton ${operatorFormFullWidthCtaClass}`}
                        type="submit"
                        name="confirmedSubmit"
                        value="true"
                      >
                        Disable payment method
                      </button>
                    </div>
                  </div>
                </form>
              </article>
            ) : null}

            {!paymentMethod.deletedAt && paymentMethod.defaultSelected ? (
              <article className="panel">
                <h2>Remove default</h2>
                <form
                  action={removeDefaultPaymentMethodAction.bind(null, paymentMethod.id)}
                  className={operatorFormClass}
                >
                  <input type="hidden" name="version" value={String(paymentMethod.version)} />
                  <input type="hidden" name="consumerId" value={paymentMethod.consumer.id} />
                  <div className={operatorFormSectionClass}>
                    <div className={operatorFormIntroClass}>
                      <p className="text-sm font-medium text-white/90">Remove default marker</p>
                      <p className="muted">
                        Clears only the default marker. No other payment-method fields are changed.
                      </p>
                    </div>
                    <div className={operatorFormActionsClass}>
                      <button className={`secondaryButton ${operatorFormFullWidthCtaClass}`} type="submit">
                        Remove default marker
                      </button>
                    </div>
                  </div>
                </form>
              </article>
            ) : null}

            {!paymentMethod.deletedAt &&
            paymentMethod.stripeFingerprint &&
            paymentMethod.fingerprintDuplicates.length > 0 &&
            !paymentMethod.duplicateEscalation ? (
              <article className="panel">
                <h2>Duplicate escalation</h2>
                <form
                  action={escalateDuplicatePaymentMethodAction.bind(null, paymentMethod.id)}
                  className={operatorFormClass}
                >
                  <input type="hidden" name="version" value={String(paymentMethod.version)} />
                  <input type="hidden" name="consumerId" value={paymentMethod.consumer.id} />
                  <div className={operatorFormSectionClass}>
                    <div className={operatorFormIntroClass}>
                      <p className="text-sm font-medium text-white/90">Escalate fingerprint cohort</p>
                      <p className="muted">
                        Creates one durable duplicate-escalation record for this method and fingerprint cohort.
                      </p>
                    </div>
                    <div className={operatorFormActionsClass}>
                      <button className={`secondaryButton ${operatorFormFullWidthCtaClass}`} type="submit">
                        Escalate duplicate fingerprint
                      </button>
                    </div>
                  </div>
                </form>
              </article>
            ) : null}
          </section>
        ) : null}

        {paymentMethod.duplicateEscalation ? (
          <section className="panel">
            <div className="pageHeader">
              <div>
                <h2>Duplicate escalation record</h2>
                <p className="muted">Durable schema-backed record for the fingerprint escalation action.</p>
              </div>
            </div>
            <div className="formStack">
              <p className="muted">Fingerprint: {paymentMethod.duplicateEscalation.fingerprint}</p>
              <p className="muted">Duplicate count snapshot: {paymentMethod.duplicateEscalation.duplicateCount}</p>
              <p className="muted">
                Escalated by:{` `}
                {paymentMethod.duplicateEscalation.escalatedBy.email ??
                  paymentMethod.duplicateEscalation.escalatedBy.id}
              </p>
              <p className="muted">Created: {formatDate(paymentMethod.duplicateEscalation.createdAt)}</p>
            </div>
          </section>
        ) : null}

        <section className="panel">
          <div className="pageHeader">
            <div>
              <h2>Fingerprint duplicates</h2>
              <p className="muted">
                This view is shown only when the current method has a schema-backed fingerprint. No usage semantics are
                inferred here.
              </p>
            </div>
          </div>
          <div className="formStack">
            {paymentMethod.fingerprintDuplicates.length === 0 ? (
              <p className="muted">No other payment methods share this fingerprint.</p>
            ) : null}
            {paymentMethod.fingerprintDuplicates.map((duplicate) => (
              <div className={nestedPanelClass} key={duplicate.id}>
                <strong>{renderMethodLabel(duplicate)}</strong>
                <p className="muted">{duplicate.consumer.email ?? duplicate.consumer.id}</p>
                <p className="muted mono">{duplicate.id}</p>
                <p className="muted">Default selected: {duplicate.defaultSelected ? `Yes` : `No`}</p>
                <p className="muted">Deleted: {formatDate(duplicate.deletedAt)}</p>
                <p className="muted">Created: {formatDate(duplicate.createdAt)}</p>
                <div className="actionsRow">
                  <Link className="secondaryButton" href={`/payment-methods/${duplicate.id}`}>
                    Open method
                  </Link>
                  <Link className="secondaryButton" href={`/consumers/${duplicate.consumer.id}`}>
                    Open consumer
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      </>
    </WorkspaceLayout>
  );
}
