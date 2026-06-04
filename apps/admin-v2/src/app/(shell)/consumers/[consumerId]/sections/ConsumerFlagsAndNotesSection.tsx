import { formatDate } from '../../../../../lib/admin-format';
import { RemoveConsumerFlagButton } from '../forms/RemoveConsumerFlagButton';
import { type ConsumerPageData } from '../page.loader';
import { type ConsumerPagePermissions } from '../page.permissions';
import { nestedCardClass } from '../preview-helpers';

export function ConsumerFlagsAndNotesSection({
  consumer,
  permissions,
}: {
  consumer: ConsumerPageData[`consumer`];
  permissions: ConsumerPagePermissions;
}) {
  const { canManageFlags } = permissions;
  return (
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
                  <RemoveConsumerFlagButton consumerId={consumer.id} flagId={flag.id} version={flag.version} />
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
  );
}
