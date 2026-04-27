import { type ReactElement, type ReactNode } from 'react';

import { cn } from '@remoola/ui';

import {
  panelClass,
  panelDescriptionClass,
  panelHeaderClass,
  panelHeaderCopyClass,
  panelMetaClass,
  panelPrimaryClass,
  panelSupportClass,
} from './ui-classes';

export type PanelProps = {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  surface?: `primary` | `support` | `meta`;
};

const surfaceClassByTone = {
  primary: panelPrimaryClass,
  support: panelSupportClass,
  meta: panelMetaClass,
} as const;

export function Panel({
  title,
  description,
  actions,
  children,
  className,
  surface = `support`,
}: PanelProps): ReactElement {
  const hasHeader = Boolean(title) || Boolean(description) || Boolean(actions);
  const hasBody = Boolean(children);

  return (
    <section className={cn(panelClass, surfaceClassByTone[surface], `overflow-hidden`, className)}>
      {hasHeader ? (
        <div className={panelHeaderClass}>
          <div className={panelHeaderCopyClass}>
            {title ? (
              <h2 className="text-base font-semibold tracking-[-0.01em] text-text md:text-[1.0625rem]">{title}</h2>
            ) : null}
            {description ? <p className={cn(panelDescriptionClass, `mt-1`)}>{description}</p> : null}
          </div>
          {actions ? <div className="shrink-0 self-start">{actions}</div> : null}
        </div>
      ) : null}
      {hasBody ? <div className="min-w-0">{children}</div> : null}
    </section>
  );
}
