import { type ReactElement, type ReactNode } from 'react';

import { cn } from '@remoola/ui';

import {
  panelClass,
  panelDescriptionClass,
  panelEyebrowClass,
  panelHeaderClass,
  panelHeaderCopyClass,
  panelMetaClass,
  panelPrimaryClass,
  panelSupportClass,
} from './ui-classes';

export type PanelProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  bodyClassName?: string;
  surface?: `primary` | `support` | `meta`;
};

const surfaceClassByTone = {
  primary: panelPrimaryClass,
  support: panelSupportClass,
  meta: panelMetaClass,
} as const;

export function Panel({
  eyebrow,
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
  surface = `support`,
}: PanelProps): ReactElement {
  const hasHeader = Boolean(eyebrow) || Boolean(title) || Boolean(description) || Boolean(actions);
  const hasBody = Boolean(children);

  return (
    <section className={cn(panelClass, surfaceClassByTone[surface], `overflow-hidden`, className)}>
      {hasHeader ? (
        <div className={panelHeaderClass}>
          <div className={panelHeaderCopyClass}>
            {eyebrow ? <div className={panelEyebrowClass}>{eyebrow}</div> : null}
            {title ? (
              <h2
                className={cn(
                  `text-base font-semibold tracking-[-0.01em] text-text md:text-[1.0625rem]`,
                  eyebrow ? `mt-1` : ``,
                )}
              >
                {title}
              </h2>
            ) : null}
            {description ? <p className={cn(panelDescriptionClass, `mt-1`)}>{description}</p> : null}
          </div>
          {actions ? <div className="shrink-0 self-start">{actions}</div> : null}
        </div>
      ) : null}
      {hasBody ? <div className={cn(`min-w-0`, bodyClassName)}>{children}</div> : null}
    </section>
  );
}
