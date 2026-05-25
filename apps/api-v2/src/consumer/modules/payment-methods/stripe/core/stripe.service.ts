import {
  Inject,
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import Stripe from 'stripe';

import { sanitizeNextForRedirect } from '@remoola/api-types';
import { errorCodes } from '@remoola/shared-constants';

import { StripeCustomerAccessRepository } from './stripe-customer-access.repository';
import { StripePaymentOutcomesRepository } from './stripe-payment-outcomes.repository';
import { StripePaymentRequestAccessRepository } from './stripe-payment-request-access.repository';
import { StripeSavedPaymentMethodsRepository } from './stripe-saved-payment-methods.repository';
import { StripeSetupIntentPersistenceRepository } from './stripe-setup-intent-persistence.repository';
import { STRIPE_CLIENT } from '../../../../../shared/stripe-client';
import { getCurrencyFractionDigits } from '../../../../../shared-common';
import { ConfirmStripeSetupIntent, PayWithSavedPaymentMethod } from '../../dto/payment-method.dto';
type StripeSessionRedirectContext = {
  contractId?: string | null;
  returnTo?: string | null;
};

@Injectable()
export class ConsumerStripeService {
  private readonly logger = new Logger(ConsumerStripeService.name);

  constructor(
    @Inject(STRIPE_CLIENT) private readonly stripe: Stripe,
    private readonly customerAccessRepository: StripeCustomerAccessRepository,
    private readonly paymentOutcomesRepository: StripePaymentOutcomesRepository,
    private readonly paymentRequestAccessRepository: StripePaymentRequestAccessRepository,
    private readonly savedPaymentMethodsRepository: StripeSavedPaymentMethodsRepository,
    private readonly setupIntentPersistenceRepository: StripeSetupIntentPersistenceRepository,
  ) {}

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
    await this.savedPaymentMethodsRepository.invalidateNonReusableSavedMethod(paymentMethodId);
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
    return this.paymentRequestAccessRepository.getPaymentRequestForPayer(consumerId, paymentRequestId);
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

    await this.paymentRequestAccessRepository.ensureCardPaymentRailForRequest(pr.id, consumerId);
    await this.paymentOutcomesRepository.appendCheckoutWaitingOutcomes({
      paymentRequestId: pr.id,
      checkoutSessionId: session.id,
      logger: this.logger,
    });

    return { url: session.url };
  }

  private async ensureStripeCustomer(consumerId: string) {
    const consumer = await this.customerAccessRepository.findConsumer(consumerId);

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

    const claimed = await this.customerAccessRepository.claimStripeCustomerId(consumer.id, customer.id);
    if (!claimed) {
      const existing = await this.customerAccessRepository.findStripeCustomerId(consumer.id);
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

    return this.setupIntentPersistenceRepository.persistSetupIntentPaymentMethod({
      consumerId,
      consumerEmail: consumer.email,
      stripePaymentMethodId: pm.id,
      stripeFingerprint: pm.card.fingerprint || null,
      brand: pm.card.brand ?? `card`,
      last4: pm.card.last4 ?? ``,
      expMonth: pm.card.exp_month,
      expYear: pm.card.exp_year,
      billingDetails: {
        email: pm.billing_details?.email ?? null,
        name: pm.billing_details?.name ?? null,
        phone: pm.billing_details?.phone ?? null,
      },
    });
  }

  async payWithSavedPaymentMethod(
    consumerId: string,
    paymentRequestId: string,
    body: PayWithSavedPaymentMethod,
    idempotencyKey: string,
  ) {
    const paymentMethod = await this.savedPaymentMethodsRepository.findActiveSavedPaymentMethod(
      consumerId,
      body.paymentMethodId,
    );

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
        await this.paymentOutcomesRepository.markSavedMethodPaymentCompleted({
          paymentRequestId,
          paymentIntentId: paymentIntent.id,
          logger: this.logger,
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
        await this.paymentOutcomesRepository.appendDeniedSavedMethodPaymentOutcomes({
          paymentRequestId: pr.id,
          logger: this.logger,
        });
        throw new BadRequestException(`Payment could not be completed`);
      }

      throw new InternalServerErrorException(`Payment could not be completed`);
    }
  }
}
