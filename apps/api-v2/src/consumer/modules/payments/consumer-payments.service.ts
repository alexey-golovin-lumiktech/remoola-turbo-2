import { Injectable } from '@nestjs/common';

import { type ConsumerAppScope } from '@remoola/api-types';
import { $Enums } from '@remoola/database-2';

import { ConsumerPaymentsPoliciesService } from './consumer-payments-policies.service';
import { ConsumerPaymentsReadService } from './consumer-payments-read.service';
import { ConsumerPaymentsWriteService } from './consumer-payments-write.service';
import { CreatePaymentRequest, PaymentsHistoryQuery, TransferBody, WithdrawBody } from './dto';
import { StartPayment } from './dto/start-payment.dto';

@Injectable()
export class ConsumerPaymentsService {
  constructor(
    private readonly policiesService: ConsumerPaymentsPoliciesService,
    private readonly readService: ConsumerPaymentsReadService,
    private readonly writeService: ConsumerPaymentsWriteService,
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
    return this.readService.listPayments(params);
  }

  async getPaymentView(consumerId: string, paymentRequestId: string, backendBaseUrl?: string) {
    return this.readService.getPaymentView(consumerId, paymentRequestId, backendBaseUrl);
  }

  async startPayment(consumerId: string, body: StartPayment, consumerAppScope?: ConsumerAppScope) {
    return this.writeService.startPayment(consumerId, body, consumerAppScope);
  }

  async createPaymentRequest(consumerId: string, body: CreatePaymentRequest) {
    return this.writeService.createPaymentRequest(consumerId, body);
  }

  async sendPaymentRequest(consumerId: string, paymentRequestId: string, consumerAppScope?: ConsumerAppScope) {
    return this.writeService.sendPaymentRequest(consumerId, paymentRequestId, consumerAppScope);
  }

  async getBalancesCompleted(consumerId: string): Promise<Record<$Enums.CurrencyCode, number>> {
    return this.readService.getBalancesCompleted(consumerId);
  }

  async getBalancesIncludePending(consumerId: string): Promise<Record<$Enums.CurrencyCode, number>> {
    return this.readService.getBalancesIncludePending(consumerId);
  }

  async getAvailableBalance(consumerId: string): Promise<number> {
    return this.readService.getAvailableBalance(consumerId);
  }

  async getHistory(consumerId: string, query: PaymentsHistoryQuery) {
    return this.readService.getHistory(consumerId, query);
  }

  async withdraw(consumerId: string, body: WithdrawBody, idempotencyKey: string | undefined) {
    return this.writeService.withdraw(consumerId, body, idempotencyKey);
  }

  async transfer(consumerId: string, body: TransferBody, idempotencyKey: string | undefined) {
    return this.writeService.transfer(consumerId, body, idempotencyKey);
  }
}
