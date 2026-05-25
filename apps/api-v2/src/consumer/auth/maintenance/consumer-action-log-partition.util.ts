const PARTITION_NAME_REGEX = /^consumer_action_log_p(\d{6})$/;

export function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
}

export function addUtcMonths(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1, 0, 0, 0, 0));
}

export function toPartitionName(monthStart: Date): string {
  const year = monthStart.getUTCFullYear();
  const month = String(monthStart.getUTCMonth() + 1).padStart(2, `0`);
  return `consumer_action_log_p${year}${month}`;
}

export function parsePartitionMonthStart(partitionName: string): Date | null {
  const match = PARTITION_NAME_REGEX.exec(partitionName);
  if (!match) return null;

  const year = Number.parseInt(match[1].slice(0, 4), 10);
  const month = Number.parseInt(match[1].slice(4, 6), 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;

  return new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
}

export function quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, `""`)}"`;
}
