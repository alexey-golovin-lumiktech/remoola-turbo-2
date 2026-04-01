export const PAYMENT_TYPE_OPTIONS = [``, `CREDIT_CARD`, `BANK_TRANSFER`, `CURRENCY_EXCHANGE`] as const;

export function formatPaymentTypeLabel(type: string) {
  switch (type) {
    case `CREDIT_CARD`:
      return `Card`;
    case `BANK_TRANSFER`:
      return `Bank transfer`;
    case `CURRENCY_EXCHANGE`:
      return `Exchange`;
    default:
      return type;
  }
}

export function buildPaymentsListQuery(params: {
  search: string;
  status: string;
  type: string;
  role: string;
  page: number;
  pageSize: number;
}) {
  const searchParams = new URLSearchParams();

  if (params.search.trim()) {
    searchParams.set(`search`, params.search.trim());
  }
  if (params.status) {
    searchParams.set(`status`, params.status);
  }
  if (params.type) {
    searchParams.set(`type`, params.type);
  }
  if (params.role) {
    searchParams.set(`role`, params.role);
  }

  searchParams.set(`page`, String(params.page));
  searchParams.set(`pageSize`, String(params.pageSize));

  return searchParams.toString();
}
