import { ActionGhost } from '../../../../../components/action-ghost';
import { Panel } from '../../../../../components/panel';
import { getAdminDocumentDownloadHref } from '../../../../../lib/admin-document-download';
import { type DocumentCasePageData } from '../page.loader';

export function DocumentHeaderPanel({
  documentCase,
  backToQueueHref,
}: {
  documentCase: DocumentCasePageData[`documentCase`];
  backToQueueHref: string;
}) {
  return (
    <Panel
      eyebrow="Evidence detail"
      title="Document detail"
      description={documentCase.core.originalName}
      actions={
        <div className="flex flex-wrap gap-2">
          <ActionGhost href={backToQueueHref}>Back to queue</ActionGhost>
          <ActionGhost href="/documents/tags">Tags</ActionGhost>
          <a
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-input border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/72 transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white/90"
            href={getAdminDocumentDownloadHref(documentCase.id)}
            target="_blank"
            rel="noreferrer"
          >
            Secure open
          </a>
        </div>
      }
      surface="primary"
    >
      <p className="muted mono">{documentCase.id}</p>
      <div className="pillRow">
        <span className="pill">{documentCase.core.access}</span>
        <span className="pill">{documentCase.core.mimeType ?? `Unknown MIME`}</span>
        {documentCase.core.deletedAt ? <span className="pill">Soft-deleted</span> : null}
      </div>
    </Panel>
  );
}
