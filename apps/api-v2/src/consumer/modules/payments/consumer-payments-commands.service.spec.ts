import { describe, expect, it, jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';
import { errorCodes } from '@remoola/shared-constants';

import { type ConsumerPaymentRequestNotificationService } from './consumer-payment-request-notification.service';
import { type ConsumerPaymentRequestRepository } from './consumer-payment-request.repository';
import { ConsumerPaymentsCommandsService } from './consumer-payments-commands.service';
import { type ConsumerPaymentsIdentityRepository } from './consumer-payments-identity.repository';
import { type ConsumerPaymentsLedgerRepository } from './consumer-payments-ledger.repository';
import { type ConsumerPaymentsPoliciesService } from './consumer-payments-policies.service';
import { type BalanceCalculationService } from '../../../shared/balance-calculation.service';
import { type PrismaTransactionRunner } from '../../../shared/prisma-transaction.runner';

function createService() {
  const transactions = {
    runLedgerMutation: jest.fn<(...a: any[]) => any>(),
  } as unknown as jest.Mocked<PrismaTransactionRunner>;
  const paymentRequestNotification = {
    sendPaymentRequest: jest.fn<(...a: any[]) => any>(),
  } as unknown as jest.Mocked<ConsumerPaymentRequestNotificationService>;
  const balanceService = {
    calculateInTransaction: jest.fn<(...a: any[]) => any>(),
  } as unknown as jest.Mocked<BalanceCalculationService>;
  const policiesService = {
    appendConsumerAppScopeMetadata: jest.fn<(...a: any[]) => any>((metadata) => metadata),
    buildTransferRecipientWhere: jest.fn<(...a: any[]) => any>(),
    ensureLimits: jest.fn<(...a: any[]) => any>(),
    ensureProfileComplete: jest.fn<(...a: any[]) => any>(),
  } as unknown as jest.Mocked<ConsumerPaymentsPoliciesService>;
  const paymentsIdentityRepository = {
    findActiveRecipientByEmail: jest.fn<(...a: any[]) => any>(),
    findConsumerEmailById: jest.fn<(...a: any[]) => any>(),
  } as unknown as jest.Mocked<ConsumerPaymentsIdentityRepository>;
  const paymentsLedgerRepository = {} as unknown as jest.Mocked<ConsumerPaymentsLedgerRepository>;
  const paymentRequestRepository = {
    createDraftPaymentRequest: jest.fn<(...a: any[]) => any>(),
  } as unknown as jest.Mocked<ConsumerPaymentRequestRepository>;

  return {
    paymentRequestRepository,
    paymentsIdentityRepository,
    policiesService,
    service: new ConsumerPaymentsCommandsService(
      transactions,
      paymentRequestNotification,
      balanceService,
      policiesService,
      paymentsIdentityRepository,
      paymentsLedgerRepository,
      paymentRequestRepository,
    ),
  };
}

describe(`ConsumerPaymentsCommandsService.createPaymentRequest`, () => {
  const consumerId = `consumer-1`;

  it(`creates a draft payment request for an existing recipient`, async () => {
    const { paymentRequestRepository, paymentsIdentityRepository, policiesService, service } = createService();
    paymentsIdentityRepository.findActiveRecipientByEmail.mockResolvedValue({
      id: `recipient-1`,
      email: `payee@example.com`,
    } as never);
    paymentRequestRepository.createDraftPaymentRequest.mockResolvedValue({ id: `pr-1` } as never);

    await expect(
      service.createPaymentRequest(consumerId, {
        amount: `123.45`,
        currencyCode: $Enums.CurrencyCode.USD,
        description: `Invoice`,
        email: `PAYEE@example.com`,
      }),
    ).resolves.toEqual({ paymentRequestId: `pr-1` });

    expect(policiesService.ensureProfileComplete).toHaveBeenCalledWith(consumerId);
    expect(paymentRequestRepository.createDraftPaymentRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: expect.anything(),
        consumerId,
        normalizedEmail: `payee@example.com`,
        recipient: expect.objectContaining({ id: `recipient-1` }),
      }),
    );
  });

  it(`rejects self-request attempts by registered recipient id`, async () => {
    const { paymentsIdentityRepository, service } = createService();
    paymentsIdentityRepository.findActiveRecipientByEmail.mockResolvedValue({
      id: consumerId,
      email: `consumer@example.com`,
    } as never);

    await expect(
      service.createPaymentRequest(consumerId, {
        amount: `10.00`,
        currencyCode: $Enums.CurrencyCode.USD,
        email: `consumer@example.com`,
      }),
    ).rejects.toThrow(new BadRequestException(errorCodes.REQUEST_FROM_SELF_BY_ID));
  });

  it(`rejects self-request attempts by email-only recipient`, async () => {
    const { paymentsIdentityRepository, service } = createService();
    paymentsIdentityRepository.findActiveRecipientByEmail.mockResolvedValue(null);
    paymentsIdentityRepository.findConsumerEmailById.mockResolvedValue(`consumer@example.com`);

    await expect(
      service.createPaymentRequest(consumerId, {
        amount: `10.00`,
        currencyCode: $Enums.CurrencyCode.USD,
        email: `CONSUMER@example.com`,
      }),
    ).rejects.toThrow(new BadRequestException(errorCodes.REQUEST_FROM_SELF_BY_EMAIL));
  });
});
