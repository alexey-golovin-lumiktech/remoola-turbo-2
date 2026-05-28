import { type ConsumerDashboardData } from '@remoola/api-types';

export type DashboardData = ConsumerDashboardData & {
  pendingWithdrawals?: {
    items: Array<{
      id: string;
      ledgerId: string;
      paymentRequestId: string | null;
      amount: number;
      currencyCode: string;
      status: string;
      createdAt: string;
      paymentMethodLabel: string | null;
    }>;
    total: number;
  };
};

export type DashboardDataResult = {
  data: DashboardData | null;
  unavailable: boolean;
};

export type ExchangeRateCard = {
  from: string;
  to: string;
  rate: number | null;
  status: `available` | `stale` | `unavailable`;
};

export type ExchangeRatesBatchResult = {
  items: ExchangeRateCard[];
  unavailable: boolean;
};
