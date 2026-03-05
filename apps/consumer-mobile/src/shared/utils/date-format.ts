import { formatDistanceToNow, format, isToday, isYesterday, isTomorrow, parseISO } from 'date-fns';

export function formatRelativeDate(date: Date | string | number): string {
  const dateObj = typeof date === `string` ? parseISO(date) : new Date(date);

  if (isToday(dateObj)) {
    return `Today at ${format(dateObj, `h:mm a`)}`;
  }

  if (isYesterday(dateObj)) {
    return `Yesterday at ${format(dateObj, `h:mm a`)}`;
  }

  if (isTomorrow(dateObj)) {
    return `Tomorrow at ${format(dateObj, `h:mm a`)}`;
  }

  const daysAgo = Math.floor((Date.now() - dateObj.getTime()) / (1000 * 60 * 60 * 24));

  if (daysAgo >= 0 && daysAgo <= 7) {
    return `${formatDistanceToNow(dateObj, { addSuffix: true })}`;
  }

  return format(dateObj, `MMM d, yyyy`);
}

export function formatAbsoluteDate(date: Date | string | number): string {
  const dateObj = typeof date === `string` ? parseISO(date) : new Date(date);
  return format(dateObj, `MMM d, yyyy h:mm a`);
}

export function formatShortDate(date: Date | string | number): string {
  const dateObj = typeof date === `string` ? parseISO(date) : new Date(date);
  return format(dateObj, `MMM d, yyyy`);
}

export function formatTime(date: Date | string | number): string {
  const dateObj = typeof date === `string` ? parseISO(date) : new Date(date);
  return format(dateObj, `h:mm a`);
}

export function formatRelativeTime(date: Date | string | number): string {
  const dateObj = typeof date === `string` ? parseISO(date) : new Date(date);
  return formatDistanceToNow(dateObj, { addSuffix: true });
}

export function formatDateRange(startDate: Date | string | number, endDate: Date | string | number): string {
  const start = typeof startDate === `string` ? parseISO(startDate) : new Date(startDate);
  const end = typeof endDate === `string` ? parseISO(endDate) : new Date(endDate);

  return `${format(start, `MMM d`)} - ${format(end, `MMM d, yyyy`)}`;
}

export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat(`en-US`, {
    style: `currency`,
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCompactNumber(num: number): string {
  return new Intl.NumberFormat(`en-US`, {
    notation: `compact`,
    compactDisplay: `short`,
  }).format(num);
}
