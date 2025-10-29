import { cn } from '../utils/cn';

export type BadgeTone = `green` | `blue` | `gray` | `red` | `amber`;
export function Badge({ label, tone = `gray`, className }: { label: string; tone?: BadgeTone; className?: string }) {
  return <span className={cn(`rm-badge`, `rm-badge--${tone}`, className)}>{label}</span>;
}
