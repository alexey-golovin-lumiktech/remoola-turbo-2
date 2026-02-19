import { randomUUID } from 'crypto';

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import Stripe from 'stripe';

import { $Enums, Prisma } from '@remoola/database-2';
import { errorCodes } from '@remoola/shared-constants';

import { ConfirmStripeSetupIntent, PayWithSavedPaymentMethod } from './dto/payment-method.dto';
import { envs } from '../../../envs';
import { PrismaService } from '../../../shared/prisma.service';
import { getCurrencyFractionDigits } from '../../../shared-common';

@Injectable()
export class ConsumerStripeService {
  private stripe: Stripe;

  constructor(private prisma: PrismaService) {
    this.stripe = new Stripe(envs.STRIPE_SECRET_KEY, { apiVersion: `2025-11-17.clover` });
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
              // Another request created this entry (race); continue
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
                type: $Enums.LedgerEntryType.USER_PAYMENT,
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
              // Another request created this entry (race); continue
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

  async createStripeSession(consumerId: string, paymentRequestId: string, frontendBaseUrl: string) {
    const pr = await this.getPaymentRequestForPayer(consumerId, paymentRequestId);

    const digits = getCurrencyFractionDigits(pr.currencyCode);
    const amountMinor = Math.round(Number(pr.amount) * 10 ** digits);

    // 1) Create Stripe Checkout session
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: [`card`],
      mode: `payment`,
      line_items: [
        {
          price_data: {
            currency: pr.currencyCode.toLowerCase(),
            product_data: {
              name: `Payment to ${pr.requester.email}`,
            },
            unit_amount: amountMinor,
          },
          quantity: 1,
        },
      ],
      success_url: `${frontendBaseUrl}/payments/${pr.id}?success=1`,
      cancel_url: `${frontendBaseUrl}/payments/${pr.id}?canceled=1`,
      metadata: { paymentRequestId: pr.id, consumerId },
    });

    // 2) Update transaction to Waiting status
    await this.prisma.ledgerEntryModel.updateMany({
      where: { paymentRequestId: pr.id },
      data: { status: `WAITING`, stripeId: session.id },
    });

    return { url: session.url };
  }

  async getPaymentMethodMetadata(paymentMethodId: string) {
    const pm = await this.stripe.paymentMethods.retrieve(paymentMethodId);

    return {
      brand: pm.card?.brand,
      last4: pm.card?.last4,
      expMonth: pm.card?.exp_month?.toString(),
      expYear: pm.card?.exp_year?.toString(),
    };
  }

  private async ensureStripeCustomer(consumerId: string) {
    const consumer = await this.prisma.consumerModel.findUnique({
      where: { id: consumerId },
    });

    if (!consumer) throw new BadRequestException(errorCodes.CONSUMER_NOT_FOUND_STRIPE);

    if (consumer.stripeCustomerId) {
      return { consumer, customerId: consumer.stripeCustomerId };
    }

    const customer = await this.stripe.customers.create({
      email: consumer.email,
    });

    await this.prisma.consumerModel.update({
      where: { id: consumer.id },
      data: { stripeCustomerId: customer.id },
    });

    return { consumer, customerId: customer.id };
  }

  // 1) Create SetupIntent for new card
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

  // 2) Confirm SetupIntent -> persist card in DB
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
      where: { consumerId, deletedAt: null, defaultSelected: true },
    });

    const created = await this.prisma.paymentMethodModel.create({
      data: {
        type: $Enums.PaymentMethodType.CREDIT_CARD,
        stripePaymentMethodId: pm.id, // Store the Stripe payment method ID for reuse
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

  // Pay with saved payment method
  async payWithSavedPaymentMethod(consumerId: string, paymentRequestId: string, body: PayWithSavedPaymentMethod) {
    // 1) Validate payment method belongs to consumer
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

    // 2) Double-check that the payment method is attached to customer
    try {
      const { customerId } = await this.ensureStripeCustomer(consumerId);
      const stripePaymentMethod = await this.stripe.paymentMethods.retrieve(paymentMethod.stripePaymentMethodId);

      // Check if payment method is attached to our customer
      if (stripePaymentMethod.customer !== customerId) {
        // Try to attach it
        try {
          await this.stripe.paymentMethods.attach(paymentMethod.stripePaymentMethodId, {
            customer: customerId,
          });
          console.warn(`Attached orphaned payment method to customer:`, paymentMethod.id);
        } catch (attachError: any) {
          if (
            attachError.type === `invalid_request_error` &&
            attachError.message.includes(`previously used without being attached`)
          ) {
            // This payment method cannot be used - mark as deleted
            await this.prisma.paymentMethodModel.update({
              where: { id: paymentMethod.id },
              data: {
                deletedAt: new Date(),
                stripePaymentMethodId: null,
              },
            });
            throw new BadRequestException(errorCodes.PAYMENT_METHOD_CANNOT_REUSE_ATTACH);
          }
          throw attachError;
        }
      }
    } catch (error: any) {
      if (error.type === `invalid_request_error` && error.message.includes(`previously used without being attached`)) {
        // Mark as deleted and inform user
        await this.prisma.paymentMethodModel.update({
          where: { id: paymentMethod.id },
          data: {
            deletedAt: new Date(),
            stripePaymentMethodId: null,
          },
        });
        throw new BadRequestException(errorCodes.PAYMENT_METHOD_CANNOT_REUSE_VERIFY);
      }
      throw error;
    }

    // 3) Get payment request details
    const pr = await this.getPaymentRequestForPayer(consumerId, paymentRequestId);

    // 4) Ensure Stripe customer exists
    const { customerId } = await this.ensureStripeCustomer(consumerId);

    const digits = getCurrencyFractionDigits(pr.currencyCode);
    const amountMinor = Math.round(Number(pr.amount) * 10 ** digits);

    try {
      // 5) Create and confirm payment intent with saved payment method
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amountMinor,
        currency: pr.currencyCode.toLowerCase(),
        customer: customerId,
        payment_method: paymentMethod.stripePaymentMethodId,
        confirm: true, // Confirm immediately since payment method is saved
        off_session: true, // This is an off-session payment
        metadata: {
          paymentRequestId: pr.id,
          consumerId,
          paymentMethodId: paymentMethod.id,
        },
        description: `Payment to ${pr.requester.email}`,
      });

      // 6) Update database records only if not already COMPLETED (idempotent if webhook also runs)
      if (paymentIntent.status === `succeeded`) {
        await this.prisma.$transaction(async (tx) => {
          await tx.ledgerEntryModel.updateMany({
            where: {
              paymentRequestId: pr.id,
              status: { not: $Enums.TransactionStatus.COMPLETED },
            },
            data: {
              status: $Enums.TransactionStatus.COMPLETED,
              stripeId: paymentIntent.id,
              updatedBy: `stripe`,
            },
          });
          await tx.paymentRequestModel.updateMany({
            where: { id: paymentRequestId, status: { not: $Enums.TransactionStatus.COMPLETED } },
            data: {
              status: $Enums.TransactionStatus.COMPLETED,
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
        // Handle cases where payment intent requires additional action
        return {
          success: false,
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.status,
          nextAction: paymentIntent.next_action,
        };
      }
    } catch (error) {
      // Handle Stripe errors
      console.error(`Payment with saved payment method failed:`, error);

      // Update ledger entries to failed status
      await this.prisma.ledgerEntryModel.updateMany({
        where: { paymentRequestId: pr.id },
        data: {
          status: $Enums.TransactionStatus.DENIED,
          updatedBy: `stripe`,
        },
      });

      throw error;
    }
  }
}
