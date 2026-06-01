import { type DocumentsPageData } from './page.loader';
import { DocumentsContextRail } from './sections/DocumentsContextRail';
import { DocumentsFilters } from './sections/DocumentsFilters';
import { DocumentsListPanel } from './sections/DocumentsListPanel';
import { ActionGhost } from '../../../components/action-ghost';
import { Panel } from '../../../components/panel';
import { TinyPill } from '../../../components/tiny-pill';
import { buttonRowClass } from '../../../components/ui-classes';
import { WorkspaceLayout } from '../../../components/workspace-layout';

export function DocumentsPageView({ data }: { data: DocumentsPageData }) {
  const { params, documents, tags, canManage } = data;
  const { raw, includeDeleted, activeFilterCount } = params;

  return (
    <WorkspaceLayout
      workspace="documents"
      context={
        <DocumentsContextRail
          matched={documents?.total ?? 0}
          visibleRows={documents?.items.length ?? 0}
          activeFilterCount={activeFilterCount}
          tagOptions={tags?.items.length ?? 0}
        />
      }
      contextTitle="Explorer context"
      contextDescription="Current evidence volume, filter pressure, and nearby review workspaces."
    >
      <>
        <Panel
          eyebrow="Evidence explorer"
          title="Documents"
          description="Evidence review boundaries for uploaded resources linked to consumers or payment cases."
          actions={
            <div className={buttonRowClass}>
              <TinyPill tone="cyan">{documents?.total ?? 0} matched</TinyPill>
              <TinyPill>{activeFilterCount > 0 ? `${activeFilterCount} filters active` : `All evidence`}</TinyPill>
              <ActionGhost href="/documents/tags">Tag management</ActionGhost>
            </div>
          }
        >
          <p className="text-sm leading-6 text-white/60">
            This workspace stays investigation-first: no review queues, no storage diagnostics, no generic file
            administration.
          </p>
        </Panel>

        <DocumentsFilters raw={raw} activeFilterCount={activeFilterCount} includeDeleted={includeDeleted} />

        <DocumentsListPanel canManage={canManage} documents={documents} tags={tags} />
      </>
    </WorkspaceLayout>
  );
}
