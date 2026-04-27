import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ActionGhost } from '../../../../components/action-ghost';
import { AdminSurfaceAccessDenied, AdminSurfaceUnavailable } from '../../../../components/admin-surface-state';
import { Panel } from '../../../../components/panel';
import {
  getAdminIdentity,
  getConsumerActionLog,
  getConsumerAuthHistory,
  getConsumerCaseResult,
  getConsumerContracts,
  getConsumerLedgerSummary,
} from '../../../../lib/admin-api.server';
import {
  addConsumerFlagAction,
  createConsumerNoteAction,
  forceLogoutConsumerAction,
  resendConsumerEmailAction,
  removeConsumerFlagAction,
  suspendConsumerAction,
} from '../../../../lib/admin-mutations.server';
import { readReturnTo } from '../../../../lib/navigation-context';

function renderConsumerLabel(email: string | null | undefined, consumerId: string): string {
  return email ?? consumerId;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return `-`;
  return new Date(value).toLocaleString();
}

function formatPreviewValue(value: unknown): string | null {
  if (value == null) {
    return null;
  }
  if (typeof value === `string`) {
    return value;
  }
  if (typeof value === `number` || typeof value === `boolean`) {
    return String(value);
  }
  return null;
}

function formatPreviewLabel(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, `$1 $2`)
    .replaceAll(`_`, ` `)
    .replace(/^\w/, (char) => char.toUpperCase());
}

function buildPreviewEntries(value: Record<string, unknown>, preferredKeys: ReadonlyArray<string>) {
  const preferred = preferredKeys
    .map((key) => {
      const formatted = formatPreviewValue(value[key]);
      return formatted ? { label: formatPreviewLabel(key), value: formatted } : null;
    })
    .filter((entry): entry is { label: string; value: string } => entry !== null);

  if (preferred.length > 0) {
    return preferred;
  }

  return Object.entries(value)
    .map(([key, raw]) => {
      const formatted = formatPreviewValue(raw);
      return formatted ? { label: formatPreviewLabel(key), value: formatted } : null;
    })
    .filter((entry): entry is { label: string; value: string } => entry !== null)
    .slice(0, 4);
}

