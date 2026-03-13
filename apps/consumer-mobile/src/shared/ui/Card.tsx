import { type ReactNode } from 'react';

import { cn } from '@remoola/ui';

import styles from './Card.module.css';

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
  return <div className={cn(styles.root, !noPadding && styles.rootPadded, className)}>{children}</div>;
}

export function CardHeader({ children, className = `` }: CardHeaderProps) {
  return <div className={cn(styles.header, className)}>{children}</div>;
}

export function CardContent({ children, className = `` }: CardContentProps) {
  return <div className={cn(styles.content, className)}>{children}</div>;
}

export function CardFooter({ children, className = `` }: CardFooterProps) {
  return <div className={cn(styles.footer, className)}>{children}</div>;
}
