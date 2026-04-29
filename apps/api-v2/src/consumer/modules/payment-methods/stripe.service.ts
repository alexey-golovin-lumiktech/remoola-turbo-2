import { randomUUID } from 'crypto';

import {
  Inject,
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import Stripe from 'stripe';

import { sanitizeNextForRedirect } from '@remoola/api-types';
import { $Enums, Prisma } from '@remoola/database-2';
import { errorCodes } from '@remoola/shared-constants';

import { ConfirmStripeSetupIntent, PayWithSavedPaymentMethod } from './dto/payment-method.dto';
import { createOutcomeIdempotent } from './ledger-outcome-idempotent';
import { PrismaService } from '../../../shared/prisma.service';
import { STRIPE_CLIENT } from '../../../shared/stripe-client';
import { getCurrencyFractionDigits } from '../../../shared-common';

type PaymentRequestSettlementTransitionClient = Pick<Prisma.TransactionClient, `paymentRequestModel`>;
type StripeSessionRedirectContext = {
  contractId?: string | null;
  returnTo?: string | null;
};

@Injectable()
export class ConsumerStripeService {
  private readonly logger = new Logger(ConsumerStripeService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(STRIPE_CLIENT) private readonly stripe: Stripe,
  ) {}

  private getEffectiveStatus(entry: {
    status: $Enums.TransactionStatus;
    outcomes?: Array<{ status: $Enums.TransactionStatus }>;
  }): $Enums.TransactionStatus {
    return entry.outcomes?.[0]?.status ?? entry.status;
  }

  private getRequesterSettlementEntryTypeForCard(): $Enums.LedgerEntryType {
    return $Enums.LedgerEntryType.USER_DEPOSIT;
  }

  private async ensureCardPaymentRail(
    client: PaymentRequestSettlementTransitionClient,
    paymentRequestId: string,
    updatedBy: string,
  ) {
    await client.paymentRequestModel.updateMany({
      where: { id: paymentRequestId, paymentRail: null },
      data: {
        paymentRail: $Enums.PaymentRail.CARD,
        updatedBy,
      },
    });
  }

  private isTransientStripeError(error: unknown): boolean {
    if (!(error instanceof Stripe.errors.StripeError)) return false;
    return (
      error.type === `StripeAPIError` ||
      error.type === `StripeConnectionError` ||
      error.type === `StripeRateLimitError` ||
      error.type === `StripeIdempotencyError`
    );
  }

  private shouldAppendDeniedOutcome(error: unknown): boolean {
    if (error instanceof Stripe.errors.StripeError) {
      return error.type === `StripeCardError`;
    }
    if (typeof error === `object` && error != null && `type` in error) {
      return (error as { type?: unknown }).type === `StripeCardError`;
    }
    return false;
  }

  private buildStripeSessionReturnUrl(
    frontendBaseUrl: string,
    paymentRequestId: string,
    outcome: `success` | `canceled`,
    context?: StripeSessionRedirectContext,
  ) {
    const url = new URL(`${frontendBaseUrl}/payments/${paymentRequestId}`);
    const contractId = context?.contractId?.trim() ?? ``;
    const returnTo = sanitizeNextForRedirect(context?.returnTo, ``);

    if (contractId) {
      url.searchParams.set(`contractId`, contractId);
    }
    if (returnTo) {
      url.searchParams.set(`returnTo`, returnTo);
    } else if (contractId) {
      url.searchParams.set(`returnTo`, `/contracts/${contractId}`);
    }
    url.searchParams.set(outcome, `1`);

    return url.toString();
  }

  private isNonReusableSavedMethodError(error: unknown): boolean {
    const stripeType = error instanceof Stripe.errors.StripeError ? error.type : null;
    const err = error as { type?: string; message?: string } | null | undefined;
    const normalizedType = (stripeType ?? err?.type ?? ``).toLowerCase();
    const normalizedMessage = (err?.message ?? ``).toLowerCase();

    if (!normalizedMessage) {
      return false;
    }

    const looksLikeInvalidRequest =
      normalizedType === `stripeinvalidrequesterror`.toLowerCase() || normalizedType === `invalid_request_error`;

    return (
      looksLikeInvalidRequest &&
      (normalizedMessage.includes(`previously used without being attached`) ||
        normalizedMessage.includes(`without customer attachment`) ||
        normalizedMessage.includes(`detached from a customer`) ||
        normalizedMessage.includes(`attach it to a customer first`))
    );
  }

  private async invalidateNonReusableSavedMethod(paymentMethodId: string) {
    await this.prisma.paymentMethodModel.update({
      where: { id: paymentMethodId },
      data: {
        deletedAt: new Date(),
        stripePaymentMethodId: null,
      },
    });
  }

  private buildCheckoutSessionIdempotencyKey(paymentRequestId: string): string {
    return `checkout-session:${paymentRequestId}`;
  }

  private buildSavedMethodIdempotencyKey(paymentRequestId: string): string {
    return `saved-method:${paymentRequestId}`;
  }

  private buildEnsureCustomerIdempotencyKey(consumerId: string): string {
    return `ensure-customer:${consumerId}`;
  }

  private async getPaymentRequestForPayer(consumerId: string, paymentRequestId: string) {
    const consumer = await this.prisma.consumerModel.findUnique({
      where: { id: consumerId },
      select: { email: true },
    });

    if (!consumer?.email) {
      throw new NotFoundException(errorCodes.PAYMENT_NOT_FOUND_STRIPE_CONSUMER);
    }

    const consumerEmail = consumer.email.trim().toLowerCase();

    await this.prisma.$transaction(async (tx) => {
      const paymentRequest = await tx.paymentRequestModel.findUnique({
        where: { id: paymentRequestId },
        include: { ledgerEntries: true },
      });

      if (!paymentRequest) {
        throw new NotFoundException(errorCodes.PAYMENT_NOT_FOUND_STRIPE_REQUEST);
      }

      const canAccessAsPayer =
        paymentRequest.payerId === consumerId ||
        (!paymentRequest.payerId &&
          !!paymentRequest.payerEmail &&
          paymentRequest.payerEmail.trim().toLowerCase() === consumerEmail);

      if (!canAccessAsPayer) {
        throw new NotFoundException(errorCodes.PAYMENT_NOT_FOUND_STRIPE_ACCESS);
      }

      if (paymentRequest.status !== $Enums.TransactionStatus.PENDING) {
        throw new ForbiddenException(errorCodes.PAYMENT_ALREADY_PROCESSED_CONFIRM);
      }

      if (!paymentRequest.payerId && paymentRequest.ledgerEntries.length > 0) {
        throw new BadRequestException(errorCodes.INVALID_LEDGER_STATE_EMAIL_PAYMENT_STRIPE);
      }

      if (!paymentRequest.payerId) {
        const claim = await tx.paymentRequestModel.updateMany({
          where: {
            id: paymentRequestId,
            payerId: null,
            payerEmail: { equals: consumerEmail, mode: `insensitive` },
          },
          data: {
            payerId: consumerId,
            updatedBy: consumerId,
          },
        });

        if (claim.count === 0) {
          throw new NotFoundException(errorCodes.PAYMENT_NOT_FOUND_STRIPE_CLAIM);
        }

        if (paymentRequest.ledgerEntries.length === 0) {
          if (!paymentRequest.requesterId) {
            throw new BadRequestException(errorCodes.INVALID_LEDGER_STATE_EMAIL_PAYMENT_STRIPE);
          }
          const amount = Number(paymentRequest.amount);
          const ledgerId = randomUUID();
          const payerKey = `pr:${paymentRequest.id}:payer`;
          const requesterKey = `pr:${paymentRequest.id}:requester`;

          try {
            await tx.ledgerEntryModel.create({
              data: {
                ledgerId,
                consumerId,
                paymentRequestId: paymentRequest.id,
                type: $Enums.LedgerEntryType.USER_PAYMENT,
                currencyCode: paymentRequest.currencyCode,
                status: $Enums.TransactionStatus.PENDING,
                amount: -amount,
                createdBy: consumerId,
                updatedBy: consumerId,
                idempotencyKey: payerKey,
                metadata: {
                  rail: $Enums.PaymentRail.CARD,
                  counterpartyId: paymentRequest.requesterId,
                },
              },
            });
          } catch (err) {
            if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === `P2002`) {
              // Another concurrent attempt already created the idempotent ledger entry.
            } else {
              throw err;
            }
          }

          try {
            await tx.ledgerEntryModel.create({
              data: {
                ledgerId,
                consumerId: paymentRequest.requesterId,
                paymentRequestId: paymentRequest.id,
                type: this.getRequesterSettlementEntryTypeForCard(),
                currencyCode: paymentRequest.currencyCode,
                status: $Enums.TransactionStatus.PENDING,
                amount: amount,
                createdBy: consumerId,
                updatedBy: consumerId,
                idempotencyKey: requesterKey,
                metadata: {
                  rail: $Enums.PaymentRail.CARD,
                  counterpartyId: consumerId,
                },
              },
            });
          } catch (err) {
            if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === `P2002`) {
              // Another concurrent attempt already created the idempotent ledger entry.
            } else {
              throw err;
            }
          }
        }
      }
    });

    const paymentRequest = await this.prisma.paymentRequestModel.findUnique({
      where: { id: paymentRequestId },
      include: {
        ledgerEntries: true,
        requester: true,
      },
    });

    if (!paymentRequest || paymentRequest.payerId !== consumerId) {
      throw new NotFoundException(errorCodes.PAYMENT_NOT_FOUND_STRIPE_CONFIRM);
    }

    if (paymentRequest.status !== $Enums.TransactionStatus.PENDING) {
      throw new ForbiddenException(errorCodes.PAYMENT_ALREADY_PROCESSED_PAY);
    }

    return paymentRequest;
  }

  async createStripeSession(
    consumerId: string,
    paymentRequestId: string,
    frontendBaseUrl: string,
    context?: StripeSessionRedirectContext,
  ) {
    const pr = await this.getPaymentRequestForPayer(consumerId, paymentRequestId);
    const { customerId } = await this.ensureStripeCustomer(consumerId);

    const digits = getCurrencyFractionDigits(pr.currencyCode);
    const amountMinor = Math.round(Number(pr.amount) * 10 ** digits);

    const session = await this.stripe.checkout.sessions.create(
      {
        payment_method_types: [`card`],
        mode: `payment`,
        customer: customerId,
        line_items: [
          {
            price_data: {
              currency: pr.currencyCode.toLowerCase(),
              product_data: {
                name: `Payment to ${pr.requester?.email ?? pr.requesterEmail ?? `recipient`}`,
              },
              unit_amount: amountMinor,
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          setup_future_usage: `off_session`,
        },
        success_url: this.buildStripeSessionReturnUrl(frontendBaseUrl, pr.id, `success`, context),
        cancel_url: this.buildStripeSessionReturnUrl(frontendBaseUrl, pr.id, `canceled`, context),
        metadata: { paymentRequestId: pr.id, consumerId },
      },
      { idempotencyKey: this.buildCheckoutSessionIdempotencyKey(pr.id) },
    );

    await this.ensureCardPaymentRail(this.prisma, pr.id, consumerId);

    const entries = await this.prisma.ledgerEntryModel.findMany({
      where: { paymentRequestId: pr.id },
      select: { id: true },
    });
    for (const entry of entries) {
      await createOutcomeIdempotent(
        this.prisma,
        {
          ledgerEntryId: entry.id,
          status: $Enums.TransactionStatus.WAITING,
          source: `stripe`,
          externalId: session.id,
        },
        this.logger,
      );
    }

    return { url: session.url };
  }

  private async ensureStripeCustomer(consumerId: string) {
    const consumer = await this.prisma.consumerModel.findUnique({
      where: { id: consumerId },
    });

    if (!consumer) throw new BadRequestException(errorCodes.CONSUMER_NOT_FOUND_STRIPE);

    if (consumer.stripeCustomerId) {
      return { consumer, customerId: consumer.stripeCustomerId };
    }

    const customer = await this.stripe.customers.create(
      {
        email: consumer.email,
      },
      { idempotencyKey: this.buildEnsureCustomerIdempotencyKey(consumer.id) },
    );

    const claimed = await this.prisma.consumerModel.updateMany({
      where: { id: consumer.id, stripeCustomerId: null },
      data: { stripeCustomerId: customer.id },
    });
    if (claimed.count === 0) {
      const existing = await this.prisma.consumerModel.findUnique({
        where: { id: consumer.id },
        select: { stripeCustomerId: true },
      });
      if (existing?.stripeCustomerId) {
        return { consumer, customerId: existing.stripeCustomerId };
      }
    }

    return { consumer, customerId: customer.id };
  }

  async createStripeSetupIntent(consumerId: string) {
    const { customerId } = await this.ensureStripeCustomer(consumerId);

    const intent = await this.stripe.setupIntents.create({
      customer: customerId,
      usage: `off_session`,
      payment_method_types: [`card`],
    });

    if (!intent.client_secret) {
      throw new BadRequestException(errorCodes.STRIPE_NO_CLIENT_SECRET);
    }

    return { clientSecret: intent.client_secret };
  }

  async confirmStripeSetupIntent(consumerId: string, body: ConfirmStripeSetupIntent) {
    const { consumer } = await this.ensureStripeCustomer(consumerId);

    const setupIntent = await this.stripe.setupIntents.retrieve(body.setupIntentId, { expand: [`payment_method`] });

    if (setupIntent.status !== `succeeded`) {
      throw new BadRequestException(errorCodes.STRIPE_SETUP_INTENT_NOT_SUCCEEDED);
    }

    const pm = setupIntent.payment_method;
    if (!pm || typeof pm === `string`) {
      throw new BadRequestException(errorCodes.STRIPE_NO_PAYMENT_METHOD);
    }

    if (pm.type !== `card` || !pm.card) {
      throw new BadRequestException(errorCodes.ONLY_CARD_PAYMENT_METHODS);
    }

    const card = pm.card;
    const billing = pm.billing_details ?? {};

    const billingDetails = await this.prisma.billingDetailsModel.create({
      data: {
        email: billing[`email`] ?? consumer.email,
        name: (billing[`name`] as string | null) ?? null,
        phone: (billing[`phone`] as string | null) ?? null,
      },
    });

    const hasDefault = await this.prisma.paymentMethodModel.count({
      where: {
        consumerId,
        deletedAt: null,
        type: $Enums.PaymentMethodType.CREDIT_CARD,
        defaultSelected: true,
      },
    });

    const created = await this.prisma.paymentMethodModel.create({
      data: {
        type: $Enums.PaymentMethodType.CREDIT_CARD,
        stripePaymentMethodId: pm.id,
        stripeFingerprint: pm.card?.fingerprint || null,
        defaultSelected: hasDefault === 0,
        brand: card.brand ?? `card`,
        last4: card.last4 ?? ``,
        serviceFee: 0,
        expMonth: card.exp_month ? String(card.exp_month).padStart(2, `0`) : null,
        expYear: card.exp_year ? String(card.exp_year) : null,
        billingDetailsId: billingDetails.id,
        consumerId,
      },
    });

    return created;
  }

  async payWithSavedPaymentMethod(
    consumerId: string,
    paymentRequestId: string,
    body: PayWithSavedPaymentMethod,
    idempotencyKey: string,
  ) {
    const paymentMethod = await this.prisma.paymentMethodModel.findFirst({
      where: {
        id: body.paymentMethodId,
        consumerId,
        deletedAt: null,
      },
      include: { billingDetails: true },
    });

    if (!paymentMethod) {
      throw new BadRequestException(errorCodes.PAYMENT_METHOD_NOT_FOUND);
    }

    if (!paymentMethod.stripePaymentMethodId) {
      throw new BadRequestException(errorCodes.PAYMENT_METHOD_CANNOT_REUSE_NO_ID);
    }

    try {
      const { customerId } = await this.ensureStripeCustomer(consumerId);
      const stripePaymentMethod = await this.stripe.paymentMethods.retrieve(paymentMethod.stripePaymentMethodId);

      if (stripePaymentMethod.customer !== customerId) {
        try {
          await this.stripe.paymentMethods.attach(paymentMethod.stripePaymentMethodId, {
            customer: customerId,
          });
          this.logger.warn({
            message: `Attached orphaned payment method to customer`,
            paymentMethodId: paymentMethod.id,
          });
        } catch (attachError: unknown) {
          if (this.isNonReusableSavedMethodError(attachError)) {
            // This payment method cannot be used again; hide it from future retries.
            await this.invalidateNonReusableSavedMethod(paymentMethod.id);
            throw new BadRequestException(errorCodes.PAYMENT_METHOD_CANNOT_REUSE_ATTACH);
          }
          throw new InternalServerErrorException(`Payment could not be completed`);
        }
      }
    } catch (error: unknown) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (this.isNonReusableSavedMethodError(error)) {
        await this.invalidateNonReusableSavedMethod(paymentMethod.id);
        throw new BadRequestException(errorCodes.PAYMENT_METHOD_CANNOT_REUSE_VERIFY);
      }
      throw new InternalServerErrorException(`Payment could not be completed`);
    }

    const pr = await this.getPaymentRequestForPayer(consumerId, paymentRequestId);

    const { customerId } = await this.ensureStripeCustomer(consumerId);

    const digits = getCurrencyFractionDigits(pr.currencyCode);
    const amountMinor = Math.round(Number(pr.amount) * 10 ** digits);

    try {
      const paymentIntent = await this.stripe.paymentIntents.create(
        {
          amount: amountMinor,
          currency: pr.currencyCode.toLowerCase(),
          customer: customerId,
          payment_method: paymentMethod.stripePaymentMethodId,
          confirm: true,
          off_session: true,
          metadata: {
            paymentRequestId: pr.id,
            consumerId,
            paymentMethodId: paymentMethod.id,
            clientIdempotencyKey: idempotencyKey,
          },
          description: `Payment to ${pr.requester?.email ?? pr.requesterEmail ?? `recipient`}`,
        },
        { idempotencyKey: this.buildSavedMethodIdempotencyKey(paymentRequestId) },
      );

      if (paymentIntent.status === `succeeded`) {
        await this.prisma.$transaction(async (tx) => {
          await this.ensureCardPaymentRail(tx, pr.id, `stripe`);
          const ledgerEntries = await tx.ledgerEntryModel.findMany({
            where: {
              paymentRequestId: pr.id,
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
          for (const entry of ledgerEntries) {
            if (this.getEffectiveStatus(entry) === $Enums.TransactionStatus.COMPLETED) continue;
            await createOutcomeIdempotent(
              tx,
              {
                ledgerEntryId: entry.id,
                status: $Enums.TransactionStatus.COMPLETED,
                source: `stripe`,
                externalId: paymentIntent.id,
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
        });

        return {
          success: true,
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.status,
        };
      } else {
        return {
          success: false,
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.status,
          nextAction: paymentIntent.next_action,
        };
      }
    } catch (error) {
      this.logger.warn({
        message: `Payment with saved payment method failed`,
        stripeErrorType: error instanceof Stripe.errors.StripeError ? error.type : null,
      });

      if (this.isTransientStripeError(error)) {
        throw new ServiceUnavailableException(`Payment processing temporarily unavailable`);
      }

      if (this.isNonReusableSavedMethodError(error)) {
        await this.invalidateNonReusableSavedMethod(paymentMethod.id);
        throw new BadRequestException(errorCodes.PAYMENT_METHOD_CANNOT_REUSE_VERIFY);
      }

      if (this.shouldAppendDeniedOutcome(error)) {
        // Append DENIED only for terminal card declines.
        await this.prisma.$transaction(async (tx) => {
          const entries = await tx.ledgerEntryModel.findMany({
            where: { paymentRequestId: pr.id },
            select: { id: true },
          });
          for (const entry of entries) {
            await createOutcomeIdempotent(
              tx,
              {
                ledgerEntryId: entry.id,
                status: $Enums.TransactionStatus.DENIED,
                source: `stripe`,
                externalId: `denied:stripe:pr:${pr.id}:entry:${entry.id}`,
              },
              this.logger,
            );
          }
        });
        throw new BadRequestException(`Payment could not be completed`);
      }

      throw new InternalServerErrorException(`Payment could not be completed`);
    }
  }
}
