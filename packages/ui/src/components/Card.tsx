import { cn } from '../utils/cn';
import React from 'react';

export type CardProps = React.PropsWithChildren<{
  title?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  headClassName?: string;
  bodyClassName?: string;
}>;

export function Card({ title, actions, children, className, headClassName, bodyClassName }: CardProps) {
  return (
    <div className={cn(`rm-card`, className)}>
      {(title || actions) && (
        <div className={cn(`rm-card__head flex items-center justify-between gap-3`, headClassName)}>
          <div className="text-sm font-semibold text-gray-900">{title}</div>
          {actions}
        </div>
      )}
      <div className={cn(`rm-card__body`, bodyClassName)}>{children}</div>
    </div>
  );
}
