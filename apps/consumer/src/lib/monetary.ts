/** Restrict input to monetary format: digits, optional one decimal, max 2 decimal places. */
export function maskMonetary(value: string): string {
  const digitsAndDot = value.replace(/[^\d.]/g, ``);
  const parts = digitsAndDot.split(`.`);
  if (parts.length > 2) return (parts[0] ?? ``) + `.` + parts.slice(1).join(``).slice(0, 2);
  if (parts.length === 2) return (parts[0] ?? ``) + `.` + (parts[1] ?? ``).slice(0, 2);
  return digitsAndDot;
}

/** Format raw amount for display with thousand separators and 2 decimals (e.g. 1234.56 → "1,234.56"). */
export function formatMonetaryDisplay(raw: string): string {
  if (raw === ``) return ``;
  const n = Number.parseFloat(raw);
  if (Number.isNaN(n)) return raw;
  return n.toLocaleString(`en-US`, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
