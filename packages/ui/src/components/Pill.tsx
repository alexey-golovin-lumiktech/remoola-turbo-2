import { cn } from '../utils/cn';

export function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn(`rm-pill`, className)}>{children}</span>;
}
