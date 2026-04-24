import { type ReactElement, type ReactNode } from 'react';

import { cn } from '@/lib/cn';

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
    <article
      className={cn(
        `condensedRow`,
        `grid grid-cols-[1.1fr_repeat(4,_minmax(0,_1fr))] items-center gap-3 rounded-card border border-border bg-panel px-4 py-3 transition hover:border-white/20`,
      )}
    >
      <div className={cn(`condensedRowPrimary`, `min-w-0 text-sm font-medium text-white/95`)}>{primary}</div>
      {padded.map((cell, index) => (
        <div className={cn(`condensedRowMeta`, `min-w-0 truncate text-xs text-white/65`)} key={index}>
          {cell}
        </div>
      ))}
    </article>
  );
}
