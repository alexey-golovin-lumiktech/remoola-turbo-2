import { type ReactElement, type ReactNode } from 'react';

import { cn } from '@remoola/ui';

import { panelClass, panelDescriptionClass, panelHeaderClass, panelHeaderCopyClass } from './ui-classes';

export type PanelProps = {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function Panel({ title, description, actions, children, className }: PanelProps): ReactElement {
  const hasHeader = Boolean(title) || Boolean(description) || Boolean(actions);
  const hasBody = Boolean(children);

  return (
    <section className={cn(panelClass, className)}>
      {hasHeader ? (
        <div className={panelHeaderClass}>
          <div className={panelHeaderCopyClass}>
            {title ? <h2 className="text-base font-semibold text-text">{title}</h2> : null}
            {description ? <p className={panelDescriptionClass}>{description}</p> : null}
          </div>
          {actions ?? null}
        </div>
      ) : null}
      {hasBody ? <div className="min-w-0">{children}</div> : null}
    </section>
  );
}
