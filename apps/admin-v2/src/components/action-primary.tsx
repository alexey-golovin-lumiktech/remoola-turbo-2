import Link from 'next/link';
import { type ReactElement, type ReactNode } from 'react';

import { cn } from '@remoola/ui';

import { primaryButtonClass } from './ui-classes';

type CommonProps = {
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
  title?: string;
};

type LinkProps = CommonProps & {
  href: string;
  ariaDisabled?: boolean;
};

type ButtonProps = CommonProps & {
  href?: undefined;
  type?: `button` | `submit` | `reset`;
  disabled?: boolean;
  ariaDisabled?: boolean;
};

const disabledClass = `cursor-not-allowed opacity-50 pointer-events-none`;

export function ActionPrimary(props: LinkProps | ButtonProps): ReactElement {
  if (`href` in props && props.href !== undefined) {
    const { href, children, className, ariaLabel, ariaDisabled, title } = props;
    return (
      <Link
        href={href}
        className={cn(primaryButtonClass, ariaDisabled ? disabledClass : ``, className)}
        aria-label={ariaLabel}
        aria-disabled={ariaDisabled || undefined}
        title={title}
      >
        {children}
      </Link>
    );
  }
  const { type = `button`, disabled, ariaDisabled, children, className, ariaLabel, title } = props;
  return (
    <button
      type={type}
      disabled={disabled}
      aria-disabled={ariaDisabled || undefined}
      aria-label={ariaLabel}
      title={title}
      className={cn(primaryButtonClass, disabled || ariaDisabled ? disabledClass : ``, className)}
    >
      {children}
    </button>
  );
}
