import { type ConsumerPageData } from '../page.loader';
import { formatDate, nestedCardClass } from '../preview-helpers';

export function ConsumerAuditSection({
  consumer,
  authHistory,
  actionLog,
}: {
  consumer: ConsumerPageData[`consumer`];
  authHistory: ConsumerPageData[`authHistory`];
  actionLog: ConsumerPageData[`actionLog`];
}) {
  return (
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
  );
}
