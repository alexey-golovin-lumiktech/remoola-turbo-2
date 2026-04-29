type BankingMethodKindInput = {
  type: string;
  reusableForPayerPayments: boolean;
};

export function getMethodLabel(method: { type: string; brand: string }) {
  if (method.type === `BANK_ACCOUNT`) return method.brand || `Bank account`;
  return method.brand || `Card`;
}

export function getMethodMeta(method: {
  type: string;
  last4: string;
  expMonth: string | null;
  expYear: string | null;
}) {
  if (method.type === `BANK_ACCOUNT`) return `**** ${method.last4}`;
  const expiry = method.expMonth && method.expYear ? ` • Expires ${method.expMonth}/${method.expYear.slice(-2)}` : ``;
  return `**** ${method.last4}${expiry}`;
}

export function digitsOnly(value: string, maxLength?: number) {
  const normalized = value.replace(/\D/g, ``);
  return maxLength ? normalized.slice(0, maxLength) : normalized;
}

export function normalizeMonth(value: string) {
  const digits = digitsOnly(value, 2);
  if (digits.length === 0) return ``;
  const month = Math.min(12, Math.max(1, Number(digits)));
  return String(month).padStart(2, `0`);
}

export function normalizeEmail(value: string) {
  return value.trimStart().toLowerCase();
}

export function normalizePhone(value: string) {
  const trimmed = value.trimStart();
  const digits = trimmed.replace(/\D/g, ``).slice(0, 15);
  if (!digits) return ``;
  return trimmed.startsWith(`+`) ? `+${digits}` : digits;
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function phoneDigitsCount(value: string) {
  return value.replace(/\D/g, ``).length;
}

export function isCardExpired(expMonth: string, expYear: string, now = new Date()) {
  if (!/^(0[1-9]|1[0-2])$/.test(expMonth) || !/^\d{4}$/.test(expYear)) return false;
  const month = Number(expMonth);
  const year = Number(expYear);
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  return year < currentYear || (year === currentYear && month < currentMonth);
}

export function getMethodKind(method: BankingMethodKindInput) {
  if (method.type === `BANK_ACCOUNT`) {
    return {
      label: `Bank account`,
      tone: `border-transparent bg-[var(--app-primary-soft)] text-[var(--app-primary)]`,
      detail: `Used for payout destinations and Banking records.`,
    };
  }

  if (method.reusableForPayerPayments) {
    return {
      label: `Reusable payer card`,
      tone: `border-transparent bg-[var(--app-success-soft)] text-[var(--app-success-text)]`,
      detail: `Can be used for one-click payer payments and still appears in Banking.`,
    };
  }

  return {
    label: `Manual card record`,
    tone: `border-[color:var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text-soft)]`,
    detail: `Display and billing metadata only. Not used for one-click payer payments.`,
  };
}
