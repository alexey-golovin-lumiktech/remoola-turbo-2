export type DraftPaymentRequestOption = {
  id: string;
  amount: number;
  currencyCode: string;
  createdAt: string;
  description: string | null;
  counterpartyEmail: string | null;
};

export type DraftPaymentRequestsResult =
  | {
      ok: true;
      items: DraftPaymentRequestOption[];
      total: number;
      page: number;
      pageSize: number;
    }
  | { ok: false; error: { code: string; message: string } };
