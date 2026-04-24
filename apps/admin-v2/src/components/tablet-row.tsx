import { type ReactElement, type ReactNode } from 'react';

import { cn } from '@remoola/ui';

export type TabletRowProps = {
  primary: ReactNode;
  cells: ReactNode[];
};

const MAX_CELLS = 4;

export function TabletRow({ primary, cells }: TabletRowProps): ReactElement {
  const padded: ReactNode[] = [];
  for (let index = 0; index < MAX_CELLS; index += 1) {
    padded.push(cells[index] ?? null);
  }

  return (
    <article className={cn(`rounded-card border border-border bg-panel px-4 py-3 transition hover:border-white/20`)}>
      <div className="min-w-0 text-sm font-medium text-white/95">{primary}</div>
      <div className="mt-3 grid grid-cols-1 gap-3 border-t border-white/8 pt-3 sm:grid-cols-2">
        {padded.map((cell, index) => (
          <div className="min-w-0 text-xs leading-5 text-white/65" key={index}>
            {cell}
          </div>
        ))}
      </div>
    </article>
  );
}
