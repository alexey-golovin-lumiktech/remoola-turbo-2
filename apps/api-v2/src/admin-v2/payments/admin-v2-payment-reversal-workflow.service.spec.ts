import { $Enums, Prisma } from '@remoola/database-2';

import { AdminV2PaymentReversalPolicyProvider } from './admin-v2-payment-reversal-policy';
import { AdminV2PaymentReversalWorkflowService } from './admin-v2-payment-reversal-workflow.service';
import { type AdminV2PaymentReversalRepository } from './admin-v2-payment-reversal.repository';
import { type AdminActionAuditService } from '../../shared/admin-action-audit.service';
import { type BalanceCalculationService } from '../../shared/balance-calculation.service';
import { type PrismaTransactionRunner } from '../../shared/prisma-transaction.runner';

describe(`AdminV2PaymentReversalWorkflowService`, () => {
  function buildWorkflow() {
    const tx = {
      $executeRaw: jest.fn().mockResolvedValue(undefined),
    } as unknown as Prisma.TransactionClient & { $executeRaw: jest.Mock };
    const transactions = {
      run<T>(callback: (client: Prisma.TransactionClient) => Promise<T>): Promise<T> {
        return callback(tx);
      },
      runLedgerMutation<T>(callback: (client: Prisma.TransactionClient) => Promise<T>): Promise<T> {
        return callback(tx);
      },
    };
    const repository = {
      findReversalEntriesForPaymentRequest: jest.fn(),
      findPayerReversalByIdempotencyKey: jest.fn(),
      createReversalEntry: jest.fn().mockResolvedValue(undefined),
      queueRefundFinalization: jest.fn().mockResolvedValue({ count: 1 }),
    };
    const balanceService = {
      calculateInTransaction: jest.fn().mockResolvedValue(100),
    };
    const adminActionAudit = {
      recordRequiredWithClient: jest.fn().mockResolvedValue(undefined),
    };

    const workflow = new AdminV2PaymentReversalWorkflowService(
      transactions as unknown as PrismaTransactionRunner,
      repository as unknown as AdminV2PaymentReversalRepository,
      balanceService as unknown as BalanceCalculationService,
      adminActionAudit as unknown as AdminActionAuditService,
      new AdminV2PaymentReversalPolicyProvider(),
    );

    return { workflow, transactions, tx, repository, balanceService, adminActionAudit };
  }

  const paymentRequest = {
    id: `pr-1`,
    amount: new Prisma.Decimal(25),
    currencyCode: $Enums.CurrencyCode.USD,
    status: $Enums.TransactionStatus.COMPLETED,
    payerId: `payer-1`,
    requesterId: `requester-1`,
    requesterEmail: `requester@example.com`,
    ledgerEntries: [],
  };

  it(`creates requester deposit reversal entries and writes audit metadata in the transaction`, async () => {
    const { workflow, tx, repository, balanceService, adminActionAudit } = buildWorkflow();
    repository.findReversalEntriesForPaymentRequest.mockResolvedValue([]);
    repository.findPayerReversalByIdempotencyKey.mockResolvedValue(null);

    await expect(
      workflow.executeReversal({
        paymentRequestId: `pr-1`,
        paymentRequest,
        body: { kind: `CHARGEBACK`, amount: 25, reason: `same-reason` },
        adminId: `admin-1`,
        requestAmount: 25,
        requestedAmount: 25,
        stripePaymentIntentId: null,
        originalLedgerId: `payer-ledger`,
        requesterSettlementEntry: {
          type: $Enums.LedgerEntryType.USER_DEPOSIT,
          ledgerId: `requester-ledger`,
          paymentRequest: { paymentRail: $Enums.PaymentRail.CARD },
        },
        requesterReversalType: $Enums.LedgerEntryType.USER_DEPOSIT_REVERSAL,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        amount: new Prisma.Decimal(25),
        remaining: new Prisma.Decimal(0),
        kind: `CHARGEBACK`,
        alreadyExisted: false,
      }),
    );

    expect(repository.createReversalEntry).toHaveBeenNthCalledWith(
      1,
      tx,
      expect.objectContaining({
        consumerId: `payer-1`,
        type: $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL,
        amount: new Prisma.Decimal(25),
        metadata: expect.objectContaining({
          rail: $Enums.PaymentRail.STRIPE_CHARGEBACK,
          reversalKind: `CHARGEBACK`,
          reversalOfLedgerId: `payer-ledger`,
          stripeObjectType: `manual_chargeback`,
        }),
      }),
    );
    expect(repository.createReversalEntry).toHaveBeenNthCalledWith(
      2,
      tx,
      expect.objectContaining({
        consumerId: `requester-1`,
        type: $Enums.LedgerEntryType.USER_DEPOSIT_REVERSAL,
        amount: new Prisma.Decimal(-25),
        metadata: expect.objectContaining({
          rail: $Enums.PaymentRail.STRIPE_CHARGEBACK,
          reversalKind: `CHARGEBACK`,
          reversalOfLedgerId: `requester-ledger`,
          stripeObjectType: `manual_chargeback`,
        }),
      }),
    );
    expect(balanceService.calculateInTransaction).toHaveBeenCalledWith(tx, `requester-1`, $Enums.CurrencyCode.USD, {
      mode: `COMPLETED_AND_PENDING`,
    });
    expect(adminActionAudit.recordRequiredWithClient).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        adminId: `admin-1`,
        action: `payment_chargeback`,
        resourceId: `pr-1`,
      }),
    );
    expect(tx.$executeRaw).toHaveBeenCalledTimes(3);
  });

  it(`reuses an existing denied refund reversal and flags it for refund finalization`, async () => {
    const { workflow, repository, adminActionAudit } = buildWorkflow();
    repository.findReversalEntriesForPaymentRequest.mockResolvedValue([
      { amount: 25, status: $Enums.TransactionStatus.DENIED, outcomes: [] },
    ]);
    repository.findPayerReversalByIdempotencyKey.mockResolvedValue({
      id: `reversal-1`,
      ledgerId: `ledger-denied`,
      amount: 25,
      stripeId: null,
      status: $Enums.TransactionStatus.DENIED,
      outcomes: [],
    });

    await expect(
      workflow.executeReversal({
        paymentRequestId: `pr-1`,
        paymentRequest,
        body: { kind: `REFUND`, amount: 25 },
        adminId: `admin-2`,
        requestAmount: 25,
        requestedAmount: 25,
        stripePaymentIntentId: `pi_123`,
        originalLedgerId: `payer-ledger`,
        requesterSettlementEntry: null,
        requesterReversalType: $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL,
      }),
    ).resolves.toEqual({
      ledgerId: `ledger-denied`,
      amount: new Prisma.Decimal(25),
      remaining: new Prisma.Decimal(25),
      kind: `REFUND`,
      alreadyExisted: true,
      idempotencyKeyBase: expect.any(String),
      stripePaymentIntentId: `pi_123`,
      existingStripeRefundId: null,
      needsRefundFinalize: true,
    });

    expect(repository.createReversalEntry).not.toHaveBeenCalled();
    expect(adminActionAudit.recordRequiredWithClient).not.toHaveBeenCalled();
  });
});
