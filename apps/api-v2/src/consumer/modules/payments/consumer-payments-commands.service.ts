import { randomUUID } from 'crypto';

import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { type ConsumerAppScope, PAYMENT_METHOD, toCurrencyOrDefault } from '@remoola/api-types';
import { $Enums, Prisma } from '@remoola/database-2';
import { errorCodes } from '@remoola/shared-constants';

import { ConsumerPaymentRequestNotificationService } from './consumer-payment-request-notification.service';
import { ConsumerPaymentRequestRepository } from './consumer-payment-request.repository';
import { ConsumerPaymentsIdentityRepository } from './consumer-payments-identity.repository';
import { ConsumerPaymentsLedgerRepository } from './consumer-payments-ledger.repository';
import { ConsumerPaymentsPoliciesService } from './consumer-payments-policies.service';
import { ConsumerPaymentsTransactionRunner } from './consumer-payments-transaction.runner';
import { type CreatePaymentRequest, type TransferBody, type WithdrawBody } from './dto';
import { type StartPayment } from './dto/start-payment.dto';
import { BalanceCalculationMode, BalanceCalculationService } from '../../../shared/balance-calculation.service';
import { acquireTransactionAdvisoryLock, buildConsumerOperationLockName } from '../../../shared/prisma-advisory-locks';

@Injectable()
export class ConsumerPaymentsCommandsService {
  private readonly logger = new Logger(ConsumerPaymentsCommandsService.name);

  constructor(
    private readonly transactions: ConsumerPaymentsTransactionRunner,
    private readonly paymentRequestNotification: ConsumerPaymentRequestNotificationService,
    private readonly balanceService: BalanceCalculationService,
    private readonly policiesService: ConsumerPaymentsPoliciesService,
    private readonly paymentsIdentityRepository: ConsumerPaymentsIdentityRepository,
    private readonly paymentsLedgerRepository: ConsumerPaymentsLedgerRepository,
    private readonly paymentRequestRepository: ConsumerPaymentRequestRepository,
  ) {}

  private getRequesterSettlementEntryType(paymentRail: $Enums.PaymentRail): $Enums.LedgerEntryType {
    return paymentRail === $Enums.PaymentRail.CARD
      ? $Enums.LedgerEntryType.USER_DEPOSIT
      : $Enums.LedgerEntryType.USER_PAYMENT;
  }

  private async getConsumerEmail(consumerId: string): Promise<string | null> {
    return this.paymentsIdentityRepository.findConsumerEmailById(consumerId);
  }

  async startPayment(consumerId: string, body: StartPayment, consumerAppScope?: ConsumerAppScope) {
    await this.policiesService.ensureProfileComplete(consumerId);

    const normalizedEmail = body.email.trim().toLowerCase();
    const paymentCurrency = toCurrencyOrDefault(body.currencyCode, $Enums.CurrencyCode.USD);

    if (normalizedEmail === (await this.getConsumerEmail(consumerId))) {
      throw new BadRequestException(errorCodes.CANNOT_TRANSFER_TO_SELF_START_PAYMENT);
    }

    const recipient = await this.paymentsIdentityRepository.findActiveRecipientByEmail(normalizedEmail);

    if (recipient?.id === consumerId) {
      throw new BadRequestException(errorCodes.CANNOT_TRANSFER_TO_SELF_START_PAYMENT);
    }

    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException(errorCodes.INVALID_AMOUNT_START_PAYMENT);
    }

    const paymentRail =
      body.method === PAYMENT_METHOD.CREDIT_CARD ? $Enums.PaymentRail.CARD : $Enums.PaymentRail.BANK_TRANSFER;

