import { Injectable, Logger } from '@nestjs/common';
import { ISendMailOptions, MailerService } from '@nestjs-modules/mailer';

import { generatePdf } from '../shared-common';
import {
  forgotPassword,
  invitation,
  invoiceToHtml,
  outgoingInvoiceToHtml,
  paymentRequest,
  payToContactPaymentInfo,
  paymentRefund,
  paymentChargeback,
  signupCompletionToHtml,
  type InvoiceForTemplate,
} from './mailing-utils';
import { envs } from '../envs';
import { OriginResolverService } from './origin-resolver.service';

@Injectable()
export class MailingService {
  private readonly logger = new Logger(MailingService.name);

  constructor(
    private mailerService: MailerService,
    private originResolver: OriginResolverService,
  ) {}

  async sendLogsEmail(data: unknown = null) {
    const html = `<pre><code>${JSON.stringify(data ?? {}, null, 2)}</code></pre>`;
    const subject = `WB Logs`;
    try {
      await this.mailerService.sendMail({ to: envs.ADMIN_EMAIL!, subject, html });
      this.logger.verbose(`Email sent successfully`);
    } catch {
      this.logger.error(`[sendLogsEmail] Email send failed`);
    }
  }

  async sendConsumerSignupVerificationEmail(params: { email: string; token: string; referer: string }) {
    let backendBaseURL = envs.NEST_APP_EXTERNAL_ORIGIN! || `http://[::1]:3333/api`;
    if (envs.VERCEL !== 0) {
      const base =
        envs.NEST_APP_EXTERNAL_ORIGIN && envs.NEST_APP_EXTERNAL_ORIGIN !== `NEST_APP_EXTERNAL_ORIGIN`
          ? envs.NEST_APP_EXTERNAL_ORIGIN.replace(/\/api\/?$/, ``)
          : `https://remoola-turbo-2-api.vercel.app`;
      backendBaseURL = `${base}/api`;
    }

    const emailConfirmationUrl = new URL(`${backendBaseURL}/consumer/auth/signup/verification`);
    emailConfirmationUrl.search = new URLSearchParams(params).toString();

    const html = signupCompletionToHtml.processor(emailConfirmationUrl.toString());
    const subject = `Welcome to Wirebill! Confirm your Email`;
    try {
      await this.mailerService.sendMail({ to: params.email, subject, html });
      this.logger.verbose(`Email sent successfully`);
    } catch {
      this.logger.error(`[sendConsumerSignupVerificationEmail] Email send failed`);
    }
  }

  async sendOutgoingInvoiceEmail(invoice: InvoiceForTemplate) {
    const html = outgoingInvoiceToHtml.processor(invoice);
    const content = await generatePdf({ rawHtml: invoiceToHtml.processor(invoice) });
    const subject = `NEW INVOICE #${invoice.id}`;
    const attachments: ISendMailOptions[`attachments`] = [{ content, filename: `invoice-${invoice.id}.pdf` }];
    try {
      await this.mailerService.sendMail({ to: invoice.referer, subject, html, attachments });
      this.logger.verbose(`Email sent successfully`);
    } catch {
      this.logger.error(`[sendOutgoingInvoiceEmail] Email send failed`);
    }
  }

  async sendPayToContactPaymentInfoEmail(params: {
    contactEmail: string;
    payerEmail: string;
    paymentDetailsLink: string;
  }) {
    const html = payToContactPaymentInfo.processor(params);
    const subject = `Wirebill. Payment`;
    try {
      await this.mailerService.sendMail({ to: params.contactEmail, subject, html });
      this.logger.verbose(`Email sent successfully`);
    } catch {
      this.logger.error(`[sendPayToContactPaymentInfoEmail] Email send failed`);
    }
  }

