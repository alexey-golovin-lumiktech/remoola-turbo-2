import { cn } from '@remoola/ui';

import styles from './StatusBadge.module.css';

interface StatusBadgeProps {
  status: string;
  variant?: `default` | `success` | `warning` | `error` | `info`;
}

const variantClass = {
  default: styles.default,
  success: styles.success,
  warning: styles.warning,
  error: styles.error,
  info: styles.info,
} as const;

function getVariantForStatus(status: string): keyof typeof variantClass {
  const s = status.toLowerCase();
  if (s.includes(`complete`) || s.includes(`success`) || s.includes(`paid`) || s.includes(`active`)) {
    return `success`;
  }
  if (s.includes(`pending`) || s.includes(`processing`) || s.includes(`review`)) {
    return `warning`;
  }
  if (s.includes(`fail`) || s.includes(`error`) || s.includes(`reject`) || s.includes(`cancel`)) {
    return `error`;
  }
  if (s.includes(`info`) || s.includes(`new`)) {
    return `info`;
  }
  return `default`;
}

export function StatusBadge({ status, variant }: StatusBadgeProps) {
  const appliedVariant = variant ?? getVariantForStatus(status);

  return <span className={cn(styles.base, variantClass[appliedVariant])}>{status}</span>;
}
