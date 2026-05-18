import { Injectable, Logger } from '@nestjs/common';

import { envs } from '../envs';
import {
  AdminNotificationMailingService,
  type ConsumerSuspensionEmailParams,
  type VerificationDecisionEmailParams,
} from './admin-notification-mailing.service';
import { type BrevoSendMailOptions } from './brevo-mail.service';
import { InvoiceMailingService, type PayToContactPaymentInfoEmailParams } from './invoice-mailing.service';
import { MailTransportSenderService } from './mail-transport-sender.service';
import { type InvoiceForTemplate } from './mailing-utils';
import {
  PaymentMailingService,
  type PaymentRequestEmailParams,
  type PaymentReversalEmailParams,
} from './payment-mailing.service';
import {
  RecoveryMailingService,
  type PasswordResetEmailParams,
  type PasswordlessRecoveryEmailParams,
} from './recovery-mailing.service';
import {
  SignupMailingService,
  type InvitationEmailParams,
  type SignupVerificationEmailParams,
} from './signup-mailing.service';

@Injectable()
export class MailingService {
  private readonly logger = new Logger(MailingService.name);

  constructor(
    private mailTransportSender: MailTransportSenderService,
    private paymentMailingService: PaymentMailingService,
    private recoveryMailingService: RecoveryMailingService,
    private signupMailingService: SignupMailingService,
    private invoiceMailingService: InvoiceMailingService,
    private adminNotificationMailingService: AdminNotificationMailingService,
  ) {}

  private async trySendEmail(context: string, options: BrevoSendMailOptions): Promise<boolean> {
    return this.mailTransportSender.trySendEmail(context, options);
  }

  private async sendEmailWithErrorHandling(context: string, options: BrevoSendMailOptions): Promise<void> {
    await this.mailTransportSender.sendEmailWithErrorHandling(context, options);
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

  async sendConsumerSignupVerificationEmail(params: SignupVerificationEmailParams) {
    return this.signupMailingService.sendConsumerSignupVerificationEmail(params);
  }

  async sendConsumerSignupVerificationEmailSafe(params: SignupVerificationEmailParams): Promise<boolean> {
    return this.signupMailingService.sendConsumerSignupVerificationEmailSafe(params);
  }

  async sendOutgoingInvoiceEmail(invoice: InvoiceForTemplate) {
    return this.invoiceMailingService.sendOutgoingInvoiceEmail(invoice);
  }

  async sendPayToContactPaymentInfoEmail(params: PayToContactPaymentInfoEmailParams) {
    return this.invoiceMailingService.sendPayToContactPaymentInfoEmail(params);
  }

  async sendPaymentRequestEmail(params: PaymentRequestEmailParams) {
    return this.paymentMailingService.sendPaymentRequestEmail(params);
  }

  async sendPaymentRefundEmail(params: PaymentReversalEmailParams) {
    return this.paymentMailingService.sendPaymentRefundEmail(params);
  }

  async sendPaymentRefundEmailRequired(params: PaymentReversalEmailParams) {
    return this.paymentMailingService.sendPaymentRefundEmailRequired(params);
  }

  async sendPaymentChargebackEmail(params: PaymentReversalEmailParams) {
    return this.paymentMailingService.sendPaymentChargebackEmail(params);
  }

  async sendPaymentChargebackEmailRequired(params: PaymentReversalEmailParams) {
    return this.paymentMailingService.sendPaymentChargebackEmailRequired(params);
  }

  async sendInvitationEmail(params: InvitationEmailParams) {
    return this.signupMailingService.sendInvitationEmail(params);
  }

  async sendConsumerForgotPasswordEmail(params: PasswordResetEmailParams) {
    return this.recoveryMailingService.sendConsumerForgotPasswordEmail(params);
  }

  async sendConsumerForgotPasswordEmailSafe(params: PasswordResetEmailParams): Promise<boolean> {
    return this.recoveryMailingService.sendConsumerForgotPasswordEmailSafe(params);
  }

  async sendAdminV2PasswordResetEmail(params: PasswordResetEmailParams): Promise<boolean> {
    return this.recoveryMailingService.sendAdminV2PasswordResetEmail(params);
  }

  async sendConsumerPasswordlessRecoveryEmail(params: PasswordlessRecoveryEmailParams) {
    return this.recoveryMailingService.sendConsumerPasswordlessRecoveryEmail(params);
  }

  async sendConsumerPasswordlessRecoveryEmailSafe(params: PasswordlessRecoveryEmailParams): Promise<boolean> {
    return this.recoveryMailingService.sendConsumerPasswordlessRecoveryEmailSafe(params);
  }

  async sendAdminV2ConsumerSuspensionEmail(params: ConsumerSuspensionEmailParams): Promise<boolean> {
    return this.adminNotificationMailingService.sendAdminV2ConsumerSuspensionEmail(params);
  }

  async sendAdminV2VerificationDecisionEmail(params: VerificationDecisionEmailParams): Promise<boolean> {
    return this.adminNotificationMailingService.sendAdminV2VerificationDecisionEmail(params);
  }
}
