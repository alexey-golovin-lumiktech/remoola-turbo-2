import { cn } from '@remoola/ui';

import styles from './Avatar.module.css';

interface AvatarProps {
  name?: string;
  email?: string;
  size?: `sm` | `md` | `lg`;
  className?: string;
}

const sizeClass = { sm: styles.sizeSm, md: styles.sizeMd, lg: styles.sizeLg } as const;

const colorKeys = [
  `red-500`,
  `orange-500`,
  `amber-500`,
  `yellow-500`,
  `lime-500`,
  `green-500`,
  `emerald-500`,
  `teal-500`,
  `cyan-500`,
  `sky-500`,
  `blue-500`,
  `indigo-500`,
  `violet-500`,
  `purple-500`,
  `fuchsia-500`,
  `pink-500`,
  `rose-500`,
] as const;

const colorClassMap: Record<string, string | undefined> = {
  'red-500': styles.colorRed500,
  'orange-500': styles.colorOrange500,
  'amber-500': styles.colorAmber500,
  'yellow-500': styles.colorYellow500,
  'lime-500': styles.colorLime500,
  'green-500': styles.colorGreen500,
  'emerald-500': styles.colorEmerald500,
  'teal-500': styles.colorTeal500,
  'cyan-500': styles.colorCyan500,
  'sky-500': styles.colorSky500,
  'blue-500': styles.colorBlue500,
  'indigo-500': styles.colorIndigo500,
  'violet-500': styles.colorViolet500,
  'purple-500': styles.colorPurple500,
  'fuchsia-500': styles.colorFuchsia500,
  'pink-500': styles.colorPink500,
  'rose-500': styles.colorRose500,
};

function getInitials(name?: string, email?: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      const first = parts[0]?.[0];
      const last = parts[parts.length - 1]?.[0];
      if (first && last) {
        return `${first}${last}`.toUpperCase();
      }
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return `?`;
}

function getColorKeyFromString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colorKeys[Math.abs(hash) % colorKeys.length] ?? `slate-500`;
}

export function Avatar({ name, email, size = `md`, className }: AvatarProps) {
  const initials = getInitials(name, email);
  const colorKey = getColorKeyFromString(name ?? email ?? ``);
  const colorClass = colorClassMap[colorKey] ?? styles.colorSlate500;

  return (
    <div
      className={cn(styles.root, sizeClass[size], colorClass, className)}
      aria-label={name ?? email ?? `User avatar`}
    >
      {initials}
    </div>
  );
}