function renderObject(value: Record<string, unknown> | null, preferredKeys: ReadonlyArray<string> = []) {
  if (!value) return <p className="muted">No data.</p>;

  const previewEntries = buildPreviewEntries(value, preferredKeys);
  const fieldCount = Object.keys(value).length;

  return (
    <div className="flex flex-col gap-3">
      {previewEntries.length > 0 ? (
        <div className={nestedCardClass}>
          <div className="grid gap-2 md:grid-cols-2">
            {previewEntries.map((entry) => (
              <div key={`${entry.label}-${entry.value}`} className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.16em] text-white/40">{entry.label}</div>
                <div className="mt-1 text-sm text-white/88">{entry.value}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <details className={nestedCardClass}>
        <summary className="cursor-pointer text-sm text-white/72">
          View raw record ({fieldCount} field{fieldCount === 1 ? `` : `s`})
        </summary>
        <pre className="mono mt-3 overflow-x-auto">{JSON.stringify(value, null, 2)}</pre>
      </details>
    </div>
  );
}

const nestedCardClass = `rounded-card border border-white/8 bg-white/[0.02] p-4`;

export default async function ConsumerCasePage({
  params,
  searchParams,
}: {
  params: Promise<{ consumerId: string }>;
  searchParams?: Promise<{ from?: string }>;
}) {
  const { consumerId } = await params;
  const resolvedSearchParams = await searchParams;
  const [identity, consumerResult, contracts, ledgerSummary, authHistory, actionLog] = await Promise.all([
    getAdminIdentity(),
    getConsumerCaseResult(consumerId),
    getConsumerContracts({ consumerId, pageSize: 5 }),
    getConsumerLedgerSummary(consumerId),
    getConsumerAuthHistory({ consumerId, pageSize: 5 }),
    getConsumerActionLog({ consumerId, pageSize: 5 }),
  ]);

  if (consumerResult.status === `not_found`) {
    notFound();
  }
  if (consumerResult.status === `forbidden`) {
    return (
      <AdminSurfaceAccessDenied
        title="Consumer case unavailable"
        description="Your admin identity can sign in, but it cannot access this consumer surface."
      />
    );
  }
  if (consumerResult.status === `error`) {
    return (
      <AdminSurfaceUnavailable
        title="Consumer case unavailable"
        description="The consumer case could not be loaded from the backend right now. Retry shortly."
      />
    );
  }
  const consumer = consumerResult.data;

  const ledgerRows = Object.entries(ledgerSummary?.summary ?? consumer.ledgerSummary ?? {});
  const canManageNotes = identity?.capabilities.includes(`consumers.notes`) ?? false;
  const canManageFlags = identity?.capabilities.includes(`consumers.flags`) ?? false;
  const canForceLogout = identity?.capabilities.includes(`consumers.force_logout`) ?? false;
  const canSuspend = identity?.capabilities.includes(`consumers.suspend`) ?? false;
  const canResendEmail = identity?.capabilities.includes(`consumers.email_resend`) ?? false;
  const backToQueueHref = readReturnTo(resolvedSearchParams?.from, `/consumers`);

  return (
    <>
      <Panel
        title={renderConsumerLabel(consumer.email, consumer.id)}
        description={consumer.id}
        actions={
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/35">Queue</span>
              <ActionGhost href={backToQueueHref}>Back to queue</ActionGhost>
              <ActionGhost href={`/verification/${consumer.id}`}>Verification case</ActionGhost>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/35">Audit</span>
              <ActionGhost href={`/audit/consumer-actions?consumerId=${consumer.id}`}>Consumer actions</ActionGhost>
              <ActionGhost href={`/audit/admin-actions?resourceId=${consumer.id}`}>Related admin actions</ActionGhost>
            </div>
          </div>
        }
        surface="primary"
      >
        <p className="muted">
          Consumer case summary for review, identity status, support actions, and cross-links into verification, audit,
          payment methods, and recent payment activity.
        </p>
        <div className="pillRow">
          <span className="pill">{consumer.accountType}</span>
          <span className="pill">{consumer.verificationStatus}</span>
          {consumer.contractorKind ? <span className="pill">{consumer.contractorKind}</span> : null}
          {consumer.suspendedAt ? <span className="pill">Suspended</span> : null}
        </div>
      </Panel>

      <section className="statsGrid">
        <Panel surface="meta">
          <h3>Case summary</h3>
          <p className="muted">Email: {consumer.email ?? `-`}</p>
          <p className="muted">Consumer id: {consumer.id}</p>
          <p className="muted">Account type: {consumer.accountType}</p>
          <p className="muted">Contractor kind: {consumer.contractorKind ?? `-`}</p>
          <p className="muted">Updated: {formatDate(consumer.updatedAt)}</p>
        </Panel>
        <Panel surface="meta">
          <h3>Immediate signals</h3>
          <p className="muted">Verification: {consumer.verificationStatus}</p>
          <p className="muted">Stripe identity: {consumer.stripeIdentityStatus ?? `No Stripe state`}</p>
          <p className="muted">Suspended: {consumer.suspendedAt ? `Yes` : `No`}</p>
          <p className="muted">Flags: {consumer._count.adminFlags}</p>
          <p className="muted">Notes: {consumer._count.adminNotes}</p>
        </Panel>
        <Panel surface="meta">
          <h3>Quick actions</h3>
          <p className="muted">
            Use verification and audit links above for navigation. Sensitive consumer actions stay separated below.
          </p>
          <div className="pillRow">
            {canForceLogout ? <span className="pill">Force logout available</span> : null}
            {canSuspend ? <span className="pill">Suspend available</span> : null}
            {canResendEmail ? <span className="pill">Email resend available</span> : null}
            {!canForceLogout && !canSuspend && !canResendEmail ? (
              <span className="pill">Read-only support tools</span>
            ) : null}
          </div>
        </Panel>
      </section>

      {canForceLogout ? (
        <Panel
          title="Session action"
          description="High-friction session control for active consumer access."
          surface="meta"
        >
          <form action={forceLogoutConsumerAction.bind(null, consumer.id)} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="confirmed" value="false" />
            <label className="field">
              <span>Confirm</span>
              <input type="checkbox" name="confirmed" value="true" required />
            </label>
            <button className="dangerButton" type="submit" name="confirmedSubmit" value="true">
              Force logout
            </button>
          </form>
        </Panel>
      ) : null}

      <section className="statsGrid">
        <article className="panel">
          <h3>Counts</h3>
          <p className="muted">Notes: {consumer._count.adminNotes}</p>
          <p className="muted">Active flags: {consumer._count.adminFlags}</p>
          <p className="muted">Contacts: {consumer._count.contacts}</p>
          <p className="muted">Documents: {consumer._count.consumerResources}</p>
          <p className="muted">Payment methods: {consumer._count.paymentMethods}</p>
          <p className="muted">
            Payment requests: {consumer._count.asPayerPaymentRequests + consumer._count.asRequesterPaymentRequests}
          </p>
          <p className="muted">Ledger entries: {consumer._count.ledgerEntries}</p>
        </article>
        <article className="panel">
          <h3>Verification snapshot</h3>
          <p className="muted">Verified: {String(consumer.verified)}</p>
          <p className="muted">Legal verified: {String(consumer.legalVerified)}</p>
          <p className="muted">Reason: {consumer.verificationReason ?? `-`}</p>
          <p className="muted">Stripe status: {consumer.stripeIdentityStatus ?? `-`}</p>
          <p className="muted">Stripe error code: {consumer.stripeIdentityLastErrorCode ?? `-`}</p>
          <p className="muted">Stripe error: {consumer.stripeIdentityLastErrorReason ?? `-`}</p>
          <p className="muted">Suspended: {consumer.suspendedAt ? `Yes` : `No`}</p>
          <p className="muted">Suspension reason: {consumer.suspensionReason ?? `-`}</p>
        </article>
        <article className="panel">
          <h3>Dates</h3>
          <p className="muted">Created: {formatDate(consumer.createdAt)}</p>
          <p className="muted">Updated: {formatDate(consumer.updatedAt)}</p>
          <p className="muted">Verification updated: {formatDate(consumer.verificationUpdatedAt)}</p>
          <p className="muted">Stripe verified: {formatDate(consumer.stripeIdentityVerifiedAt)}</p>
          <p className="muted">Suspended at: {formatDate(consumer.suspendedAt)}</p>
        </article>
      </section>

      <section className="detailGrid">
        <article className="panel">
          <h2>Personal details</h2>
          {renderObject(consumer.personalDetails, [`firstName`, `lastName`, `legalStatus`, `citizenOf`, `phoneNumber`])}
        </article>
        <article className="panel">
          <h2>Organization details</h2>
          {renderObject(consumer.organizationDetails, [`name`, `consumerRole`, `size`])}
        </article>
        <article className="panel">
          <h2>Address</h2>
          {renderObject(consumer.addressDetails, [`street`, `city`, `state`, `country`, `postalCode`])}
        </article>
      </section>

      <section className="detailGrid">
        <article className="panel">
          <h2>Google profile</h2>
          {renderObject(consumer.googleProfileDetails, [`email`, `name`, `organization`, `emailVerified`])}
        </article>
        <article className="panel">
          <h2>Contacts</h2>
          <div className="formStack">
            {consumer.contacts.length === 0 ? <p className="muted">No contacts.</p> : null}
            {consumer.contacts.map((contact) => (
              <div key={contact.id} className={nestedCardClass}>
                <strong>{contact.name ?? contact.email}</strong>
                <p className="muted">{contact.email}</p>
                <p className="muted">Updated: {formatDate(contact.updatedAt)}</p>
              </div>
            ))}
          </div>
        </article>
        <article className="panel">
          <h2>Ledger summary</h2>
          <div className="formStack">
            {ledgerRows.length === 0 ? <p className="muted">No ledger activity.</p> : null}
            {ledgerRows.map(([currencyCode, summary]) => (
              <div key={currencyCode} className={nestedCardClass}>
                <strong>{currencyCode}</strong>
                <p className="muted">
                  Completed: {summary.completedAmount} ({summary.completedCount})
                </p>
                <p className="muted">
                  Pending: {summary.pendingAmount} ({summary.pendingCount})
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="detailGrid">
        <article className="panel">
          <h2>Consumer support actions</h2>
          <div className="formStack">
            <p className="muted">
              Limited support actions only: suspension and explicit email resend. No general consumer edits.
            </p>
            {canSuspend ? (
              <form action={suspendConsumerAction.bind(null, consumer.id)} className="formStack">
                <label className="field">
                  <span>Suspension reason</span>
                  <textarea
                    name="reason"
                    required
                    maxLength={500}
                    placeholder="Reason shown in audit history and the suspension email."
                  />
                </label>
                <label className="field">
                  <span>Confirm</span>
                  <input type="checkbox" name="confirmed" value="true" required />
                </label>
                <button className="dangerButton" type="submit" name="confirmedSubmit" value="true">
                  Suspend consumer
                </button>
              </form>
            ) : null}

            {canResendEmail ? (
              <>
                <form action={resendConsumerEmailAction.bind(null, consumer.id)} className="formStack">
                  <input type="hidden" name="emailKind" value="signup_verification" />
                  <input type="hidden" name="appScope" value="consumer" />
                  <button className="secondaryButton" type="submit">
                    Resend signup verification email
                  </button>
                </form>
                <form action={resendConsumerEmailAction.bind(null, consumer.id)} className="formStack">
                  <input type="hidden" name="emailKind" value="password_recovery" />
                  <input type="hidden" name="appScope" value="consumer" />
                  <button className="secondaryButton" type="submit">
                    Resend password recovery email
                  </button>
                </form>
              </>
            ) : null}
          </div>
        </article>
        <article className="panel">
          <h2>Add internal note</h2>
          {canManageNotes ? (
            <form action={createConsumerNoteAction.bind(null, consumer.id)} className="formStack">
              <label className="field">
                <span>Content</span>
                <textarea name="content" required placeholder="Investigation note, escalation context, next step..." />
              </label>
              <button className="primaryButton" type="submit">
                Save note
              </button>
            </form>
          ) : (
            <p className="muted">Internal note creation is not available for this admin identity.</p>
          )}
        </article>
        <article className="panel">
          <h2>Add flag</h2>
          {canManageFlags ? (
            <form action={addConsumerFlagAction.bind(null, consumer.id)} className="formStack">
              <label className="field">
                <span>Flag</span>
                <input name="flag" required placeholder="needs_review" />
              </label>
              <label className="field">
                <span>Reason</span>
                <textarea name="reason" placeholder="Why this consumer is flagged" />
              </label>
              <button className="primaryButton" type="submit">
                Add flag
              </button>
            </form>
          ) : (
            <p className="muted">Consumer flag management is not available for this admin identity.</p>
          )}
        </article>
      </section>

      <section className="detailGrid">
        <article className="panel">
          <h2>Active flags</h2>
          <div className="formStack">
            {consumer.adminFlags.length === 0 ? <p className="muted">No active flags.</p> : null}
            {consumer.adminFlags.map((flag) => (
              <div key={flag.id} className={nestedCardClass}>
                <div className="pageHeader">
                  <div>
                    <strong>{flag.flag}</strong>
                    <p className="muted">{flag.reason ?? `No reason`}</p>
                    <p className="muted">
                      Added by {flag.admin.email} at {formatDate(flag.createdAt)}
                    </p>
                  </div>
                  {canManageFlags ? (
                    <form action={removeConsumerFlagAction.bind(null, consumer.id, flag.id)}>
                      <input type="hidden" name="version" value={String(flag.version)} />
                      <button className="dangerButton" type="submit">
                        Remove
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </article>
        <article className="panel">
          <h2>Internal notes</h2>
          <div className="formStack">
            {consumer.adminNotes.length === 0 ? <p className="muted">No notes yet.</p> : null}
            {consumer.adminNotes.map((note) => (
              <div key={note.id} className={nestedCardClass}>
                <p>{note.content}</p>
                <p className="muted">
                  {note.admin.email} · {formatDate(note.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="detailGrid">
        <article className="panel">
          <h2>Contract relationships</h2>
          <div className="formStack">
            {(contracts?.items ?? []).length === 0 ? <p className="muted">No contract relationships found.</p> : null}
            {(contracts?.items ?? []).map((contract) => (
              <div key={contract.id} className={nestedCardClass}>
                <strong>{contract.name || contract.email}</strong>
                <p className="muted">{contract.email}</p>
                <p className="muted">Last status: {contract.lastStatus ?? `-`}</p>
                <p className="muted">Payments: {contract.paymentsCount}</p>
                <p className="muted">Documents: {contract.docs}</p>
              </div>
            ))}
          </div>
        </article>
        <article className="panel">
          <h2>Recent payment requests</h2>
          <div className="formStack">
            {consumer.recentPaymentRequests.length === 0 ? <p className="muted">No payment requests.</p> : null}
            {consumer.recentPaymentRequests.map((paymentRequest) => (
              <div key={paymentRequest.id} className={nestedCardClass}>
                <strong>
                  <Link href={`/payments/${paymentRequest.id}`}>
                    {paymentRequest.amount} {paymentRequest.currencyCode}
                  </Link>
                </strong>
                <p className="muted">{paymentRequest.status}</p>
                <p className="muted">Rail: {paymentRequest.paymentRail ?? `-`}</p>
                <p className="muted">Created: {formatDate(paymentRequest.createdAt)}</p>
              </div>
            ))}
          </div>
        </article>
        <article className="panel">
          <div className="pageHeader">
            <div>
              <h2>Payment methods</h2>
              <p className="muted">Direct link into the payment-method investigation workspace.</p>
            </div>
            <Link className="secondaryButton" href={`/payment-methods?consumerId=${consumer.id}&includeDeleted=true`}>
              Open payment methods
            </Link>
          </div>
          <div className="formStack">
            {consumer.paymentMethods.length === 0 ? <p className="muted">No payment methods.</p> : null}
            {consumer.paymentMethods.map((paymentMethod) => (
              <div key={String(paymentMethod.id)} className={nestedCardClass}>
                <strong>
                  <Link href={`/payment-methods/${paymentMethod.id}`}>
                    {String(paymentMethod.type) === `CREDIT_CARD`
                      ? `${String(paymentMethod.brand ?? `Card`)} •••• ${String(paymentMethod.last4 ?? `----`)}`
                      : `${String(paymentMethod.type)} •••• ${String(paymentMethod.last4 ?? `----`)}`}
                  </Link>
                </strong>
                <p className="muted">Default: {paymentMethod.defaultSelected ? `Yes` : `No`}</p>
                <p className="muted">Status: {paymentMethod.status}</p>
                {paymentMethod.disabledAt ? (
                  <p className="muted">Disabled: {formatDate(paymentMethod.disabledAt)}</p>
                ) : null}
                <p className="muted">Created: {formatDate(String(paymentMethod.createdAt ?? ``))}</p>
                <p className="muted">Updated: {formatDate(String(paymentMethod.updatedAt ?? ``))}</p>
              </div>
            ))}
          </div>
        </article>
        <article className="panel">
          <h2>Documents</h2>
          <div className="formStack">
            {consumer.consumerResources.map((resource) => (
              <div key={resource.id} className={nestedCardClass}>
                <strong>{resource.resource.originalName}</strong>
                <p className="muted">{resource.resource.mimetype}</p>
                <p className="muted">
                  {resource.resource.size} bytes · {formatDate(resource.resource.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="detailGrid">
        <article className="panel">
          <h2>Auth history</h2>
          <div className="formStack">
            {(authHistory?.items ?? []).length === 0 ? <p className="muted">No auth history.</p> : null}
            {(authHistory?.items ?? []).map((event, index) => (
              <div key={String(event.id ?? index)} className={nestedCardClass}>
                <strong>{String(event.event ?? `event`)}</strong>
                <p className="muted">{String(event.email ?? consumer.email)}</p>
                <p className="muted">{formatDate(String(event.createdAt ?? ``))}</p>
              </div>
            ))}
          </div>
        </article>
        <article className="panel">
          <h2>Recent admin actions</h2>
          <div className="formStack">
            {(consumer.recentAdminActions as Array<Record<string, unknown>>).length === 0 ? (
              <p className="muted">No admin actions.</p>
            ) : null}
            {(consumer.recentAdminActions as Array<Record<string, unknown>>).map((event, index) => (
              <div key={String(event.id ?? index)} className={nestedCardClass}>
                <strong>{String(event.action ?? `action`)}</strong>
                <p className="muted">{formatDate(String(event.createdAt ?? ``))}</p>
              </div>
            ))}
          </div>
        </article>
        <article className="panel">
          <h2>Consumer action log</h2>
          <div className="formStack">
            {(actionLog?.items ?? []).length === 0 ? <p className="muted">No consumer actions.</p> : null}
            {(actionLog?.items ?? []).map((event, index) => (
              <div key={String(event.id ?? index)} className={nestedCardClass}>
                <strong>{String(event.action ?? `action`)}</strong>
                <p className="muted">{String(event.resource ?? `-`)}</p>
                <p className="muted">{formatDate(String(event.createdAt ?? ``))}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </>
  );
}
