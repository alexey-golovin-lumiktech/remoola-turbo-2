import { Injectable } from '@nestjs/common';

import { type ConsumerAppScope } from '@remoola/api-types';
import { $Enums } from '@remoola/database-2';

import { ConsumerPaymentsCommandsService } from './consumer-payments-commands.service';
import { ConsumerPaymentsPoliciesService } from './consumer-payments-policies.service';
import { ConsumerPaymentsQueriesService } from './consumer-payments-queries.service';
import { CreatePaymentRequest, PaymentsHistoryQuery, TransferBody, WithdrawBody } from './dto';
import { StartPayment } from './dto/start-payment.dto';

@Injectable()
export class ConsumerPaymentsService {
  constructor(
    private readonly policiesService: ConsumerPaymentsPoliciesService,
    private readonly queriesService: ConsumerPaymentsQueriesService,
    private readonly commandsService: ConsumerPaymentsCommandsService,
  ) {}

  async assertProfileCompleteForVerification(consumerId: string): Promise<void> {
    return this.policiesService.assertProfileCompleteForVerification(consumerId);
  }

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

  async startPayment(consumerId: string, body: StartPayment, consumerAppScope?: ConsumerAppScope) {
    return this.commandsService.startPayment(consumerId, body, consumerAppScope);
  }

  async createPaymentRequest(consumerId: string, body: CreatePaymentRequest) {
    return this.commandsService.createPaymentRequest(consumerId, body);
  }

  async sendPaymentRequest(consumerId: string, paymentRequestId: string, consumerAppScope?: ConsumerAppScope) {
    return this.commandsService.sendPaymentRequest(consumerId, paymentRequestId, consumerAppScope);
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

  async withdraw(consumerId: string, body: WithdrawBody, idempotencyKey: string | undefined) {
    return this.commandsService.withdraw(consumerId, body, idempotencyKey);
  }

  async transfer(consumerId: string, body: TransferBody, idempotencyKey: string | undefined) {
    return this.commandsService.transfer(consumerId, body, idempotencyKey);
  }
}
