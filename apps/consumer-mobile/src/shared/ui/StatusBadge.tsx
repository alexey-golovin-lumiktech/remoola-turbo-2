interface StatusBadgeProps {
  status: string;
  variant?: `default` | `success` | `warning` | `error` | `info`;
}

const variantStyles = {
  default: `bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300`,
  success: `bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400`,
  warning: `bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400`,
  error: `bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400`,
  info: `bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400`,
};

function getVariantForStatus(status: string): keyof typeof variantStyles {
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

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variantStyles[appliedVariant]}`}
    >
      {status}
    </span>
  );
}
