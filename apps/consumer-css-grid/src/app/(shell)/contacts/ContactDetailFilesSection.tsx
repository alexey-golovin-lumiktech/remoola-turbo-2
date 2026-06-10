import { type ContactDetailsResponse } from '../../../lib/consumer-api.server';
import { DocumentIcon } from '../../../shared/ui/icons/DocumentIcon';
import { shellContainerBase, shellEmptyState } from '../../../shared/ui/shell-card-tokens';
import { Panel } from '../../../shared/ui/shell-panel';

function formatDateTime(value: string | null | undefined) {
  if (!value) return `—`;
  return new Date(value).toLocaleString(`en-US`, {
    year: `numeric`,
    month: `short`,
    day: `2-digit`,
    hour: `2-digit`,
    minute: `2-digit`,
  });
}

export function ContactDetailFilesSection({ contact }: { contact: ContactDetailsResponse }) {
  const totalDocuments = contact.documents.length;

  return (
    <Panel title="Files from matching payment records" aside={`${totalDocuments} total`}>
      {totalDocuments === 0 ? (
        <div className={shellEmptyState}>No files are attached to matching payment records yet.</div>
      ) : (
        <div className="space-y-3">
          {contact.documents.map((document) => (
            <div key={document.id} className={shellContainerBase}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-500/15 text-(--app-primary)">
                      <DocumentIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-medium text-(--app-text)">{document.name}</div>
                      <div className="mt-1 text-xs text-(--app-text-faint)">{document.id}</div>
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-(--app-text-muted)">Added {formatDateTime(document.createdAt)}</div>
                </div>
                <a
                  href={document.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-xl border border-(--app-border) px-3 py-2 text-sm text-(--app-primary) transition hover:border-(--app-border-strong) hover:text-(--app-primary)"
                >
                  Open
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
