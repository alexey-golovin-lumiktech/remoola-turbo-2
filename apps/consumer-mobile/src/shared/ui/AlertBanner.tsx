interface AlertBannerProps {
  message: string;
  /** Set when the banner is a live region (e.g. form validation). */
  role?: `alert`;
  className?: string;
}

/**
 * AlertBanner - Inline error/alert box for forms and modals.
 * Single source for a11y (role="alert") and dark mode styling.
 */
export function AlertBanner({ message, role, className = `` }: AlertBannerProps) {
  return (
    <div
      className={`
        rounded-lg
        bg-red-50
        p-3
        dark:bg-red-900/20
        ${className}
      `.trim()}
      {...(role === `alert` ? { role: `alert` as const } : {})}
    >
      <p className={`text-sm text-red-800 dark:text-red-300`}>{message}</p>
    </div>
  );
}
