/**
 * Inline ISO‑8601 UTC formatter.
 * Usage:  sqlToIso8601('meet.created_at', timezone) →
 * `to_char((meet.created_at) AT TIME ZONE '${timezone}', 'YYYY‑MM‑DD"T"HH24:MI:SS.MS"Z"')`
 */
export const sqlToIso8601 = (columnOrSelect: string, timezone: string) => {
  const format = `YYYY-MM-DD"T"HH24:MI:SS.MS"Z"`;
  return `to_char((${columnOrSelect}) AT TIME ZONE '${timezone}', '${format}')`;
};

export const sqlToIso8601UTC = (columnOrSelect: string) => {
  return sqlToIso8601(columnOrSelect, `UTC`);
};
