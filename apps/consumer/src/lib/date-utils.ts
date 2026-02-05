/**
 * Formats a date string for HTML date inputs (YYYY-MM-DD format)
 * Handles both ISO strings and YYYY-MM-DD strings
 */
export function formatDateForInput(dateString: string): string {
  if (!dateString || dateString.trim() === ``) return ``;

  // If it's already in YYYY-MM-DD format, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }

  // Try to parse as ISO string or other date format
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return ``;
  }

  // Format as YYYY-MM-DD
  const isoString = date.toISOString();
  return isoString.split(`T`)[0] || ``;
}

/**
 * Validates if a date string is in the correct format for date inputs
 */
export function isValidDateInputFormat(dateString: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateString);
}

/**
 * Formats a date for display using the user's locale
 */
export function formatDateForDisplay(dateString: string | Date, options?: Intl.DateTimeFormatOptions): string {
  if (!dateString) return ``;

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return ``;
    }

    const locale = getUserLocale();

    // Use numeric format for some locales that prefer DD.MM.YYYY
    const numericLocales = [`ru`, `de`, `fr`, `es`, `it`, `pt`, `nl`, `sv`, `da`, `no`, `fi`];
    const useNumeric = numericLocales.includes(locale);

    return new Intl.DateTimeFormat(locale, {
      year: `numeric`,
      month: useNumeric ? `2-digit` : `short`,
      day: `2-digit`,
      ...options,
    }).format(date);
  } catch {
    return ``;
  }
}

/**
 * Formats a date and time for display using the user's locale
 */
export function formatDateTimeForDisplay(dateString: string | Date, options?: Intl.DateTimeFormatOptions): string {
  if (!dateString) return ``;

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return ``;
    }

    const locale = getUserLocale();
    return new Intl.DateTimeFormat(locale, {
      year: `numeric`,
      month: `short`,
      day: `numeric`,
      hour: `2-digit`,
      minute: `2-digit`,
      ...options,
    }).format(date);
  } catch {
    return ``;
  }
}

/**
 * Formats a relative time (e.g., "2 days ago", "in 3 hours")
 */
export function formatRelativeTime(dateString: string | Date): string {
  if (!dateString) return ``;

  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = date.getTime() - now.getTime();
    const diffInDays = Math.floor(Math.abs(diffInMs) / (1000 * 60 * 60 * 24));
    const diffInHours = Math.floor(Math.abs(diffInMs) / (1000 * 60 * 60));
    const diffInMinutes = Math.floor(Math.abs(diffInMs) / (1000 * 60));

    const isPast = diffInMs < 0;
    const unit = isPast ? `ago` : `from now`;

    if (diffInDays > 0) {
      return `${diffInDays} day${diffInDays > 1 ? `s` : ``} ${unit}`;
    }
    if (diffInHours > 0) {
      return `${diffInHours} hour${diffInHours > 1 ? `s` : ``} ${unit}`;
    }
    if (diffInMinutes > 0) {
      return `${diffInMinutes} minute${diffInMinutes > 1 ? `s` : ``} ${unit}`;
    }

    return `Just now`;
  } catch {
    return ``;
  }
}

/**
 * Gets the user's locale, with fallback to 'en'
 * Returns the primary language tag (e.g., 'ru' from 'ru-RU')
 */
export function getUserLocale(): string {
  if (typeof navigator !== `undefined`) {
    // Try to get the most preferred language from navigator.languages
    if (navigator.languages && navigator.languages.length > 0) {
      const primaryLang = navigator.languages[0]?.split(`-`)[0];
      if (primaryLang) return primaryLang;
    }
    // Fallback to navigator.language
    if (navigator.language) {
      const primaryLang = navigator.language.split(`-`)[0];
      if (primaryLang) return primaryLang;
    }
  }
  return `en`;
}
