import { type BalanceResponse, type DashboardData } from '../../../lib/consumer-api.server';

export type DashboardBalanceBreakdownItem = {
  currencyCode: string;
  settledCents: number;
  availableCents: number;
  isPrimary: boolean;
};

export function formatCurrencyFromMinor(amount: number, currencyCode = `USD`) {
  return new Intl.NumberFormat(`en-US`, {
    style: `currency`,
    currency: currencyCode,
  }).format(amount / 100);
}

export function formatCurrencyFromMajor(amount: number, currencyCode = `USD`) {
  return new Intl.NumberFormat(`en-US`, {
    style: `currency`,
    currency: currencyCode,
  }).format(amount);
}

export function formatDateTime(value: string | null) {
  if (!value) return `—`;
  return new Date(value).toLocaleString(`en-US`, {
    year: `numeric`,
    month: `short`,
    day: `2-digit`,
    hour: `2-digit`,
    minute: `2-digit`,
  });
}

export function buildDashboardBalanceBreakdown({
  availableBalances,
  settledBalances,
  settledCurrencyCode,
}: {
  availableBalances: BalanceResponse | null;
  settledBalances: BalanceResponse | null;
  settledCurrencyCode: string;
}): DashboardBalanceBreakdownItem[] {
  return Array.from(
    new Set([
      ...Object.keys(settledBalances ?? {}).filter((currencyCode) =>
        hasNonZeroMinorBalance(settledBalances?.[currencyCode]),
      ),
      ...Object.keys(availableBalances ?? {}).filter((currencyCode) =>
        hasNonZeroMinorBalance(availableBalances?.[currencyCode]),
      ),
    ]),
  )
    .sort((left, right) => {
      if (left === settledCurrencyCode) return -1;
      if (right === settledCurrencyCode) return 1;

      const leftMagnitude = Math.max(Math.abs(settledBalances?.[left] ?? 0), Math.abs(availableBalances?.[left] ?? 0));
      const rightMagnitude = Math.max(
        Math.abs(settledBalances?.[right] ?? 0),
        Math.abs(availableBalances?.[right] ?? 0),
      );

      if (leftMagnitude !== rightMagnitude) {
        return rightMagnitude - leftMagnitude;
      }

      return left.localeCompare(right);
    })
    .map((currencyCode) => ({
      currencyCode,
      settledCents: settledBalances?.[currencyCode] ?? 0,
      availableCents: availableBalances?.[currencyCode] ?? 0,
      isPrimary: currencyCode === settledCurrencyCode,
    }));
}

export function getDashboardTasksProgress(tasks: DashboardData[`tasks`]) {
  const completed = tasks.filter((task) => task.completed).length;
  const percent = tasks.length === 0 ? 0 : (completed / tasks.length) * 100;

  return {
    completed,
    label: tasks.length === 0 ? `0% ready` : `${Math.round(percent)}% ready`,
    percent,
    total: tasks.length,
  };
}

function hasNonZeroMinorBalance(amount: number | undefined) {
  return Math.abs(amount ?? 0) > 0;
}
