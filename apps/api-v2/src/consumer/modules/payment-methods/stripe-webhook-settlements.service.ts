import { Injectable, Logger } from '@nestjs/common';

import { $Enums, type Prisma } from '@remoola/database-2';

import { createOutcomeIdempotent } from './ledger-outcome-idempotent';
import { PrismaService } from '../../../shared/prisma.service';
import { getCurrencyFractionDigits } from '../../../shared-common';

import type Stripe from 'stripe';

@Injectable()
export class StripeWebhookSettlementsService {
  private static readonly PAYMENT_REQUEST_SETTLEMENT_ENTRY_TYPES = [
    $Enums.LedgerEntryType.USER_PAYMENT,
    $Enums.LedgerEntryType.USER_DEPOSIT,
  ] as const;

  private readonly logger = new Logger(StripeWebhookSettlementsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async finalizeCheckoutSessionSuccess(
    session: Stripe.Checkout.Session,
    handlers?: {
      collectPaymentMethodFromCheckout?: (
        session: Stripe.Checkout.Session,
        consumerId: string,
      ) => Promise<unknown> | unknown;
    },
  ) {
    const paymentRequestId = session.metadata?.paymentRequestId;
    const consumerId = session.metadata?.consumerId;

    if (!paymentRequestId || !consumerId) return;

    const paymentIntentId = this.getPaymentIntentId(session);

    const settlementReady = await this.prisma.$transaction(async (tx) => {
      const validation = await this.validateCheckoutSettlement(tx, session, paymentRequestId, consumerId);
      if (!validation) {
        return false;
      }

      await this.ensureCardPaymentRail(tx, paymentRequestId, `stripe`);
      const entries = await tx.ledgerEntryModel.findMany({
        where: {
          paymentRequestId,
          type: { in: [...StripeWebhookSettlementsService.PAYMENT_REQUEST_SETTLEMENT_ENTRY_TYPES] },
        },
        select: {
          id: true,
          status: true,
          outcomes: {
            orderBy: { createdAt: `desc` },
            take: 1,
            select: { status: true },
          },
        },
      });
      for (const entry of entries) {
        if (this.getEffectiveStatus(entry) === $Enums.TransactionStatus.COMPLETED) continue;
        await createOutcomeIdempotent(
          tx,
          {
            ledgerEntryId: entry.id,
            status: $Enums.TransactionStatus.COMPLETED,
            source: `stripe`,
            externalId: paymentIntentId ?? undefined,
          },
          this.logger,
        );
      }
      await tx.paymentRequestModel.updateMany({
        where: {
          id: paymentRequestId,
          OR: [{ status: { not: $Enums.TransactionStatus.COMPLETED } }, { paymentRail: null }],
        },
        data: {
          status: $Enums.TransactionStatus.COMPLETED,
          paymentRail: $Enums.PaymentRail.CARD,
          updatedBy: `stripe`,
        },
      });
      return true;
    });

    if (!settlementReady) return;

    const collectPaymentMethodFromCheckout =
      handlers?.collectPaymentMethodFromCheckout ?? (() => Promise.resolve(undefined));

    try {
      await collectPaymentMethodFromCheckout(session, consumerId);
    } catch {
      this.logger.warn({ message: `Failed to collect payment method from checkout session` });
    }
  }

  private getEffectiveStatus(entry: {
    status: $Enums.TransactionStatus;
    outcomes?: Array<{ status: $Enums.TransactionStatus }>;
  }): $Enums.TransactionStatus {
    return entry.outcomes?.[0]?.status ?? entry.status;
  }

  private getPaymentIntentId(session: Stripe.Checkout.Session): string | null {
    if (!session.payment_intent) return null;
    return typeof session.payment_intent === `string` ? session.payment_intent : (session.payment_intent.id ?? null);
  }

  private getCustomerId(session: Stripe.Checkout.Session): string | null {
    if (!session.customer) return null;
    return typeof session.customer === `string` ? session.customer : (session.customer.id ?? null);
  }

  private async validateCheckoutSettlement(
    tx: Pick<Prisma.TransactionClient, `paymentRequestModel`>,
    session: Stripe.Checkout.Session,
    paymentRequestId: string,
    consumerId: string,
  ): Promise<boolean> {
    if (session.payment_status !== `paid`) {
      this.logger.warn({ message: `Skipping unpaid checkout settlement`, checkoutSessionId: session.id });
      return false;
    }

    const paymentRequest = await tx.paymentRequestModel.findUnique({
      where: { id: paymentRequestId },
      select: {
        amount: true,
        currencyCode: true,
        payerId: true,
        payer: {
          select: {
            stripeCustomerId: true,
          },
        },
      },
    });

    if (!paymentRequest || paymentRequest.payerId !== consumerId) {
      this.logger.warn({
        message: `Skipping checkout settlement with mismatched payment request`,
        checkoutSessionId: session.id,
      });
      return false;
    }

    const expectedAmountMinor = Math.round(
      Number(paymentRequest.amount) * 10 ** getCurrencyFractionDigits(paymentRequest.currencyCode),
    );
    if (session.amount_total !== expectedAmountMinor) {
      this.logger.warn({
        message: `Skipping checkout settlement with mismatched amount`,
        checkoutSessionId: session.id,
      });
      return false;
    }

    if (session.currency?.toUpperCase() !== paymentRequest.currencyCode) {
      this.logger.warn({
        message: `Skipping checkout settlement with mismatched currency`,
        checkoutSessionId: session.id,
      });
      return false;
    }

    const sessionCustomerId = this.getCustomerId(session);
    const expectedCustomerId = paymentRequest.payer?.stripeCustomerId ?? null;
    if (expectedCustomerId && sessionCustomerId && sessionCustomerId !== expectedCustomerId) {
      this.logger.warn({
        message: `Skipping checkout settlement with mismatched customer`,
        checkoutSessionId: session.id,
      });
      return false;
    }

    return true;
  }

  private async ensureCardPaymentRail(
    tx: Pick<Prisma.TransactionClient, `paymentRequestModel`>,
    paymentRequestId: string,
    updatedBy: string,
  ) {
    await tx.paymentRequestModel.updateMany({
      where: { id: paymentRequestId, paymentRail: null },
      data: {
        paymentRail: $Enums.PaymentRail.CARD,
        updatedBy,
      },
    });
  }
}
