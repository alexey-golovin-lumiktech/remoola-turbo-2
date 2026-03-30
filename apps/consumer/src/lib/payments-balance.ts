export type BalanceMap = Record<string, number>;

type BalanceItem = {
  currency?: unknown;
  currencyCode?: unknown;
  amount?: unknown;
  amountCents?: unknown;
};

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === `number` && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === `string` && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function parseBalanceItems(items: unknown[]): BalanceMap | null {
  const balances: BalanceMap = {};

  for (const item of items) {
    if (typeof item !== `object` || item === null || Array.isArray(item)) {
      return null;
    }

    const balanceItem = item as BalanceItem;
    const currency =
      typeof balanceItem.currency === `string`
        ? balanceItem.currency
        : typeof balanceItem.currencyCode === `string`
          ? balanceItem.currencyCode
          : null;
    const amountCents = toFiniteNumber(balanceItem.amountCents);
    const amount = amountCents !== null ? amountCents / 100 : toFiniteNumber(balanceItem.amount);

    if (!currency || amount === null) {
      return null;
    }

    balances[currency] = amount;
  }

  return balances;
}

export function parseBalanceMapResponse(data: unknown): { balances: BalanceMap; parsed: boolean } {
  if (Array.isArray(data)) {
    const balances = parseBalanceItems(data);
    return balances ? { balances, parsed: true } : { balances: {}, parsed: false };
  }

  if (typeof data !== `object` || data === null) {
    return { balances: {}, parsed: false };
  }

  const items = (data as { items?: unknown }).items;
  if (Array.isArray(items)) {
    const balances = parseBalanceItems(items);
    return balances ? { balances, parsed: true } : { balances: {}, parsed: false };
  }

  const entries = Object.entries(data);
  const balances: BalanceMap = {};

  for (const [currency, value] of entries) {
    const amount = toFiniteNumber(value);
    if (amount === null) {
      return { balances: {}, parsed: false };
    }
    balances[currency] = amount;
  }

  return { balances, parsed: true };
}
