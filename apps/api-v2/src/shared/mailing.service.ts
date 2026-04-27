import { Injectable, Logger } from '@nestjs/common';

import { CURRENT_CONSUMER_APP_SCOPE, type ConsumerAppScope } from '@remoola/api-types';

import { generatePdf } from '../shared-common';
import { BrevoMailService, type BrevoAttachment, type BrevoSendMailOptions } from './brevo-mail.service';
import {
  forgotPassword,
  googleSignInRecovery,
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
import { resolveEmailApiBaseUrl } from './resolve-email-api-base-url';

function escapeHtml(value: string): string {
  return value
    .replaceAll(`&`, `&amp;`)
    .replaceAll(`<`, `&lt;`)
    .replaceAll(`>`, `&gt;`)
    .replaceAll(`"`, `&quot;`)
    .replaceAll(`'`, `&#39;`);
}

@Injectable()
export class MailingService {
  private readonly logger = new Logger(MailingService.name);

  constructor(
    private brevoMailService: BrevoMailService,
    private originResolver: OriginResolverService,
  ) {}

  private formatUnknownError(error: unknown): string {
    if (error instanceof Error) {
      return `${error.name}: ${error.message}`;
    }

    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  /** Safe summary of error.cause for logging (code, errno, syscall only; no message/stack/URLs). */
  private safeCauseSummary(cause: unknown): Record<string, unknown> | undefined {
    if (cause == null || typeof cause !== `object`) return undefined;
    const obj = cause as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    if (typeof obj.code === `string`) out.code = obj.code;
    if (typeof obj.errno === `number`) out.errno = obj.errno;
    if (typeof obj.syscall === `string`) out.syscall = obj.syscall;
    return Object.keys(out).length > 0 ? out : undefined;
  }

  private logEmailFailure(context: string, error: unknown): void {
    if (error instanceof Error) {
      const causeSummary = this.safeCauseSummary(error.cause);
      const causeSuffix = causeSummary != null ? ` cause: ${JSON.stringify(causeSummary)}` : ``;
      this.logger.error(`[${context}] Email operation failed: ${error.message}${causeSuffix}`, error.stack);
      if (causeSummary?.code === `UND_ERR_SOCKET` || causeSummary?.code === `ECONNRESET`) {
        this.logger.warn(
          `[${context}] Socket/network error: check outbound connectivity
          (e.g. Lambda VPC NAT, Vercel) and Brevo API reachability.`,
        );
      }
      return;
    }

    this.logger.error(`[${context}] Email operation failed with non-Error value: ${this.formatUnknownError(error)}`);
  }

  private isEmailTransportConfigured(): boolean {
    return (
      envs.BREVO_API_KEY.trim().length > 0 &&
      envs.BREVO_API_KEY !== `BREVO_API_KEY` &&
      envs.BREVO_DEFAULT_FROM_EMAIL.trim().length > 0 &&
      envs.BREVO_DEFAULT_FROM_EMAIL !== `BREVO_DEFAULT_FROM_EMAIL`
    );
  }

  private async trySendEmail(context: string, options: BrevoSendMailOptions): Promise<boolean> {
    if (!this.isEmailTransportConfigured()) {
      this.logger.warn(`[${context}] Email transport is not configured - skipping email send`);
      return false;
    }

    try {
      await this.brevoMailService.sendMail(options);
      this.logger.verbose(`[${context}] Email sent successfully`);
      return true;
    } catch (error) {
      this.logEmailFailure(context, error);
      return false;
    }
  }

  private async sendEmailWithErrorHandling(context: string, options: BrevoSendMailOptions): Promise<void> {
    await this.trySendEmail(context, options);
  }

  private resolveConsumerPaymentLinkOrigin(consumerAppScope?: ConsumerAppScope): string | null {
    return this.originResolver.resolveConsumerOriginByScope(consumerAppScope ?? CURRENT_CONSUMER_APP_SCOPE) ?? null;
  }

  async sendLogsEmail(data: unknown = null, email?: string) {
    const html = `<pre><code>${JSON.stringify(data ?? {}, null, 2)}</code></pre>`;
    const subject = `WB Logs`;
    await this.sendEmailWithErrorHandling(`sendLogsEmail`, {
      to: email ?? envs.DEFAULT_ADMIN_EMAIL!,
      subject,
      html,
    });
  }

  async sendConsumerSignupVerificationEmail(params: { email: string; token: string }) {
    const backendBaseURL = resolveEmailApiBaseUrl();
    const emailConfirmationUrl = new URL(`${backendBaseURL}/consumer/auth/signup/verification`);
    // Do not put `email` in the URL (Referer/history/proxy logs); the JWT identifies the consumer.
    emailConfirmationUrl.search = new URLSearchParams({
      token: params.token,
    }).toString();

    const html = signupCompletionToHtml.processor(emailConfirmationUrl.toString());
    const subject = `Welcome to Wirebill! Confirm your Email`;
    await this.sendEmailWithErrorHandling(`sendConsumerSignupVerificationEmail`, {
      to: params.email,
      subject,
      html,
    });
  }

  async sendConsumerSignupVerificationEmailSafe(params: { email: string; token: string }): Promise<boolean> {
    const backendBaseURL = resolveEmailApiBaseUrl();
    const emailConfirmationUrl = new URL(`${backendBaseURL}/consumer/auth/signup/verification`);
    emailConfirmationUrl.search = new URLSearchParams({
      token: params.token,
    }).toString();

    const html = signupCompletionToHtml.processor(emailConfirmationUrl.toString());
    const subject = `Welcome to Wirebill! Confirm your Email`;
    return this.trySendEmail(`sendConsumerSignupVerificationEmail`, {
      to: params.email,
      subject,
      html,
    });
  }

  async sendOutgoingInvoiceEmail(invoice: InvoiceForTemplate) {
    const html = outgoingInvoiceToHtml.processor(invoice);
    const subject = `NEW INVOICE #${invoice.id}`;
    let attachments: BrevoAttachment[];

    try {
      const content = await generatePdf({ rawHtml: invoiceToHtml.processor(invoice) });
      attachments = [{ content, filename: `invoice-${invoice.id}.pdf` }];
    } catch (error) {
      this.logEmailFailure(`sendOutgoingInvoiceEmail.generatePdf`, error);
      return;
    }

    await this.sendEmailWithErrorHandling(`sendOutgoingInvoiceEmail`, {
      to: invoice.referer,
      subject,
      html,
      attachments,
    });
  }

  async sendPayToContactPaymentInfoEmail(params: {
    contactEmail: string;
    payerEmail: string;
    paymentDetailsLink: string;
  }) {
    const html = payToContactPaymentInfo.processor(params);
    const subject = `Wirebill. Payment`;
    await this.sendEmailWithErrorHandling(`sendPayToContactPaymentInfoEmail`, {
      to: params.contactEmail,
      subject,
      html,
    });
  }

  async sendPaymentRequestEmail(params: {
    payerEmail: string;
    requesterEmail: string;
    amount: number;
    currencyCode: string;
    description?: string | null;
    dueDate?: Date | null;
    paymentRequestId: string;
    consumerAppScope?: ConsumerAppScope;
  }) {
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
    await this.sendEmailWithErrorHandling(`sendPaymentRequestEmail`, {
      to: params.payerEmail,
      subject,
      html,
    });
  }

  async sendPaymentRefundEmail(params: {
    recipientEmail: string;
    counterpartyEmail: string;
    amount: number;
    currencyCode: string;
    reason?: string | null;
    paymentRequestId: string;
    role: `payer` | `requester`;
    consumerAppScope?: ConsumerAppScope;
  }) {
    const origin = this.resolveConsumerPaymentLinkOrigin(params.consumerAppScope);

    if (!origin) {
      this.logger.error(`CONSUMER_CSS_GRID_APP_ORIGIN is not configured`);
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
    await this.sendEmailWithErrorHandling(`sendPaymentRefundEmail`, {
      to: params.recipientEmail,
      subject,
      html,
    });
  }

  async sendPaymentChargebackEmail(params: {
    recipientEmail: string;
    counterpartyEmail: string;
    amount: number;
    currencyCode: string;
    reason?: string | null;
    paymentRequestId: string;
    role: `payer` | `requester`;
    consumerAppScope?: ConsumerAppScope;
  }) {
    const origin = this.resolveConsumerPaymentLinkOrigin(params.consumerAppScope);

    if (!origin) {
      this.logger.error(`CONSUMER_CSS_GRID_APP_ORIGIN is not configured`);
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
    await this.sendEmailWithErrorHandling(`sendPaymentChargebackEmail`, {
      to: params.recipientEmail,
      subject,
      html,
    });
  }

  async sendInvitationEmail(params: { email: string; signupLink: string }) {
    const html = invitation.processor(params);
    const subject = `Wirebill. Invitation`;
    await this.sendEmailWithErrorHandling(`sendInvitationEmail`, { to: params.email, subject, html });
  }

  async sendConsumerForgotPasswordEmail(params: { email: string; forgotPasswordLink: string }) {
    const html = forgotPassword.processor(params.forgotPasswordLink);
    const subject = `Wirebill – Reset your password`;
    await this.sendEmailWithErrorHandling(`sendConsumerForgotPasswordEmail`, {
      to: params.email,
      subject,
      html,
    });
  }

  async sendConsumerForgotPasswordEmailSafe(params: { email: string; forgotPasswordLink: string }): Promise<boolean> {
    const html = forgotPassword.processor(params.forgotPasswordLink);
    const subject = `Wirebill – Reset your password`;
    return this.trySendEmail(`sendConsumerForgotPasswordEmail`, {
      to: params.email,
      subject,
      html,
    });
  }

  async sendAdminV2PasswordResetEmail(params: { email: string; forgotPasswordLink: string }): Promise<boolean> {
    const html = forgotPassword.processor(params.forgotPasswordLink);
    const subject = `Wirebill. Admin password reset`;
    return this.trySendEmail(`sendAdminV2PasswordResetEmail`, {
      to: params.email,
      subject,
      html,
    });
  }

  async sendConsumerPasswordlessRecoveryEmail(params: { email: string; loginUrl: string }) {
    const html = googleSignInRecovery.processor(params.loginUrl);
    const subject = `Wirebill – Sign in with Google`;
    await this.sendEmailWithErrorHandling(`sendConsumerPasswordlessRecoveryEmail`, {
      to: params.email,
      subject,
      html,
    });
  }

  async sendConsumerPasswordlessRecoveryEmailSafe(params: { email: string; loginUrl: string }): Promise<boolean> {
    const html = googleSignInRecovery.processor(params.loginUrl);
    const subject = `Wirebill – Sign in with Google`;
    return this.trySendEmail(`sendConsumerPasswordlessRecoveryEmail`, {
      to: params.email,
      subject,
      html,
    });
  }

  async sendAdminV2ConsumerSuspensionEmail(params: { email: string; reason: string }): Promise<boolean> {
    const escapedEmail = escapeHtml(params.email);
    const escapedReason = escapeHtml(params.reason.trim());
    return this.trySendEmail(`sendAdminV2ConsumerSuspensionEmail`, {
      to: params.email,
      subject: `Wirebill. Account suspended`,
      html: `
        <p>Hello ${escapedEmail},</p>
        <p>Your account has been suspended by the operations team.</p>
        <p>Reason: ${escapedReason}</p>
        <p>Please contact support if you need clarification.</p>
      `,
    });
  }

  async sendAdminV2VerificationDecisionEmail(params: {
    email: string;
    decision: `approve` | `reject` | `request-info`;
    reason?: string | null;
  }): Promise<boolean> {
    const escapedEmail = escapeHtml(params.email);
    const escapedReason = params.reason?.trim() ? escapeHtml(params.reason.trim()) : null;

    let subject: string;
    let html: string;

    switch (params.decision) {
      case `approve`:
        subject = `Wirebill. Verification approved`;
        html = `
          <p>Hello ${escapedEmail},</p>
          <p>Your verification has been approved.</p>
          <p>You can continue using the consumer app with the updated verification status.</p>
        `;
        break;
      case `reject`:
        subject = `Wirebill. Verification update`;
        html = `
          <p>Hello ${escapedEmail},</p>
          <p>Your verification was rejected.</p>
          <p>${escapedReason ? `Reason: ${escapedReason}` : `Please contact support if you need clarification.`}</p>
        `;
        break;
      case `request-info`:
        subject = `Wirebill. Additional verification information required`;
        html = `
          <p>Hello ${escapedEmail},</p>
          <p>We need additional information to complete your verification review.</p>
          <p>${
            escapedReason
              ? `Reviewer note: ${escapedReason}`
              : `Please review your submitted information and provide the missing details.`
          }</p>
        `;
        break;
    }

    return this.trySendEmail(`sendAdminV2VerificationDecisionEmail:${params.decision}`, {
      to: params.email,
      subject,
      html,
    });
  }
}
