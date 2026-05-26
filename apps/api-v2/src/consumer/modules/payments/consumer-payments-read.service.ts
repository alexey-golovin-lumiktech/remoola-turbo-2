import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';

import { type PaymentsHistoryQuery } from './dto';
import { ConsumerPaymentViewRepository } from './queries/consumer-payment-view.repository';
import { ConsumerPaymentsHistoryRepository } from './queries/consumer-payments-history.repository';
import { ConsumerPaymentsListRepository } from './queries/consumer-payments-list.repository';
import { BalanceCalculationMode, BalanceCalculationService } from '../../../shared/balance-calculation.service';

@Injectable()
export class ConsumerPaymentsReadService {
  private readonly logger = new Logger(ConsumerPaymentsReadService.name);

  constructor(
    private readonly listRepository: ConsumerPaymentsListRepository,
    private readonly viewRepository: ConsumerPaymentViewRepository,
    private readonly historyRepository: ConsumerPaymentsHistoryRepository,
    private readonly balanceService: BalanceCalculationService,
  ) {}

  async listPayments(params: {
    consumerId: string;
    page: number;
    pageSize: number;
    status?: string;
    type?: string;
    role?: string;
    search?: string;
  }) {
    return this.listRepository.listPayments(params);
  }

  async getPaymentView(consumerId: string, paymentRequestId: string, backendBaseUrl?: string) {
    return this.viewRepository.getPaymentView(consumerId, paymentRequestId, backendBaseUrl);
  }

  async getBalancesCompleted(consumerId: string): Promise<Record<$Enums.CurrencyCode, number>> {
    try {
      const result = await this.balanceService.calculateMultiCurrency(consumerId, {
        mode: BalanceCalculationMode.COMPLETED,
      });
      return result.balances;
    } catch {
      this.logger.error(`Balance calculation failed`, { consumerId });
      throw new InternalServerErrorException(`An unexpected error occurred`);
    }
  }

  async getBalancesIncludePending(consumerId: string): Promise<Record<$Enums.CurrencyCode, number>> {
    try {
      const result = await this.balanceService.calculateMultiCurrency(consumerId, {
        mode: BalanceCalculationMode.COMPLETED_AND_PENDING,
      });
      return result.balances;
    } catch {
      this.logger.error(`Balance calculation failed`, { consumerId });
      throw new InternalServerErrorException(`An unexpected error occurred`);
    }
  }

  async getAvailableBalance(consumerId: string): Promise<number> {
    const result = await this.balanceService.calculateSingle(consumerId);
    return result.balance;
  }

  async getHistory(consumerId: string, query: PaymentsHistoryQuery) {
    return this.historyRepository.getHistory(consumerId, query);
  }
}
