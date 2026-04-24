import { type ReactElement, type ReactNode } from 'react';

export type PanelProps = {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Panel({ title, description, actions, children, className }: PanelProps): ReactElement {
  const composedClassName = className ? `panel ${className}` : `panel`;
  const hasHeader = Boolean(title) || Boolean(description) || Boolean(actions);

  return (
    <section className={composedClassName}>
      {hasHeader ? (
        <div className="pageHeader">
          <div>
            {title ? <h2>{title}</h2> : null}
            {description ? <p className="muted">{description}</p> : null}
          </div>
          {actions ?? null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
