import Link from 'next/link';
import { type ReactElement, type ReactNode } from 'react';

import { cn } from '@remoola/ui';

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

export type ActionControlProps = LinkProps | ButtonProps;

const disabledClass = `cursor-not-allowed opacity-50 pointer-events-none`;

type ActionControlBaseProps = ActionControlProps & {
  baseClassName: string;
};

export function ActionControl(props: ActionControlBaseProps): ReactElement {
  if (`href` in props && props.href !== undefined) {
    const { href, children, className, ariaLabel, ariaDisabled, title, baseClassName } = props;
    return (
      <Link
        href={href}
        className={cn(baseClassName, ariaDisabled ? disabledClass : ``, className)}
        aria-label={ariaLabel}
        aria-disabled={ariaDisabled || undefined}
        title={title}
      >
        {children}
      </Link>
    );
  }
  const { type = `button`, disabled, ariaDisabled, children, className, ariaLabel, title, baseClassName } = props;
  return (
    <button
      type={type}
      disabled={disabled}
      aria-disabled={ariaDisabled || undefined}
      aria-label={ariaLabel}
      title={title}
      className={cn(baseClassName, disabled || ariaDisabled ? disabledClass : ``, className)}
    >
      {children}
    </button>
  );
}
