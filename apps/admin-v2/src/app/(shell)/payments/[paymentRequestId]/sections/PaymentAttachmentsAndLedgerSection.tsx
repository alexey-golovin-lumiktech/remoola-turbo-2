import { ActionGhost } from '../../../../../components/action-ghost';
import { Panel } from '../../../../../components/panel';
import { mutedTextClass, nestedPanelClass, stackClass } from '../../../../../components/ui-classes';
import { getAdminDocumentDownloadHref } from '../../../../../lib/admin-document-download';
import { formatDate } from '../../../../../lib/admin-format';
import { type PaymentPageData } from '../page.loader';

export function PaymentAttachmentsAndLedgerSection({ paymentCase }: { paymentCase: PaymentPageData[`paymentCase`] }) {
  return (
    <section className="detailGrid">
      <Panel title="Attachments / documents">
        <div className={stackClass}>
          {paymentCase.attachments.length === 0 ? <p className={mutedTextClass}>No attachments.</p> : null}
          {paymentCase.attachments.map((attachment) => (
            <div className={nestedPanelClass} key={attachment.id}>
              <strong>{attachment.name}</strong>
              <p className={mutedTextClass}>{attachment.mimetype}</p>
              <p className={mutedTextClass}>
                {attachment.size} bytes · {formatDate(attachment.createdAt)}
              </p>
              {attachment.deletedAt ? (
                <p className={mutedTextClass}>Attachment soft-deleted: {formatDate(attachment.deletedAt)}</p>
              ) : null}
              {attachment.resourceDeletedAt ? (
                <p className={mutedTextClass}>Resource soft-deleted: {formatDate(attachment.resourceDeletedAt)}</p>
              ) : null}
              <div className="actionsRow">
                {paymentCase.requester.id ? (
                  <ActionGhost href={`/consumers/${paymentCase.requester.id}`}>Requester documents context</ActionGhost>
                ) : null}
                <a
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-input border border-white/10 bg-white/3 px-3 py-2 text-sm text-white/72 transition hover:border-white/20 hover:bg-white/5 hover:text-white/90"
                  href={getAdminDocumentDownloadHref(attachment.resourceId)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Download
                </a>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Related ledger entries">
        <div className={stackClass}>
          {paymentCase.ledgerEntries.length === 0 ? <p className={mutedTextClass}>No ledger entries.</p> : null}
          {paymentCase.ledgerEntries.map((entry) => (
            <div className={nestedPanelClass} key={entry.id}>
              <strong>{entry.type}</strong>
              <p className={mutedTextClass}>
                {entry.amount} {entry.currencyCode}
              </p>
              <p className={mutedTextClass}>Effective status: {entry.effectiveStatus}</p>
              {entry.deletedAt ? (
                <p className={mutedTextClass}>Ledger entry soft-deleted: {formatDate(entry.deletedAt)}</p>
              ) : null}
              <div className="actionsRow">
                <ActionGhost href={`/ledger/${entry.id}`}>Open ledger case</ActionGhost>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </section>
  );
}
