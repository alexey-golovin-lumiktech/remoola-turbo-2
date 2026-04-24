import Link from 'next/link';
import { type ReactElement, type ReactNode } from 'react';

import { cn } from '@/lib/cn';

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

const baseClass = `inline-flex items-center gap-2 rounded-input border border-cyan-400/30 bg-cyan-500/15 px-3 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/25 hover:text-white`;
const disabledClass = `opacity-50 cursor-not-allowed pointer-events-none`;

export function ActionPrimary(props: LinkProps | ButtonProps): ReactElement {
  if (`href` in props && props.href !== undefined) {
    const { href, children, className, ariaLabel, ariaDisabled, title } = props;
    return (
      <Link
        href={href}
        className={cn(baseClass, ariaDisabled ? disabledClass : ``, className)}
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
      className={cn(baseClass, disabled || ariaDisabled ? disabledClass : ``, className)}
    >
      {children}
    </button>
  );
}
