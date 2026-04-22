import type { StatusPillTone } from './status-pill';
import type { ReactElement, ReactNode } from 'react';

export type TinyPillProps = {
  children: ReactNode;
  tone?: StatusPillTone;
  className?: string;
};

export function TinyPill({ children, tone = `neutral`, className }: TinyPillProps): ReactElement {
  const composedClassName = className ? `pill ${className}` : `pill`;

  return (
    <span className={composedClassName} data-tone={tone} data-density="tight">
      {children}
    </span>
  );
}
