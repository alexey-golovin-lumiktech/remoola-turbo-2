/** @jest-environment @remoola/test-db/environment */

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import { CURRENT_CONSUMER_APP_SCOPE } from '@remoola/api-types';
import { $Enums } from '@remoola/database-2';

import { ConsumerPaymentRequestNotificationService } from './consumer-payment-request-notification.service';
import { ConsumerPaymentRequestRepository } from './consumer-payment-request.repository';
import { ConsumerPaymentsCommandsService } from './consumer-payments-commands.service';
import { ConsumerPaymentsIdentityRepository } from './consumer-payments-identity.repository';
import { ConsumerPaymentsLedgerRepository } from './consumer-payments-ledger.repository';
import { ConsumerPaymentsPoliciesService } from './consumer-payments-policies.service';
import { ConsumerPaymentsPolicyRepository } from './consumer-payments-policy.repository';
import { createPrismaTestContext } from '../../../../test/helpers/prisma-test-context';
import { BalanceCalculationRepository } from '../../../shared/balance-calculation.repository';
import { BalanceCalculationService } from '../../../shared/balance-calculation.service';

describe(`ConsumerPaymentsCommandsService DB concurrency`, () => {
  const prismaContext = createPrismaTestContext();
  const { prisma } = prismaContext;
  const mailingService = {
    sendPaymentRequestEmail: jest.fn(async (_payload: unknown) => undefined),
  };
  const service = new ConsumerPaymentsCommandsService(
    {
      run: (callback: any) => prisma.$transaction(callback),
      runLedgerMutation: (callback: any) => prisma.$transaction(callback),
    } as any,
    new ConsumerPaymentRequestNotificationService(mailingService as any),
    new BalanceCalculationService(new BalanceCalculationRepository(prisma as any)),
    new ConsumerPaymentsPoliciesService(new ConsumerPaymentsPolicyRepository(prisma as any)),
    new ConsumerPaymentsIdentityRepository(prisma as any),
    new ConsumerPaymentsLedgerRepository(prisma as any),
    new ConsumerPaymentRequestRepository(prisma as any),
  );

  beforeAll(async () => {
    await prismaContext.connect();
  });

  afterAll(async () => {
    await prismaContext.disconnect();
  });

  it(`sends a registered-payer draft once under real concurrent DB calls`, async () => {
    mailingService.sendPaymentRequestEmail.mockClear();

    const requester = await prisma.consumerModel.create({
      data: {
        email: `payments-concurrency-requester@local.test`,
        accountType: $Enums.AccountType.CONTRACTOR,
        contractorKind: $Enums.ContractorKind.INDIVIDUAL,
        personalDetails: {
          create: {
            legalStatus: $Enums.LegalStatus.INDIVIDUAL,
            citizenOf: `US`,
            dateOfBirth: new Date(`1990-01-01T00:00:00.000Z`),
            passportOrIdNumber: `requester-passport`,
            countryOfTaxResidence: `US`,
            taxId: `requester-tax`,
          },
        },
      },
    });
    const payer = await prisma.consumerModel.create({
      data: {
        email: `payments-concurrency-payer@local.test`,
        accountType: $Enums.AccountType.CONTRACTOR,
        contractorKind: $Enums.ContractorKind.INDIVIDUAL,
      },
    });
    const paymentRequest = await prisma.paymentRequestModel.create({
      data: {
        amount: 37.5,
        currencyCode: $Enums.CurrencyCode.USD,
        status: $Enums.TransactionStatus.DRAFT,
        paymentRail: $Enums.PaymentRail.BANK_TRANSFER,
        requesterId: requester.id,
        payerId: payer.id,
        description: `registered payer concurrency`,
        createdBy: requester.id,
        updatedBy: requester.id,
      },
    });

    const results = await Promise.allSettled([
      service.sendPaymentRequest(requester.id, paymentRequest.id, CURRENT_CONSUMER_APP_SCOPE),
      service.sendPaymentRequest(requester.id, paymentRequest.id, CURRENT_CONSUMER_APP_SCOPE),
    ]);

    expect(results.filter((result) => result.status === `fulfilled`)).toHaveLength(1);
    expect(results.filter((result) => result.status === `rejected`)).toHaveLength(1);

    const updatedRequest = await prisma.paymentRequestModel.findUniqueOrThrow({
      where: { id: paymentRequest.id },
      select: { status: true, sentDate: true },
    });
    expect(updatedRequest.status).toBe($Enums.TransactionStatus.PENDING);
    expect(updatedRequest.sentDate).toBeInstanceOf(Date);

    const ledgerEntries = await prisma.ledgerEntryModel.findMany({
      where: { paymentRequestId: paymentRequest.id, deletedAt: null },
      orderBy: { amount: `asc` },
      select: {
        consumerId: true,
        amount: true,
        idempotencyKey: true,
        ledgerId: true,
        metadata: true,
      },
    });

    const normalizedEntries = ledgerEntries.map((entry) => ({
      ...entry,
      amount: Number(entry.amount),
    }));

    expect(normalizedEntries).toHaveLength(2);
    expect(new Set(normalizedEntries.map((entry) => entry.ledgerId)).size).toBe(1);
    expect(normalizedEntries).toEqual([
      expect.objectContaining({
        consumerId: payer.id,
        amount: -37.5,
        idempotencyKey: `pr:${paymentRequest.id}:payer`,
        metadata: expect.objectContaining({ consumerAppScope: CURRENT_CONSUMER_APP_SCOPE }),
      }),
      expect.objectContaining({
        consumerId: requester.id,
        amount: 37.5,
        idempotencyKey: `pr:${paymentRequest.id}:requester`,
        metadata: expect.objectContaining({ consumerAppScope: CURRENT_CONSUMER_APP_SCOPE }),
      }),
    ]);
    expect(mailingService.sendPaymentRequestEmail).toHaveBeenCalledTimes(1);
    expect(mailingService.sendPaymentRequestEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        payerEmail: payer.email,
        requesterEmail: requester.email,
        amount: 37.5,
        paymentRequestId: paymentRequest.id,
        consumerAppScope: CURRENT_CONSUMER_APP_SCOPE,
      }),
    );
  });
});
