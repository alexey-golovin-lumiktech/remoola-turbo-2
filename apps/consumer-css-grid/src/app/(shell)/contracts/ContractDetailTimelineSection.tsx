import Link from 'next/link';

import { type ContractDetailViewModel } from './contract-detail-model';
import { shellContainerBase, shellEmptyState } from '../../../shared/ui/shell-card-tokens';
import { StatusPill } from '../../../shared/ui/shell-indicators';
import { Panel } from '../../../shared/ui/shell-panel';

export function ContractDetailTimelineSection({ viewModel }: { viewModel: ContractDetailViewModel }) {
  return (
    <Panel title="Relationship timeline" aside={`${viewModel.timelineCount} visible`}>
      {viewModel.timelineCount === 0 ? (
        <div className={shellEmptyState}>No relationship events yet.</div>
      ) : (
        <div className="space-y-3">
          {viewModel.timeline.map((event) => (
            <div key={event.id} className={shellContainerBase}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-medium text-(--app-text)">{event.title}</div>
                    {event.statusLabel ? <StatusPill status={event.statusLabel} /> : null}
                  </div>
                  <div className="mt-2 text-sm text-(--app-text-muted)">{event.detail}</div>
                </div>
                <div className="text-sm text-(--app-text-muted)">{event.createdAtLabel}</div>
              </div>
              {event.href ? (
                <div className="mt-3">
                  <Link
                    href={event.href}
                    className="text-sm text-(--app-primary) transition hover:text-(--app-primary)"
                  >
                    Open related workflow
                  </Link>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
