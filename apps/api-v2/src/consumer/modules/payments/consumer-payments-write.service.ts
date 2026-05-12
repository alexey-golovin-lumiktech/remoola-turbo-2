import { Injectable } from '@nestjs/common';

import { type ConsumerAppScope } from '@remoola/api-types';

import { ConsumerPaymentsCommandsService } from './consumer-payments-commands.service';
import { type CreatePaymentRequest, type TransferBody, type WithdrawBody } from './dto';
import { type StartPayment } from './dto/start-payment.dto';

@Injectable()
export class ConsumerPaymentsWriteService {
  constructor(private readonly commandsService: ConsumerPaymentsCommandsService) {}

  async startPayment(consumerId: string, body: StartPayment, consumerAppScope?: ConsumerAppScope) {
    return this.commandsService.startPayment(consumerId, body, consumerAppScope);
  }

  async createPaymentRequest(consumerId: string, body: CreatePaymentRequest) {
    return this.commandsService.createPaymentRequest(consumerId, body);
  }

  async sendPaymentRequest(consumerId: string, paymentRequestId: string, consumerAppScope?: ConsumerAppScope) {
    return this.commandsService.sendPaymentRequest(consumerId, paymentRequestId, consumerAppScope);
  }

  async withdraw(consumerId: string, body: WithdrawBody, idempotencyKey: string | undefined) {
    return this.commandsService.withdraw(consumerId, body, idempotencyKey);
  }

  async transfer(consumerId: string, body: TransferBody, idempotencyKey: string | undefined) {
    return this.commandsService.transfer(consumerId, body, idempotencyKey);
  }
}
