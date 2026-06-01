import { ActionGhost } from '../../../../components/action-ghost';
import { ContextStat } from '../../../../components/context-stat';

export function DocumentsContextRail({
  matched,
  visibleRows,
  activeFilterCount,
  tagOptions,
}: {
  matched: number;
  visibleRows: number;
  activeFilterCount: number;
  tagOptions: number;
}) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        <ContextStat label="Matched" value={matched} tone="cyan" />
        <ContextStat label="Visible rows" value={visibleRows} />
        <ContextStat
          label="Active filters"
          value={activeFilterCount}
          tone={activeFilterCount > 0 ? `amber` : `neutral`}
        />
        <ContextStat label="Tag options" value={tagOptions} />
      </div>
      <div className="contextRailSection">
        <h4>Queue shortcuts</h4>
        <div className="contextRailLinks">
          <ActionGhost href="/documents/tags">Tag management</ActionGhost>
          <ActionGhost href="/verification">Verification queue</ActionGhost>
          <ActionGhost href="/payments">Payments</ActionGhost>
        </div>
      </div>
    </>
  );
}
