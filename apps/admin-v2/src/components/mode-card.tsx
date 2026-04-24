import { type ReactElement } from 'react';

import { ChecklistItem } from './checklist-item';
import { Panel } from './panel';

export function ModeCard(): ReactElement {
  return (
    <Panel
      title="Responsive dense-surface strategy"
      description="Three render modes per listing surface; the strategy is the same across workspaces."
    >
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-1">
        <ChecklistItem
          icon="check"
          label="Mobile stack"
          description="< 768px - vertical queue cards, tappable rows, single-column reading flow."
          status="ready"
        />
        <ChecklistItem
          icon="check"
          label="Tablet rows"
          description="768-1279px - compact 2-3 col rows with primary metadata inline."
          status="ready"
        />
        <ChecklistItem
          icon="check"
          label="Desktop dense table"
          description=">= 1280px - full table with all columns, pagination, sorting."
          status="ready"
        />
      </ul>
    </Panel>
  );
}
