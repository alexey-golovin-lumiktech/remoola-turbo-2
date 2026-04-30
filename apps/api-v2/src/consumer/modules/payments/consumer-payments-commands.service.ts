import { randomUUID } from 'crypto';

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { type ConsumerAppScope, PAYMENT_METHOD, toCurrencyOrDefault } from '@remoola/api-types';
import { $Enums, Prisma } from '@remoola/database-2';
import { errorCodes } from '@remoola/shared-constants';

import { ConsumerPaymentsPoliciesService } from './consumer-payments-policies.service';
import { type CreatePaymentRequest, type TransferBody, type WithdrawBody } from './dto';
import { type StartPayment } from './dto/start-payment.dto';
import { BalanceCalculationMode, BalanceCalculationService } from '../../../shared/balance-calculation.service';
import { MailingService } from '../../../shared/mailing.service';
import {
  acquireTransactionAdvisoryLock,
  buildConsumerOperationLockName,
  buildConsumerOutgoingBalanceLockName,
} from '../../../shared/prisma-advisory-locks';
import { PrismaService } from '../../../shared/prisma.service';

@Injectable()
export class ConsumerPaymentsCommandsService {
  private readonly logger = new Logger(ConsumerPaymentsCommandsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailingService: MailingService,
    private readonly balanceService: BalanceCalculationService,
    private readonly policiesService: ConsumerPaymentsPoliciesService,
  ) {}

  private getRequesterSettlementEntryType(paymentRail: $Enums.PaymentRail): $Enums.LedgerEntryType {
    return paymentRail === $Enums.PaymentRail.CARD
      ? $Enums.LedgerEntryType.USER_DEPOSIT
      : $Enums.LedgerEntryType.USER_PAYMENT;
  }

  private async lockConsumerOutgoing(
    tx: Pick<Prisma.TransactionClient, `$executeRaw`>,
    consumerId: string,
  ): Promise<void> {
    await acquireTransactionAdvisoryLock(tx, buildConsumerOutgoingBalanceLockName(consumerId));
  }

  private async getConsumerEmail(consumerId: string): Promise<string | null> {
    const consumer = await this.prisma.consumerModel.findUnique({
      where: { id: consumerId },
      select: { email: true },
    });
    return consumer?.email?.trim().toLowerCase() ?? null;
  }

