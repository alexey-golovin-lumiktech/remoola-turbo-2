function padTwo(value: number) {
  return String(value).padStart(2, `0`);
}

export function normalizeDateInput(value: string): string | null {
  const trimmed = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const candidate = new Date(year, month - 1, day);

  if (
    Number.isNaN(candidate.getTime()) ||
    candidate.getFullYear() !== year ||
    candidate.getMonth() !== month - 1 ||
    candidate.getDate() !== day
  ) {
    return null;
  }

  return `${year}-${padTwo(month)}-${padTwo(day)}`;
}

export function getTodayDateInputValue(now = new Date()): string {
  return `${now.getFullYear()}-${padTwo(now.getMonth() + 1)}-${padTwo(now.getDate())}`;
}

export function isDateInputOnOrAfter(value: string, minimumDateInput: string): boolean {
  const normalizedValue = normalizeDateInput(value);
  const normalizedMinimum = normalizeDateInput(minimumDateInput);
  if (!normalizedValue || !normalizedMinimum) return false;
  return normalizedValue >= normalizedMinimum;
}

export function isDateInputTodayOrLater(value: string, now = new Date()): boolean {
  return isDateInputOnOrAfter(value, getTodayDateInputValue(now));
}
