import { Injectable } from '@nestjs/common';
import { ISendMailOptions, MailerService } from '@nestjs-modules/mailer';

import { generatePdf } from '../shared-common';
import {
  forgotPassword,
  googleOAuthTmpPassword,
  invitation,
  invoiceToHtml,
  outgoingInvoiceToHtml,
  paymentRequest,
  payToContactPaymentInfo,
  signupCompletionToHtml,
} from './mailing-utils';
import { envs } from '../envs';

@Injectable()
export class MailingService {
  private readonly logger = console;

  constructor(private mailerService: MailerService) {}

  async sendLogsEmail(data: any = null) {
    const html = `<pre><code>${JSON.stringify({ ...data }, null, 2)}</code></pre>`;
    const subject = `WB Logs`;
    try {
      const sent = await this.mailerService.sendMail({ to: process.env.ADMIN_EMAIL!, subject, html });
      this.logger.log(`Email "${subject}" successfully sent to: ${sent.envelope.to.join(` & `)}`);
    } catch (error) {
      this.logger.error(error);
    }
  }

  async sendConsumerSignupVerificationEmail(params: { email: string; token: string; referer: string }) {
    let backendBaseURL = process.env.NEST_APP_EXTERNAL_ORIGIN! || `http://[::1]:3333/api`;
    if (envs.VERCEL !== 0) backendBaseURL = `https://remoola-turbo-2-api.vercel.app/api`;

    const emailConfirmationUrl = new URL(`${backendBaseURL}/consumer/auth/signup/verification`);
    emailConfirmationUrl.search = new URLSearchParams(params).toString();

    const html = signupCompletionToHtml.processor(emailConfirmationUrl.toString());
    const subject = `Welcome to Wirebill! Confirm your Email`;
    try {
      const sent = await this.mailerService.sendMail({ to: params.email, subject, html });
      this.logger.log(`Email "${subject}" successfully sent to: ${sent.envelope.to.join(` & `)}`);
    } catch (error) {
      this.logger.error(error);
    }
  }

  async sendOutgoingInvoiceEmail(invoice: any /* CONSUMER.InvoiceResponse */) {
    const html = outgoingInvoiceToHtml.processor(invoice);
    const content = await generatePdf({ rawHtml: invoiceToHtml.processor(invoice) });
    const subject = `NEW INVOICE #${invoice.id}`;
    const attachments: ISendMailOptions[`attachments`] = [{ content, filename: `invoice-${invoice.id}.pdf` }];
    try {
      const sent = await this.mailerService.sendMail({ to: invoice.referer, subject, html, attachments });
      this.logger.log(`Email "${subject}" successfully sent to: ${sent.envelope.to.join(` & `)}`);
    } catch (error) {
      this.logger.error(error);
    }
  }

  async sendConsumerTemporaryPasswordForGoogleOAuth(params: { email: string }) {
    const html = googleOAuthTmpPassword.processor();
    const subject = `Welcome to Wirebill! You successfully registered through Google OAuth`;
    try {
      const sent = await this.mailerService.sendMail({ to: params.email, subject, html });
      this.logger.log(`Email "${subject}" successfully sent to: ${sent.envelope.to.join(` & `)}`);
    } catch (error) {
      this.logger.error(error);
    }
  }

  async sendForgotPasswordEmail(params: { forgotPasswordLink: string; email: string }) {
    const html = forgotPassword.processor(params.forgotPasswordLink);
    const subject = `Wirebill. Password recovery`;
    try {
      const sent = await this.mailerService.sendMail({ to: params.email, subject, html });
      this.logger.log(`Email "${subject}" successfully sent to: ${sent.envelope.to.join(` & `)}`);
    } catch (error) {
      this.logger.error(error);
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
      const sent = await this.mailerService.sendMail({ to: params.contactEmail, subject, html });
      this.logger.log(`Email "${subject}" successfully sent to: ${sent.envelope.to.join(` & `)}`);
    } catch (error) {
      this.logger.error(error);
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
    const origin =
      envs.CONSUMER_APP_ORIGIN && envs.CONSUMER_APP_ORIGIN !== `CONSUMER_APP_ORIGIN`
        ? envs.CONSUMER_APP_ORIGIN
        : envs.CORS_ALLOWED_ORIGINS?.[0];

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
      const sent = await this.mailerService.sendMail({ to: params.payerEmail, subject, html });
      this.logger.log(`Email "${subject}" successfully sent to: ${sent.envelope.to.join(` & `)}`);
    } catch (error) {
      this.logger.error(error);
    }
  }

  async sendInvitationEmail(params: { email: string; signupLink: string }) {
    const html = invitation.processor(params);
    const subject = `Wirebill. Invitation`;
    try {
      const sent = await this.mailerService.sendMail({ to: params.email, subject, html });
      this.logger.log(`Email "${subject}" successfully sent to: ${sent.envelope.to.join(` & `)}`);
    } catch (error) {
      this.logger.error(error);
    }
  }
}
