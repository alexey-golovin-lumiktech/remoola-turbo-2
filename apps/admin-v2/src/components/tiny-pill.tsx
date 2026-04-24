import { type ReactElement, type ReactNode } from 'react';

import { cn } from '@remoola/ui';

import { type StatusPillTone } from './status-pill';
import { pillBaseClass, pillDenseClass, toneClassByTone } from './ui-classes';

export type TinyPillProps = {
  children: ReactNode;
  tone?: StatusPillTone;
  className?: string;
};

export function TinyPill({ children, tone = `neutral`, className }: TinyPillProps): ReactElement {
  return <span className={cn(pillBaseClass, pillDenseClass, toneClassByTone[tone], className)}>{children}</span>;
}
