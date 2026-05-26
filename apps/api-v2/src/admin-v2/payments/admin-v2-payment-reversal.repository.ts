import { Injectable, Logger } from '@nestjs/common';

import { $Enums, Prisma } from '@remoola/database-2';

import {
  buildAdminRefundFinalizationOutboxRow,
  type AdminRefundFinalizationOutboxPayload,
} from './admin-v2-payment-reversal-refund-outbox';

export type ExistingReversalRow = {
  id: string;
  ledgerId: string;
  amount: number | string | { toString(): string };
  stripeId?: string | null;
  status?: $Enums.TransactionStatus;
  outcomes?: Array<{ status: $Enums.TransactionStatus }>;
};

const PAYMENT_REQUEST_REVERSAL_ENTRY_TYPES = [
  $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL,
  $Enums.LedgerEntryType.USER_DEPOSIT_REVERSAL,
] as const;

export const STRIPE_REFUND_EXTERNAL_REF_SOURCE = `stripe_refund`;

@Injectable()
export class AdminV2PaymentReversalRepository {
  private readonly logger = new Logger(AdminV2PaymentReversalRepository.name);

  async createOutcomeIdempotent(
    client: Pick<Prisma.TransactionClient, `ledgerEntryOutcomeModel`>,
    data: {
      ledgerEntryId: string;
      status: $Enums.TransactionStatus;
      source: string;
      externalId: string;
    },
  ) {
    try {
      await client.ledgerEntryOutcomeModel.create({
        data: {
          ledgerEntry: { connect: { id: data.ledgerEntryId } },
          status: data.status,
          source: data.source,
          externalId: data.externalId,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === `P2002`) {
        return;
      }
      throw err;
    }
  }

  findReversalEntriesForPaymentRequest(tx: Prisma.TransactionClient, paymentRequestId: string) {
    return tx.ledgerEntryModel.findMany({
      where: {
        paymentRequestId,
        type: { in: [...PAYMENT_REQUEST_REVERSAL_ENTRY_TYPES] },
      },
      select: {
        amount: true,
        status: true,
        outcomes: {
          orderBy: { createdAt: `desc` },
          take: 1,
          select: { status: true },
        },
      },
    });
  }

  findPayerReversalByIdempotencyKey(tx: Prisma.TransactionClient, idempotencyKey: string) {
    return tx.ledgerEntryModel.findFirst({
      where: { idempotencyKey },
      select: {
        id: true,
        ledgerId: true,
        amount: true,
        stripeId: true,
        status: true,
        outcomes: {
          orderBy: { createdAt: `desc` },
          take: 1,
          select: { status: true },
        },
      },
    });
  }

  createReversalEntry(tx: Prisma.TransactionClient, data: Prisma.LedgerEntryModelUncheckedCreateInput) {
    return tx.ledgerEntryModel.create({ data });
  }

  queueRefundFinalization(tx: Prisma.TransactionClient, payload: AdminRefundFinalizationOutboxPayload) {
    return tx.notificationOutboxModel.createMany({
      data: [buildAdminRefundFinalizationOutboxRow(payload)],
      skipDuplicates: true,
    });
  }

  async finalizeRefundReversal(
    tx: Prisma.TransactionClient,
    params: {
      ledgerId: string;
      adminId: string;
      stripeRefundId: string;
      status: $Enums.TransactionStatus;
    },
  ) {
    const { ledgerId, adminId, stripeRefundId, status } = params;
    const entries = await tx.ledgerEntryModel.findMany({
      where: {
        ledgerId,
        type: { in: [...PAYMENT_REQUEST_REVERSAL_ENTRY_TYPES] },
      },
      select: { id: true },
    });

    for (const entry of entries) {
      await this.createExternalRefIdempotent(tx, {
        ledgerEntryId: entry.id,
        source: STRIPE_REFUND_EXTERNAL_REF_SOURCE,
        externalId: stripeRefundId,
        createdBy: adminId,
      });
      await this.createOutcomeIdempotent(tx, {
        ledgerEntryId: entry.id,
        status,
        source: `stripe`,
        externalId: `admin-refund:${stripeRefundId}:${status}`,
      });
    }
  }

  private async createExternalRefIdempotent(
    client: Pick<Prisma.TransactionClient, `ledgerEntryExternalRefModel`>,
    data: {
      ledgerEntryId: string;
      source: string;
      externalId: string;
      createdBy: string | null;
    },
  ) {
    try {
      await client.ledgerEntryExternalRefModel.create({
        data: {
          ledgerEntry: { connect: { id: data.ledgerEntryId } },
          source: data.source,
          externalId: data.externalId,
          createdBy: data.createdBy,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === `P2002`) {
        const existing = await client.ledgerEntryExternalRefModel.findUnique({
          where: {
            ledgerEntryId_source: { ledgerEntryId: data.ledgerEntryId, source: data.source },
          },
          select: { externalId: true },
        });
        if (existing && existing.externalId !== data.externalId) {
          this.logger.warn({
            event: `ledger_external_ref_divergence`,
            ledgerEntryId: data.ledgerEntryId,
            source: data.source,
            incomingExternalId: data.externalId,
            existingExternalId: existing.externalId,
          });
        }
        return;
      }
      throw err;
    }
  }

  async markRefundReversalDenied(
    tx: Prisma.TransactionClient,
    params: { ledgerId: string; idempotencyKeyBase: string },
  ) {
    const { ledgerId, idempotencyKeyBase } = params;
    const entries = await tx.ledgerEntryModel.findMany({
      where: {
        ledgerId,
        type: { in: [...PAYMENT_REQUEST_REVERSAL_ENTRY_TYPES] },
      },
      select: { id: true },
    });

    for (const entry of entries) {
      await this.createOutcomeIdempotent(tx, {
        ledgerEntryId: entry.id,
        status: $Enums.TransactionStatus.DENIED,
        source: `stripe`,
        externalId: `admin-refund:${idempotencyKeyBase}:failed`,
      });
    }
  }
}