    return this.transactions.run(async (tx) => {
      const ledgerId = randomUUID();
      const paymentRequest = await this.paymentRequestRepository.createPendingStartPayment(tx, {
        ledgerId,
        consumerId,
        normalizedEmail,
        recipient,
        paymentCurrency,
        paymentRail,
        amount,
        description: body.description,
        payerMetadata: this.policiesService.appendConsumerAppScopeMetadata(
          {
            rail: paymentRail,
            ...(recipient ? { counterpartyId: recipient.id } : {}),
          },
          consumerAppScope,
        ),
        requesterMetadata: this.policiesService.appendConsumerAppScopeMetadata(
          {
            rail: paymentRail,
            counterpartyId: consumerId,
          },
          consumerAppScope,
        ),
        requesterEntryType: this.getRequesterSettlementEntryType(paymentRail),
      });

      if (!recipient) {
        this.logger.log({
          event: `start_payment_created_without_registered_recipient`,
          paymentRequestId: paymentRequest.id,
          payerId: consumerId,
          requesterEmail: normalizedEmail,
        });
      }

      return {
        paymentRequestId: paymentRequest.id,
        ledgerId,
      };
    });
  }

  async createPaymentRequest(consumerId: string, body: CreatePaymentRequest) {
    await this.policiesService.ensureProfileComplete(consumerId);
    const normalizedEmail = body.email.trim().toLowerCase();

    const recipient = await this.paymentsIdentityRepository.findActiveRecipientByEmail(normalizedEmail);

    if (recipient?.id === consumerId) {
      throw new BadRequestException(errorCodes.REQUEST_FROM_SELF_BY_ID);
    }

    if (!recipient && normalizedEmail === (await this.getConsumerEmail(consumerId))) {
      throw new BadRequestException(errorCodes.REQUEST_FROM_SELF_BY_EMAIL);
    }

    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException(errorCodes.INVALID_AMOUNT_CREATE_REQUEST);
    }

    const parseDate = (value?: string) => {
      if (!value) return null;
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        throw new BadRequestException(errorCodes.INVALID_DATE);
      }
      return date;
    };

    const paymentRequest = await this.paymentRequestRepository.createDraftPaymentRequest({
      consumerId,
      normalizedEmail,
      recipient,
      body,
      dueDate: parseDate(body.dueDate),
    });

    if (!recipient) {
      this.logger.log({
        event: `payment_request_created_without_registered_recipient`,
        paymentRequestId: paymentRequest.id,
        requesterId: consumerId,
        payerEmail: normalizedEmail,
      });
    }

    return { paymentRequestId: paymentRequest.id };
  }

  async sendPaymentRequest(consumerId: string, paymentRequestId: string, consumerAppScope?: ConsumerAppScope) {
    await this.policiesService.ensureProfileComplete(consumerId);

    const result = await this.transactions.run(async (tx) => {
      return this.paymentRequestRepository.sendDraftPaymentRequest(tx, {
        consumerId,
        paymentRequestId,
        ledgerId: randomUUID(),
        consumerAppScope,
      });
    });

    await this.paymentRequestNotification.sendPaymentRequest(result.email, consumerAppScope);

    return { paymentRequestId: result.paymentRequestId };
  }

  async withdraw(consumerId: string, body: WithdrawBody, idempotencyKey: string | undefined) {
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException(errorCodes.INVALID_AMOUNT_WITHDRAW);
    }
    if (!idempotencyKey?.trim()) {
      throw new BadRequestException(errorCodes.IDEMPOTENCY_KEY_REQUIRED_WITHDRAW);
    }

    const key = idempotencyKey.trim();
    const withdrawCurrency = toCurrencyOrDefault(body.currencyCode ?? body.currency, $Enums.CurrencyCode.USD);

    const existing = await this.paymentsLedgerRepository.findExistingWithdrawByIdempotencyKey(consumerId, key);
    if (existing) return { ledgerId: existing.ledgerId };

    if (body.paymentMethodId?.trim()) {
      const payoutMethod = await this.paymentsIdentityRepository.findActiveBankPayoutMethod(
        consumerId,
        body.paymentMethodId,
      );
      if (!payoutMethod || payoutMethod.type !== $Enums.PaymentMethodType.BANK_ACCOUNT) {
        throw new BadRequestException(errorCodes.PAYMENT_METHOD_NOT_FOUND);
      }
    }

    const ledgerId = randomUUID();

    try {
      return await this.transactions.run(async (tx) => {
        await this.paymentsLedgerRepository.lockConsumerOutgoing(tx, consumerId);
        await acquireTransactionAdvisoryLock(tx, buildConsumerOperationLockName(consumerId, `withdraw`));

        await this.policiesService.ensureLimits(consumerId, amount, withdrawCurrency, tx);

        const balance = await this.balanceService.calculateInTransaction(tx, consumerId, withdrawCurrency, {
          mode: BalanceCalculationMode.COMPLETED_AND_PENDING,
        });
        if (amount > balance) {
          throw new BadRequestException(errorCodes.INSUFFICIENT_BALANCE_WITHDRAW);
        }

        await this.paymentsLedgerRepository.createWithdrawLedgerEntry(tx, {
          ledgerId,
          consumerId,
          currencyCode: withdrawCurrency,
          amount,
          idempotencyKey: key,
          paymentMethodId: body.paymentMethodId,
          note: body.note,
        });

        return { ledgerId };
      });
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === `P2002`) {
        const duplicate = await this.paymentsLedgerRepository.findExistingWithdrawByIdempotencyKey(consumerId, key);
        if (duplicate) return { ledgerId: duplicate.ledgerId };
      }
      this.logger.error(`Withdraw failed`, { consumerId });
      throw new InternalServerErrorException(`An unexpected error occurred`);
    }
  }

  async transfer(consumerId: string, body: TransferBody, idempotencyKey: string | undefined) {
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException(errorCodes.INVALID_AMOUNT_TRANSFER);
    }
    if (!idempotencyKey?.trim()) {
      throw new BadRequestException(errorCodes.IDEMPOTENCY_KEY_REQUIRED_TRANSFER);
    }

    const key = idempotencyKey.trim();
    const existing = await this.paymentsLedgerRepository.findExistingTransferByIdempotencyKey(consumerId, key);
    if (existing) return { ledgerId: existing.ledgerId };

    const recipient = await this.paymentsIdentityRepository.findTransferRecipient(
      this.policiesService.buildTransferRecipientWhere(body),
    );
    if (!recipient) {
      throw new NotFoundException(errorCodes.RECIPIENT_NOT_FOUND_TRANSFER);
    }
    if (recipient.id === consumerId) {
      throw new BadRequestException(errorCodes.CANNOT_TRANSFER_TO_SELF_TRANSFER);
    }

    const transferCurrency = toCurrencyOrDefault(body.currencyCode ?? body.currency, $Enums.CurrencyCode.USD);
    const ledgerId = randomUUID();
    const [firstId, secondId] = [consumerId, recipient.id].sort();

    try {
      return await this.transactions.run(async (tx) => {
        await this.paymentsLedgerRepository.lockConsumerOutgoing(tx, consumerId);
        await acquireTransactionAdvisoryLock(tx, buildConsumerOperationLockName(firstId, `transfer`));
        await acquireTransactionAdvisoryLock(tx, buildConsumerOperationLockName(secondId, `transfer`));

        await this.policiesService.ensureLimits(consumerId, amount, transferCurrency, tx);

        const balance = await this.balanceService.calculateInTransaction(tx, consumerId, transferCurrency, {
          mode: BalanceCalculationMode.COMPLETED_AND_PENDING,
        });
        if (amount > balance) {
          throw new BadRequestException(errorCodes.INSUFFICIENT_BALANCE_TRANSFER);
        }

        await this.paymentsLedgerRepository.createTransferLedgerEntries(tx, {
          ledgerId,
          consumerId,
          recipientId: recipient.id,
          currencyCode: transferCurrency,
          amount,
          idempotencyKey: key,
        });

        return { ledgerId };
      });
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === `P2002`) {
        const duplicate = await this.paymentsLedgerRepository.findExistingTransferByIdempotencyKey(consumerId, key);
        if (duplicate) return { ledgerId: duplicate.ledgerId };
      }
      this.logger.error(`Transfer failed`, { consumerId });
      throw new InternalServerErrorException(`An unexpected error occurred`);
    }
  }
}
