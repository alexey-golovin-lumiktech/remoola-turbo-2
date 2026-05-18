import { Injectable, Logger } from '@nestjs/common';

import { type ConsumerAppScope } from '@remoola/api-types';

import { MailTransportSenderService } from './mail-transport-sender.service';
import { paymentChargeback, paymentRefund, paymentRequest } from './mailing-utils';
import { OriginResolverService } from './origin-resolver.service';

export type PaymentRequestEmailParams = {
  payerEmail: string;
  requesterEmail: string;
  amount: number;
  currencyCode: string;
  description?: string | null;
  dueDate?: Date | null;
  paymentRequestId: string;
  consumerAppScope?: ConsumerAppScope;
};

export type PaymentReversalEmailParams = {
  recipientEmail: string;
  counterpartyEmail: string;
  amount: number;
  currencyCode: string;
  reason?: string | null;
  paymentRequestId: string;
  role: `payer` | `requester`;
  consumerAppScope?: ConsumerAppScope;
};

@Injectable()
export class PaymentMailingService {
  private readonly logger = new Logger(PaymentMailingService.name);

  constructor(
    private readonly mailTransportSender: MailTransportSenderService,
    private readonly originResolver: OriginResolverService,
  ) {}

  private resolveConsumerPaymentLinkOrigin(consumerAppScope?: ConsumerAppScope): string | null {
    if (!consumerAppScope) {
      return null;
    }
    return this.originResolver.resolveConsumerOriginByScope(consumerAppScope) ?? null;
  }

  async sendPaymentRequestEmail(params: PaymentRequestEmailParams) {
    const origin = this.resolveConsumerPaymentLinkOrigin(params.consumerAppScope);

    if (!origin) {
      this.logger.error(`CONSUMER_CSS_GRID_APP_ORIGIN is not configured`);
      return;
    }

    const paymentRequestLink = new URL(`/payments/${params.paymentRequestId}`, origin).toString();
    const descriptionLine = params.description ? `Description: ${params.description}` : `Description: —`;
    const dueDateLine = params.dueDate ? `Due date: ${params.dueDate.toISOString().slice(0, 10)}` : `Due date: —`;

    const html = paymentRequest.processor({
      payerEmail: params.payerEmail,
      requesterEmail: params.requesterEmail,
      amount: params.amount.toFixed(2),
      currencyCode: params.currencyCode,
      descriptionLine,
      dueDateLine,
      paymentRequestLink,
    });

    const subject = `Wirebill. Payment request from ${params.requesterEmail}`;
    await this.mailTransportSender.sendEmailWithErrorHandling(`sendPaymentRequestEmail`, {
      to: params.payerEmail,
      subject,
      html,
    });
  }

  async sendPaymentRefundEmail(params: PaymentReversalEmailParams) {
    const origin = this.resolveConsumerPaymentLinkOrigin(params.consumerAppScope);

    if (!origin) {
      this.logger.error(`CONSUMER_CSS_GRID_APP_ORIGIN is not configured`);
      return;
    }

    const { html, subject } = this.buildPaymentRefundEmail(params, origin);
    await this.mailTransportSender.sendEmailWithErrorHandling(`sendPaymentRefundEmail`, {
      to: params.recipientEmail,
      subject,
      html,
    });
  }

  async sendPaymentRefundEmailRequired(params: PaymentReversalEmailParams) {
    const origin = this.resolveConsumerPaymentLinkOrigin(params.consumerAppScope);

    if (!origin) {
      throw new Error(`CONSUMER_CSS_GRID_APP_ORIGIN is not configured`);
    }

    const { html, subject } = this.buildPaymentRefundEmail(params, origin);
    await this.mailTransportSender.sendEmailOrThrow(`sendPaymentRefundEmail`, {
      to: params.recipientEmail,
      subject,
      html,
    });
  }

  async sendPaymentChargebackEmail(params: PaymentReversalEmailParams) {
    const origin = this.resolveConsumerPaymentLinkOrigin(params.consumerAppScope);

    if (!origin) {
      this.logger.error(`CONSUMER_CSS_GRID_APP_ORIGIN is not configured`);
      return;
    }

    const { html, subject } = this.buildPaymentChargebackEmail(params, origin);
    await this.mailTransportSender.sendEmailWithErrorHandling(`sendPaymentChargebackEmail`, {
      to: params.recipientEmail,
      subject,
      html,
    });
  }

  async sendPaymentChargebackEmailRequired(params: PaymentReversalEmailParams) {
    const origin = this.resolveConsumerPaymentLinkOrigin(params.consumerAppScope);

    if (!origin) {
      throw new Error(`CONSUMER_CSS_GRID_APP_ORIGIN is not configured`);
    }

    const { html, subject } = this.buildPaymentChargebackEmail(params, origin);
    await this.mailTransportSender.sendEmailOrThrow(`sendPaymentChargebackEmail`, {
      to: params.recipientEmail,
      subject,
      html,
    });
  }

  private buildPaymentRefundEmail(params: PaymentReversalEmailParams, origin: string) {
    const paymentRequestLink = new URL(`/payments/${params.paymentRequestId}`, origin).toString();
    const summaryLine =
      params.role === `payer`
        ? `Your payment to ${params.counterpartyEmail} was refunded.`
        : `A payment from ${params.counterpartyEmail} was refunded.`;
    const reasonLine = params.reason ? `Reason: ${params.reason}` : `Reason: —`;

    return {
      subject: `Wirebill. Payment refund`,
      html: paymentRefund.processor({
        recipientEmail: params.recipientEmail,
        summaryLine,
        amount: params.amount.toFixed(2),
        currencyCode: params.currencyCode,
        reasonLine,
        paymentRequestLink,
      }),
    };
  }

  private buildPaymentChargebackEmail(params: PaymentReversalEmailParams, origin: string) {
    const paymentRequestLink = new URL(`/payments/${params.paymentRequestId}`, origin).toString();
    const summaryLine =
      params.role === `payer`
        ? `A chargeback was recorded for your payment to ${params.counterpartyEmail}.`
        : `A chargeback was recorded for a payment from ${params.counterpartyEmail}.`;
    const reasonLine = params.reason ? `Reason: ${params.reason}` : `Reason: —`;

    return {
      subject: `Wirebill. Chargeback update`,
      html: paymentChargeback.processor({
        recipientEmail: params.recipientEmail,
        summaryLine,
        amount: params.amount.toFixed(2),
        currencyCode: params.currencyCode,
        reasonLine,
        paymentRequestLink,
      }),
    };
  }
}
