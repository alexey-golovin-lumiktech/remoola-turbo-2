import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  getAdminIdentity,
  getConsumerActionLog,
  getConsumerAuthHistory,
  getConsumerCase,
  getConsumerContracts,
  getConsumerLedgerSummary,
} from '../../../../lib/admin-api.server';
import {
  addConsumerFlagAction,
  createConsumerNoteAction,
  forceLogoutConsumerAction,
  removeConsumerFlagAction,
} from '../../../../lib/admin-mutations.server';

function formatDate(value: string | null | undefined): string {
  if (!value) return `-`;
  return new Date(value).toLocaleString();
}

function renderObject(value: Record<string, unknown> | null) {
  if (!value) return <p className="muted">No data.</p>;
  return <pre className="mono">{JSON.stringify(value, null, 2)}</pre>;
}

export default async function ConsumerCasePage({ params }: { params: Promise<{ consumerId: string }> }) {
  const { consumerId } = await params;
  const [identity, consumer, contracts, ledgerSummary, authHistory, actionLog] = await Promise.all([
    getAdminIdentity(),
    getConsumerCase(consumerId),
    getConsumerContracts({ consumerId, pageSize: 5 }),
    getConsumerLedgerSummary(consumerId),
    getConsumerAuthHistory({ consumerId, pageSize: 5 }),
    getConsumerActionLog({ consumerId, pageSize: 5 }),
  ]);

  if (!consumer) {
    notFound();
  }

  const ledgerRows = Object.entries(ledgerSummary?.summary ?? consumer.ledgerSummary ?? {});

  return (
    <>
      <section className="panel pageHeader">
        <div>
          <h1>{consumer.email}</h1>
          <p className="muted mono">{consumer.id}</p>
          <div className="pillRow">
            <span className="pill">{consumer.accountType}</span>
            <span className="pill">{consumer.verificationStatus}</span>
            {consumer.contractorKind ? <span className="pill">{consumer.contractorKind}</span> : null}
          </div>
        </div>
        <div className="actionsRow">
          <Link className="secondaryButton" href={`/verification/${consumer.id}`}>
            Verification case
          </Link>
          <Link className="secondaryButton" href={`/audit/consumer-actions?consumerId=${consumer.id}`}>
            Consumer actions
          </Link>
          <Link className="secondaryButton" href={`/audit/admin-actions?resourceId=${consumer.id}`}>
            Related admin actions
          </Link>
          {identity?.capabilities.includes(`consumers.force_logout`) ? (
            <form action={forceLogoutConsumerAction.bind(null, consumer.id)} className="actionsRow">
              <input type="hidden" name="confirmed" value="false" />
              <label className="field">
                <span>Confirm</span>
                <input type="checkbox" name="confirmed" value="true" required />
              </label>
              <button className="dangerButton" type="submit" name="confirmedSubmit" value="true">
                Force logout
              </button>
            </form>
          ) : null}
        </div>
      </section>

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
        </article>
        <article className="panel">
          <h3>Dates</h3>
          <p className="muted">Created: {formatDate(consumer.createdAt)}</p>
          <p className="muted">Updated: {formatDate(consumer.updatedAt)}</p>
          <p className="muted">Verification updated: {formatDate(consumer.verificationUpdatedAt)}</p>
          <p className="muted">Stripe verified: {formatDate(consumer.stripeIdentityVerifiedAt)}</p>
        </article>
      </section>

      <section className="detailGrid">
        <article className="panel">
          <h2>Personal details</h2>
          {renderObject(consumer.personalDetails)}
        </article>
        <article className="panel">
          <h2>Organization details</h2>
          {renderObject(consumer.organizationDetails)}
        </article>
        <article className="panel">
          <h2>Address</h2>
          {renderObject(consumer.addressDetails)}
        </article>
      </section>

      <section className="detailGrid">
        <article className="panel">
          <h2>Google profile</h2>
          {renderObject(consumer.googleProfileDetails)}
        </article>
        <article className="panel">
          <h2>Contacts</h2>
          <div className="formStack">
            {consumer.contacts.length === 0 ? <p className="muted">No contacts.</p> : null}
            {consumer.contacts.map((contact) => (
              <div key={contact.id} className="panel">
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
              <div key={currencyCode} className="panel">
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
          <h2>Add internal note</h2>
          <form action={createConsumerNoteAction.bind(null, consumer.id)} className="formStack">
            <label className="field">
              <span>Content</span>
              <textarea name="content" required placeholder="Investigation note, escalation context, next step..." />
            </label>
            <button className="primaryButton" type="submit">
              Save note
            </button>
          </form>
        </article>
        <article className="panel">
          <h2>Add flag</h2>
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
        </article>
      </section>

      <section className="detailGrid">
        <article className="panel">
          <h2>Active flags</h2>
          <div className="formStack">
            {consumer.adminFlags.length === 0 ? <p className="muted">No active flags.</p> : null}
            {consumer.adminFlags.map((flag) => (
              <div key={flag.id} className="panel">
                <div className="pageHeader">
                  <div>
                    <strong>{flag.flag}</strong>
                    <p className="muted">{flag.reason ?? `No reason`}</p>
                    <p className="muted">
                      Added by {flag.admin.email} at {formatDate(flag.createdAt)}
                    </p>
                  </div>
                  <form action={removeConsumerFlagAction.bind(null, consumer.id, flag.id)}>
                    <input type="hidden" name="version" value={String(flag.version)} />
                    <button className="dangerButton" type="submit">
                      Remove
                    </button>
                  </form>
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
              <div key={note.id} className="panel">
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
              <div key={contract.id} className="panel">
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
              <div key={paymentRequest.id} className="panel">
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
          <h2>Documents</h2>
          <div className="formStack">
            {consumer.consumerResources.map((resource) => (
              <div key={resource.id} className="panel">
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
              <div key={String(event.id ?? index)} className="panel">
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
              <div key={String(event.id ?? index)} className="panel">
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
              <div key={String(event.id ?? index)} className="panel">
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
