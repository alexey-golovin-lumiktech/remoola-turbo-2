import { type ConsumerPageData } from '../page.loader';
import { formatDate, nestedCardClass, renderObject } from '../preview-helpers';

export function ConsumerProfileGrid({
  consumer,
  ledgerRows,
}: {
  consumer: ConsumerPageData[`consumer`];
  ledgerRows: Array<
    [string, { completedAmount: unknown; completedCount: unknown; pendingAmount: unknown; pendingCount: unknown }]
  >;
}) {
  return (
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
                Completed: {String(summary.completedAmount)} ({String(summary.completedCount)})
              </p>
              <p className="muted">
                Pending: {String(summary.pendingAmount)} ({String(summary.pendingCount)})
              </p>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
