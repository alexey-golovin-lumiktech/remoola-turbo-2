import { type ReactNode } from 'react';

export function Panel({
  title,
  aside,
  children,
  [`data-testid`]: dataTestId,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
  [`data-testid`]?: string;
}) {
  return (
    <section
      data-testid={dataTestId}
      className="rounded-[28px] border border-(--app-border) bg-(--app-surface) p-5 shadow-(--app-shadow)"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-(--app-text)">{title}</h3>
        {aside ? <div className="text-xs text-(--app-text-faint)">{aside}</div> : null}
      </div>
      {children}
    </section>
  );
}