  async startPayment(consumerId: string, body: StartPayment, consumerAppScope?: ConsumerAppScope) {
    await this.policiesService.ensureProfileComplete(consumerId);

    const normalizedEmail = body.email.trim().toLowerCase();
    const paymentCurrency = toCurrencyOrDefault(body.currencyCode, $Enums.CurrencyCode.USD);

    if (normalizedEmail === (await this.getConsumerEmail(consumerId))) {
      throw new BadRequestException(errorCodes.CANNOT_TRANSFER_TO_SELF_START_PAYMENT);
    }

    const recipient = await this.prisma.consumerModel.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: `insensitive` },
        deletedAt: null,
      },
    });

    if (recipient?.id === consumerId) {
      throw new BadRequestException(errorCodes.CANNOT_TRANSFER_TO_SELF_START_PAYMENT);
    }

    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException(errorCodes.INVALID_AMOUNT_START_PAYMENT);
    }

    const paymentRail =
      body.method === PAYMENT_METHOD.CREDIT_CARD ? $Enums.PaymentRail.CARD : $Enums.PaymentRail.BANK_TRANSFER;

    return this.prisma.$transaction(async (tx) => {
      const ledgerId = randomUUID();

      const paymentRequest = await tx.paymentRequestModel.create({
        data: {
          payerId: consumerId,
          requesterId: recipient?.id ?? null,
          requesterEmail: recipient?.email ?? normalizedEmail,
          currencyCode: paymentCurrency,
          paymentRail,
          amount,
          description: body.description ?? null,
          status: $Enums.TransactionStatus.PENDING,
          createdBy: consumerId,
          updatedBy: consumerId,
        },
      });

      await tx.ledgerEntryModel.create({
        data: {
          ledgerId,
          consumerId,
          paymentRequestId: paymentRequest.id,
          type: $Enums.LedgerEntryType.USER_PAYMENT,
          currencyCode: paymentCurrency,
          status: $Enums.TransactionStatus.PENDING,
          amount: -amount,
          createdBy: consumerId,
          updatedBy: consumerId,
          idempotencyKey: `pr:${paymentRequest.id}:payer`,
          metadata: this.policiesService.appendConsumerAppScopeMetadata(
            {
              rail: paymentRail,
              ...(recipient ? { counterpartyId: recipient.id } : {}),
            },
            consumerAppScope,
          ),
        },
      });

      if (recipient) {
        await tx.ledgerEntryModel.create({
          data: {
            ledgerId,
            consumerId: recipient.id,
            paymentRequestId: paymentRequest.id,
            type: this.getRequesterSettlementEntryType(paymentRail),
            currencyCode: paymentCurrency,
            status: $Enums.TransactionStatus.PENDING,
            amount,
            createdBy: consumerId,
            updatedBy: consumerId,
            idempotencyKey: `pr:${paymentRequest.id}:requester`,
            metadata: this.policiesService.appendConsumerAppScopeMetadata(
              {
                rail: paymentRail,
                counterpartyId: consumerId,
              },
              consumerAppScope,
            ),
          },
        });
      } else {
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

    const recipient = await this.prisma.consumerModel.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: `insensitive` },
        deletedAt: null,
      },
    });

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

    const paymentRequest = await this.prisma.paymentRequestModel.create({
      data: {
        payerId: recipient?.id ?? null,
        payerEmail: recipient?.email ?? normalizedEmail,
        requesterId: consumerId,
        currencyCode: body.currencyCode ?? $Enums.CurrencyCode.USD,
        amount,
        description: body.description ?? null,
        dueDate: parseDate(body.dueDate),
        status: $Enums.TransactionStatus.DRAFT,
        createdBy: consumerId,
        updatedBy: consumerId,
      },
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

    const result = await this.prisma.$transaction(async (tx) => {
      const paymentRequest = await tx.paymentRequestModel.findUnique({
        where: { id: paymentRequestId },
        select: {
          id: true,
          requesterId: true,
          requesterEmail: true,
          payerId: true,
          payerEmail: true,
          status: true,
          amount: true,
          currencyCode: true,
          description: true,
          dueDate: true,
          payer: { select: { email: true } },
          requester: { select: { email: true } },
          _count: { select: { ledgerEntries: true } },
        },
      });

      if (!paymentRequest) {
        throw new NotFoundException(errorCodes.PAYMENT_REQUEST_NOT_FOUND_SEND_DRAFT);
      }
      if (paymentRequest.requesterId !== consumerId) {
        throw new ForbiddenException(errorCodes.PAYMENT_ACCESS_DENIED_SEND_DRAFT);
      }
      if (paymentRequest.status !== $Enums.TransactionStatus.DRAFT) {
        throw new BadRequestException(errorCodes.ONLY_DRAFT_REQUESTS_CAN_BE_SENT);
      }

      const amount = Number(paymentRequest.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new BadRequestException(errorCodes.INVALID_AMOUNT_SEND_DRAFT);
      }

      const updated = await tx.paymentRequestModel.update({
        where: { id: paymentRequestId },
        data: {
          status: $Enums.TransactionStatus.PENDING,
          sentDate: new Date(),
          updatedBy: consumerId,
        },
      });

      if (!paymentRequest.payerId && paymentRequest._count.ledgerEntries > 0) {
        throw new BadRequestException(errorCodes.INVALID_LEDGER_STATE_EMAIL_PAYMENT_SEND);
      }
      if (paymentRequest.payerId && paymentRequest._count.ledgerEntries > 0) {
        throw new BadRequestException(errorCodes.INVALID_LEDGER_STATE_DRAFT);
      }

      if (paymentRequest._count.ledgerEntries === 0 && paymentRequest.payerId && paymentRequest.requesterId) {
        const ledgerId = randomUUID();
        await tx.ledgerEntryModel.create({
          data: {
            ledgerId,
            consumerId: paymentRequest.payerId,
            paymentRequestId: paymentRequest.id,
            type: $Enums.LedgerEntryType.USER_PAYMENT,
            currencyCode: paymentRequest.currencyCode,
            status: $Enums.TransactionStatus.PENDING,
            amount: -amount,
            createdBy: consumerId,
            updatedBy: consumerId,
            idempotencyKey: `pr:${paymentRequest.id}:payer`,
            metadata: this.policiesService.appendConsumerAppScopeMetadata(
              {
                counterpartyId: paymentRequest.requesterId,
              },
              consumerAppScope,
            ),
          },
        });

        await tx.ledgerEntryModel.create({
          data: {
            ledgerId,
            consumerId: paymentRequest.requesterId,
            paymentRequestId: paymentRequest.id,
            type: $Enums.LedgerEntryType.USER_PAYMENT,
            currencyCode: paymentRequest.currencyCode,
            status: $Enums.TransactionStatus.PENDING,
            amount,
            createdBy: consumerId,
            updatedBy: consumerId,
            idempotencyKey: `pr:${paymentRequest.id}:requester`,
            metadata: this.policiesService.appendConsumerAppScopeMetadata(
              {
                counterpartyId: paymentRequest.payerId,
              },
              consumerAppScope,
            ),
          },
        });
      }

      return {
        paymentRequestId: updated.id,
        email: {
          payerEmail: paymentRequest.payer?.email ?? paymentRequest.payerEmail ?? ``,
          requesterEmail: paymentRequest.requester?.email ?? paymentRequest.requesterEmail ?? ``,
          amount,
          currencyCode: paymentRequest.currencyCode,
          description: paymentRequest.description,
          dueDate: paymentRequest.dueDate,
          paymentRequestId: paymentRequest.id,
        },
      };
    });

    if (result.email.payerEmail) {
      await this.mailingService.sendPaymentRequestEmail({
        ...result.email,
        consumerAppScope,
      });
    }

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

    const existing = await this.prisma.ledgerEntryModel.findFirst({
      where: {
        idempotencyKey: `withdraw:${key}`,
        consumerId,
        type: $Enums.LedgerEntryType.USER_PAYOUT,
        deletedAt: null,
      },
    });
    if (existing) return existing;

    if (body.paymentMethodId?.trim()) {
      const payoutMethod = await this.prisma.paymentMethodModel.findFirst({
        where: {
          id: body.paymentMethodId.trim(),
          consumerId,
          deletedAt: null,
        },
        select: { id: true, type: true },
      });
      if (!payoutMethod || payoutMethod.type !== $Enums.PaymentMethodType.BANK_ACCOUNT) {
        throw new BadRequestException(errorCodes.PAYMENT_METHOD_NOT_FOUND);
      }
    }

    const ledgerId = randomUUID();

    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.lockConsumerOutgoing(tx, consumerId);
        await acquireTransactionAdvisoryLock(tx, buildConsumerOperationLockName(consumerId, `withdraw`));

        await this.policiesService.ensureLimits(consumerId, amount, withdrawCurrency, tx);

        const balance = await this.balanceService.calculateInTransaction(tx, consumerId, withdrawCurrency, {
          mode: BalanceCalculationMode.COMPLETED_AND_PENDING,
        });
        if (amount > balance) {
          throw new BadRequestException(errorCodes.INSUFFICIENT_BALANCE_WITHDRAW);
        }

        return tx.ledgerEntryModel.create({
          data: {
            ledgerId,
            consumerId,
            type: $Enums.LedgerEntryType.USER_PAYOUT,
            currencyCode: withdrawCurrency,
            status: $Enums.TransactionStatus.PENDING,
            amount: -amount,
            createdBy: consumerId,
            updatedBy: consumerId,
            idempotencyKey: `withdraw:${key}`,
            metadata: {
              rail: $Enums.PaymentRail.BANK_TRANSFER,
              requesterId: consumerId,
              ...(body.paymentMethodId?.trim() ? { paymentMethodId: body.paymentMethodId.trim() } : {}),
              ...(body.note?.trim() ? { note: body.note.trim() } : {}),
            },
          },
        });
      });
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === `P2002`) {
        const duplicate = await this.prisma.ledgerEntryModel.findFirst({
          where: {
            idempotencyKey: `withdraw:${key}`,
            consumerId,
            type: $Enums.LedgerEntryType.USER_PAYOUT,
            deletedAt: null,
          },
        });
        if (duplicate) return duplicate;
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
    const existing = await this.prisma.ledgerEntryModel.findFirst({
      where: {
        idempotencyKey: `transfer:${key}:sender`,
        consumerId,
        type: $Enums.LedgerEntryType.USER_PAYMENT,
        deletedAt: null,
      },
      select: { ledgerId: true },
    });
    if (existing) return { ledgerId: existing.ledgerId };

    const recipient = await this.prisma.consumerModel.findFirst({
      where: this.policiesService.buildTransferRecipientWhere(body),
    });
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
      return await this.prisma.$transaction(async (tx) => {
        await this.lockConsumerOutgoing(tx, consumerId);
        await acquireTransactionAdvisoryLock(tx, buildConsumerOperationLockName(firstId, `transfer`));
        await acquireTransactionAdvisoryLock(tx, buildConsumerOperationLockName(secondId, `transfer`));

        await this.policiesService.ensureLimits(consumerId, amount, transferCurrency, tx);

        const balance = await this.balanceService.calculateInTransaction(tx, consumerId, transferCurrency, {
          mode: BalanceCalculationMode.COMPLETED_AND_PENDING,
        });
        if (amount > balance) {
          throw new BadRequestException(errorCodes.INSUFFICIENT_BALANCE_TRANSFER);
        }

        await tx.ledgerEntryModel.create({
          data: {
            ledgerId,
            consumerId,
            type: $Enums.LedgerEntryType.USER_PAYMENT,
            currencyCode: transferCurrency,
            status: $Enums.TransactionStatus.COMPLETED,
            amount: -amount,
            createdBy: consumerId,
            updatedBy: consumerId,
            idempotencyKey: `transfer:${key}:sender`,
            metadata: {
              rail: $Enums.PaymentRail.BANK_TRANSFER,
              senderId: consumerId,
              recipientId: recipient.id,
            },
          },
        });

        await tx.ledgerEntryModel.create({
          data: {
            ledgerId,
            consumerId: recipient.id,
            type: $Enums.LedgerEntryType.USER_PAYMENT,
            currencyCode: transferCurrency,
            status: $Enums.TransactionStatus.COMPLETED,
            amount,
            createdBy: consumerId,
            updatedBy: consumerId,
            idempotencyKey: `transfer:${key}:recipient`,
            metadata: {
              rail: $Enums.PaymentRail.BANK_TRANSFER,
              senderId: consumerId,
              recipientId: recipient.id,
            },
          },
        });

        return { ledgerId };
      });
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === `P2002`) {
        const duplicate = await this.prisma.ledgerEntryModel.findFirst({
          where: {
            idempotencyKey: `transfer:${key}:sender`,
            consumerId,
            type: $Enums.LedgerEntryType.USER_PAYMENT,
            deletedAt: null,
          },
          select: { ledgerId: true },
        });
        if (duplicate) return { ledgerId: duplicate.ledgerId };
      }
      this.logger.error(`Transfer failed`, { consumerId });
      throw new InternalServerErrorException(`An unexpected error occurred`);
    }
  }
}