  async sendPaymentRequestEmail(params: {
    payerEmail: string;
    requesterEmail: string;
    amount: number;
    currencyCode: string;
    description?: string | null;
    dueDate?: Date | null;
    paymentRequestId: string;
  }) {
    const origin = this.originResolver.resolveConsumerOrigin();

    if (!origin) {
      this.logger.error(`CONSUMER_APP_ORIGIN is not configured`);
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

    try {
      await this.mailerService.sendMail({ to: params.payerEmail, subject, html });
      this.logger.verbose(`Email sent successfully`);
    } catch {
      this.logger.error(`[sendPaymentRequestEmail] Email send failed`);
    }
  }

  async sendPaymentRefundEmail(params: {
    recipientEmail: string;
    counterpartyEmail: string;
    amount: number;
    currencyCode: string;
    reason?: string | null;
    paymentRequestId: string;
    role: `payer` | `requester`;
  }) {
    const origin = this.originResolver.resolveConsumerOrigin();

    if (!origin) {
      this.logger.error(`CONSUMER_APP_ORIGIN is not configured`);
      return;
    }

    const paymentRequestLink = new URL(`/payments/${params.paymentRequestId}`, origin).toString();
    const summaryLine =
      params.role === `payer`
        ? `Your payment to ${params.counterpartyEmail} was refunded.`
        : `A payment from ${params.counterpartyEmail} was refunded.`;
    const reasonLine = params.reason ? `Reason: ${params.reason}` : `Reason: —`;

    const html = paymentRefund.processor({
      recipientEmail: params.recipientEmail,
      summaryLine,
      amount: params.amount.toFixed(2),
      currencyCode: params.currencyCode,
      reasonLine,
      paymentRequestLink,
    });

    const subject = `Wirebill. Payment refund`;

    try {
      await this.mailerService.sendMail({ to: params.recipientEmail, subject, html });
      this.logger.verbose(`Email sent successfully`);
    } catch {
      this.logger.error(`[sendPaymentRefundEmail] Email send failed`);
    }
  }

  async sendPaymentChargebackEmail(params: {
    recipientEmail: string;
    counterpartyEmail: string;
    amount: number;
    currencyCode: string;
    reason?: string | null;
    paymentRequestId: string;
    role: `payer` | `requester`;
  }) {
    const origin = this.originResolver.resolveConsumerOrigin();

    if (!origin) {
      this.logger.error(`CONSUMER_APP_ORIGIN is not configured`);
      return;
    }

    const paymentRequestLink = new URL(`/payments/${params.paymentRequestId}`, origin).toString();
    const summaryLine =
      params.role === `payer`
        ? `A chargeback was recorded for your payment to ${params.counterpartyEmail}.`
        : `A chargeback was recorded for a payment from ${params.counterpartyEmail}.`;
    const reasonLine = params.reason ? `Reason: ${params.reason}` : `Reason: —`;

    const html = paymentChargeback.processor({
      recipientEmail: params.recipientEmail,
      summaryLine,
      amount: params.amount.toFixed(2),
      currencyCode: params.currencyCode,
      reasonLine,
      paymentRequestLink,
    });

    const subject = `Wirebill. Chargeback update`;

    try {
      await this.mailerService.sendMail({ to: params.recipientEmail, subject, html });
      this.logger.verbose(`Email sent successfully`);
    } catch {
      this.logger.error(`[sendPaymentChargebackEmail] Email send failed`);
    }
  }

  async sendInvitationEmail(params: { email: string; signupLink: string }) {
    const html = invitation.processor(params);
    const subject = `Wirebill. Invitation`;
    try {
      await this.mailerService.sendMail({ to: params.email, subject, html });
      this.logger.verbose(`Email sent successfully`);
    } catch {
      this.logger.error(`[sendInvitationEmail] Email send failed`);
    }
  }

  async sendConsumerForgotPasswordEmail(params: { email: string; forgotPasswordLink: string }) {
    this.logger.verbose(`sendConsumerForgotPasswordEmail START`);
    const html = forgotPassword.processor(params.forgotPasswordLink);
    const subject = `Wirebill – Reset your password`;
    try {
      this.logger.verbose(`sendConsumerForgotPasswordEmail BEFORE`);
      await this.mailerService.sendMail({ to: params.email, subject, html });
      this.logger.verbose(`Email sent successfully`);
    } catch {
      this.logger.error(`[sendConsumerForgotPasswordEmail] Email send failed`);
    }
  }
}
