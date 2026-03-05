import { type ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = ``, noPadding = false }: CardProps) {
  const paddingClass = noPadding ? `` : `p-6`;
  return (
    <div
      className={`overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800 ${paddingClass} ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = `` }: CardHeaderProps) {
  return <div className={`border-b border-slate-200 p-6 dark:border-slate-700 ${className}`}>{children}</div>;
}

export function CardContent({ children, className = `` }: CardContentProps) {
  return <div className={`p-6 ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = `` }: CardFooterProps) {
  return <div className={`border-t border-slate-200 p-6 dark:border-slate-700 ${className}`}>{children}</div>;
}
