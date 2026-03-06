import { type ReactNode } from 'react';

import { ArrowDownIcon } from './icons/ArrowDownIcon';
import { ArrowUpIcon } from './icons/ArrowUpIcon';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: {
    value: string;
    direction: `up` | `down` | `neutral`;
  };
  className?: string;
}

export function StatCard({ label, value, icon, trend, className }: StatCardProps) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/50 p-6 shadow-sm transition-all duration-300 hover:shadow-xl hover:border-slate-300 hover:-translate-y-0.5 dark:border-slate-700 dark:from-slate-800 dark:to-slate-800/50 dark:hover:border-slate-600 ${className ?? ``}`}
    >
      <div
        className={`
        absolute
        right-0
        top-0
        h-32
        w-32
        translate-x-10
        -translate-y-10
        rounded-full
        bg-gradient-to-br
        from-primary-500/10
        via-primary-400/5
        to-transparent
        opacity-0
        transition-opacity
        duration-300
        group-hover:opacity-100
        blur-2xl
      `}
      />

      <div className={`relative`}>
        <div
          className={`
          flex
          items-start
          justify-between
          gap-3
        `}
        >
          <div className={`flex-1 min-w-0`}>
            <p
              className={`
              text-xs
              font-bold
              uppercase
              tracking-wider
              text-slate-500
              dark:text-slate-400
            `}
            >
              {label}
            </p>
            <p
              className={`
              mt-2.5
              text-3xl
              font-extrabold
              text-slate-900
              dark:text-white
              truncate
            `}
            >
              {value}
            </p>
          </div>
          {icon && (
            <div
              className={`
              flex
              h-12
              w-12
              shrink-0
              items-center
              justify-center
              rounded-xl
              bg-gradient-to-br
              from-primary-100
              to-primary-50
              text-primary-600
              shadow-sm
              transition-all
              duration-300
              group-hover:scale-110
              group-hover:shadow-md
              dark:from-primary-900/30
              dark:to-primary-900/20
              dark:text-primary-400
            `}
            >
              {icon}
            </div>
          )}
        </div>

        {trend && (
          <div
            className={`
            mt-4
            flex
            items-center
            gap-1.5
            pt-3
            border-t
            border-slate-100
            dark:border-slate-700/50
          `}
          >
            {trend.direction === `up` && (
              <ArrowUpIcon
                className={`
                h-4
                w-4
                text-green-600
                dark:text-green-400
              `}
                strokeWidth={2.5}
              />
            )}
            {trend.direction === `down` && (
              <ArrowDownIcon
                className={`
                h-4
                w-4
                text-red-600
                dark:text-red-400
              `}
                strokeWidth={2.5}
              />
            )}
            <span
              className={`text-sm font-semibold ${
                trend.direction === `up`
                  ? `text-green-600 dark:text-green-400`
                  : trend.direction === `down`
                    ? `text-red-600 dark:text-red-400`
                    : `text-slate-600 dark:text-slate-400`
              }`}
            >
              {trend.value}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
