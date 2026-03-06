import type { ReactNode } from 'react';

type IconBadgeVariant = `primary` | `success` | `info` | `warning` | `danger` | `secondary`;
type IconBadgeSize = `sm` | `md` | `lg`;

interface IconBadgeProps {
  icon: ReactNode;
  variant?: IconBadgeVariant;
  size?: IconBadgeSize;
  hasRing?: boolean;
  interactive?: boolean;
  rounded?: `xl` | `2xl` | `3xl`;
  className?: string;
}

const variantStyles: Record<IconBadgeVariant, string> = {
  primary: `bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-primary-500/30`,
  success: `bg-gradient-to-br from-green-500 to-green-600 text-white`,
  info: `bg-gradient-to-br from-blue-500 to-blue-600 text-white`,
  warning: `bg-gradient-to-br from-yellow-500 to-yellow-600 text-white`,
  danger: `bg-gradient-to-br from-red-500 to-red-600 text-white`,
  secondary: `bg-gradient-to-br from-slate-500 to-slate-600 text-white`,
};

const variantRingStyles: Record<IconBadgeVariant, string> = {
  primary: `ring-4 ring-primary-50 dark:ring-primary-950`,
  success: `ring-4 ring-green-50 dark:ring-green-950`,
  info: `ring-4 ring-blue-50 dark:ring-blue-950`,
  warning: `ring-4 ring-yellow-50 dark:ring-yellow-950`,
  danger: `ring-4 ring-red-50 dark:ring-red-950`,
  secondary: `ring-4 ring-slate-50 dark:ring-slate-950`,
};

const sizeStyles: Record<IconBadgeSize, { container: string; icon: string }> = {
  sm: { container: `h-10 w-10`, icon: `h-5 w-5` },
  md: { container: `h-12 w-12`, icon: `h-6 w-6` },
  lg: { container: `h-16 w-16`, icon: `h-8 w-8` },
};

const roundedStyles = {
  xl: `rounded-xl`,
  '2xl': `rounded-2xl`,
  '3xl': `rounded-3xl`,
};

export function IconBadge({
  icon,
  variant = `primary`,
  size = `md`,
  hasRing = false,
  interactive = false,
  rounded = `2xl`,
  className = ``,
}: IconBadgeProps) {
  const containerSize = sizeStyles[size].container;
  const roundedClass = roundedStyles[rounded];
  const variantClass = variantStyles[variant];
  const ringClass = hasRing ? variantRingStyles[variant] : ``;
  const interactiveClass = interactive ? `transition-transform duration-200 group-hover:scale-110` : ``;

  return (
    <div
      className={`flex items-center justify-center shadow-lg ${containerSize} ${roundedClass} ${variantClass} ${ringClass} ${interactiveClass} ${className}`}
    >
      <div className={sizeStyles[size].icon}>{icon}</div>
    </div>
  );
}
