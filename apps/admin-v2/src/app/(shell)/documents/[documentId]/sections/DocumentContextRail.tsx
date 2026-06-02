import { ActionGhost } from '../../../../../components/action-ghost';
import { ContextStat } from '../../../../../components/context-stat';
import { type DocumentCasePageData } from '../page.loader';

export function DocumentContextRail({
  documentCase,
  backToQueueHref,
}: {
  documentCase: DocumentCasePageData[`documentCase`];
  backToQueueHref: string;
}) {
  const currentAssignment = documentCase.assignment.current;

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        <ContextStat label="Access" value={documentCase.core.access} tone="cyan" />
        <ContextStat label="Tags" value={documentCase.tags.length} />
        <ContextStat label="Linked payments" value={documentCase.linkedPaymentRequests.length} />
        <ContextStat
          label="Assignment"
          value={currentAssignment ? `Assigned` : `Open`}
          tone={currentAssignment ? `cyan` : `neutral`}
        />
      </div>
      <div className="contextRailSection">
        <h4>Quick links</h4>
        <div className="contextRailLinks">
          <ActionGhost href={backToQueueHref}>Back to queue</ActionGhost>
          <ActionGhost href="/documents/tags">Tags</ActionGhost>
          {documentCase.consumer ? (
            <ActionGhost href={`/consumers/${documentCase.consumer.id}`}>Consumer case</ActionGhost>
          ) : null}
        </div>
      </div>
    </>
  );
}
