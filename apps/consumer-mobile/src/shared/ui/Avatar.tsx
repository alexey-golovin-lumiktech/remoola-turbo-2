interface AvatarProps {
  name?: string;
  email?: string;
  size?: `sm` | `md` | `lg`;
  className?: string;
}

const sizeClasses = {
  sm: `h-8 w-8 text-xs`,
  md: `h-10 w-10 text-sm`,
  lg: `h-12 w-12 text-base`,
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

function getColorFromString(str: string): string {
  const colors = [
    `bg-red-500`,
    `bg-orange-500`,
    `bg-amber-500`,
    `bg-yellow-500`,
    `bg-lime-500`,
    `bg-green-500`,
    `bg-emerald-500`,
    `bg-teal-500`,
    `bg-cyan-500`,
    `bg-sky-500`,
    `bg-blue-500`,
    `bg-indigo-500`,
    `bg-violet-500`,
    `bg-purple-500`,
    `bg-fuchsia-500`,
    `bg-pink-500`,
    `bg-rose-500`,
  ];

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length] ?? `bg-slate-500`;
}

export function Avatar({ name, email, size = `md`, className }: AvatarProps) {
  const initials = getInitials(name, email);
  const colorClass = getColorFromString(name ?? email ?? ``);

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${sizeClasses[size]} ${colorClass} ${className ?? ``}`}
      aria-label={name ?? email ?? `User avatar`}
    >
      {initials}
    </div>
  );
}
