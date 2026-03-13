import { type ReactNode } from 'react';

import { cn } from '@remoola/ui';

import styles from './IconBadge.module.css';

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

const variantClass: Record<IconBadgeVariant, string | undefined> = {
  primary: styles.variantPrimary,
  success: styles.variantSuccess,
  info: styles.variantInfo,
  warning: styles.variantWarning,
  danger: styles.variantDanger,
  secondary: styles.variantSecondary,
};

const variantRingClass: Record<IconBadgeVariant, string | undefined> = {
  primary: styles.ringPrimary,
  success: styles.ringSuccess,
  info: styles.ringInfo,
  warning: styles.ringWarning,
  danger: styles.ringDanger,
  secondary: styles.ringSecondary,
};

const sizeContainerClass: Record<IconBadgeSize, string | undefined> = {
  sm: styles.sizeSm,
  md: styles.sizeMd,
  lg: styles.sizeLg,
};

const sizeIconClass: Record<IconBadgeSize, string | undefined> = {
  sm: styles.iconSm,
  md: styles.iconMd,
  lg: styles.iconLg,
};

const roundedClass: Record<`xl` | `2xl` | `3xl`, string | undefined> = {
  xl: styles.roundedXl,
  '2xl': styles.rounded2xl,
  '3xl': styles.rounded3xl,
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
  return (
    <div
      className={cn(
        styles.root,
        sizeContainerClass[size],
        roundedClass[rounded],
        variantClass[variant],
        hasRing && variantRingClass[variant],
        interactive && styles.rootInteractive,
        className,
      )}
    >
      <div className={sizeIconClass[size]}>{icon}</div>
    </div>
  );
}
