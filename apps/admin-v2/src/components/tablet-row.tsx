import { type ReactElement, type ReactNode } from 'react';

import { cn } from '@remoola/ui';

export type TabletRowProps = {
  eyebrow?: ReactNode;
  primary: ReactNode;
  badges?: ReactNode;
  cells: ReactNode[];
};

const MAX_CELLS = 4;

export function TabletRow({ eyebrow, primary, badges, cells }: TabletRowProps): ReactElement {
  const padded: ReactNode[] = [];
  for (let index = 0; index < MAX_CELLS; index += 1) {
    padded.push(cells[index] ?? null);
  }

  return (
    <article
      className={cn(
        `rounded-card border border-border bg-linear-to-br from-panel via-panel to-white/[0.015] px-4 py-3 shadow-[0_16px_40px_rgba(2,6,23,0.16)] transition hover:-translate-y-px hover:border-white/18`,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/40">{eyebrow}</div>
        ) : null}
        <div className="mt-1 break-words text-sm font-medium text-white/95">{primary}</div>
        {badges ? <div className="mt-2 flex flex-wrap items-center gap-1.5">{badges}</div> : null}
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 border-t border-white/8 pt-3 sm:grid-cols-2">
        {padded.map((cell, index) => (
          <div
            className="min-w-0 rounded-2xl border border-white/6 bg-white/[0.025] p-3 text-xs leading-5 text-white/65"
            key={index}
          >
            {cell}
          </div>
        ))}
      </div>
    </article>
  );
}
