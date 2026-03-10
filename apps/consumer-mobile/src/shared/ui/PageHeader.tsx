import type { ReactNode } from 'react';

interface PageHeaderProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  badge?: ReactNode;
  className?: string;
}

export function PageHeader({ icon, title, subtitle, actions, badge, className = `` }: PageHeaderProps) {
  return (
    <div
      className={`bg-white/95 dark:bg-slate-900/95 border-b border-slate-200/80 dark:border-slate-700/80 shadow-xs backdrop-blur-lg px-4 py-6 sm:px-6 sm:py-7 lg:px-8 ${className}`}
    >
      <div className={`mx-auto max-w-6xl`}>
        <div
          className={`
          flex
          flex-col
          gap-4
          sm:flex-row
          sm:items-center
          sm:justify-between
        `}
        >
          <div className={`flex items-center gap-4`}>
            {icon}
            <div className={`flex-1`}>
              <div
                className={`
                flex
                items-center
                gap-3
                flex-wrap
              `}
              >
                <h1
                  className={`
                  text-3xl
                  font-extrabold
                  tracking-tight
                  text-slate-900
                  sm:text-4xl
                  dark:text-white
                `}
                >
                  {title}
                </h1>
                {badge}
              </div>
              {subtitle && (
                <p
                  className={`
                text-sm
                font-medium
                text-slate-600
                dark:text-slate-400
                mt-1.5
              `}
                >
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {actions && <div className={`flex flex-wrap gap-2.5`}>{actions}</div>}
        </div>
      </div>
    </div>
  );
}
