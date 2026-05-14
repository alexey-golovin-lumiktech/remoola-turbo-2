import { Injectable } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';

import { ConsumerPaymentsQueriesRepository } from './consumer-payments-queries.repository';
import { type PaymentsHistoryQuery } from './dto';

@Injectable()
export class ConsumerPaymentsReadService {
  constructor(private readonly queriesService: ConsumerPaymentsQueriesRepository) {}

  async listPayments(params: {
    consumerId: string;
    page: number;
    pageSize: number;
    status?: string;
    type?: string;
    role?: string;
    search?: string;
  }) {
    return this.queriesService.listPayments(params);
  }

  async getPaymentView(consumerId: string, paymentRequestId: string, backendBaseUrl?: string) {
    return this.queriesService.getPaymentView(consumerId, paymentRequestId, backendBaseUrl);
  }

  async getBalancesCompleted(consumerId: string): Promise<Record<$Enums.CurrencyCode, number>> {
    return this.queriesService.getBalancesCompleted(consumerId);
  }

  async getBalancesIncludePending(consumerId: string): Promise<Record<$Enums.CurrencyCode, number>> {
    return this.queriesService.getBalancesIncludePending(consumerId);
  }

  async getAvailableBalance(consumerId: string): Promise<number> {
    return this.queriesService.getAvailableBalance(consumerId);
  }

  async getHistory(consumerId: string, query: PaymentsHistoryQuery) {
    return this.queriesService.getHistory(consumerId, query);
  }
}
