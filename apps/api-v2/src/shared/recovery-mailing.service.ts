import { Injectable } from '@nestjs/common';

import { MailTransportSenderService } from './mail-transport-sender.service';
import { forgotPassword, googleSignInRecovery } from './mailing-utils';

export type PasswordResetEmailParams = {
  email: string;
  forgotPasswordLink: string;
};

export type PasswordlessRecoveryEmailParams = {
  email: string;
  loginUrl: string;
};

@Injectable()
export class RecoveryMailingService {
  constructor(private readonly mailTransportSender: MailTransportSenderService) {}

  async sendConsumerForgotPasswordEmail(params: PasswordResetEmailParams) {
    const html = forgotPassword.processor(params.forgotPasswordLink);
    const subject = `Wirebill – Reset your password`;
    await this.mailTransportSender.sendEmailWithErrorHandling(`sendConsumerForgotPasswordEmail`, {
      to: params.email,
      subject,
      html,
    });
  }

  async sendConsumerForgotPasswordEmailSafe(params: PasswordResetEmailParams): Promise<boolean> {
    const html = forgotPassword.processor(params.forgotPasswordLink);
    const subject = `Wirebill – Reset your password`;
    return this.mailTransportSender.trySendEmail(`sendConsumerForgotPasswordEmail`, {
      to: params.email,
      subject,
      html,
    });
  }

  async sendAdminV2PasswordResetEmail(params: PasswordResetEmailParams): Promise<boolean> {
    const html = forgotPassword.processor(params.forgotPasswordLink);
    const subject = `Wirebill. Admin password reset`;
    return this.mailTransportSender.trySendEmail(`sendAdminV2PasswordResetEmail`, {
      to: params.email,
      subject,
      html,
    });
  }

  async sendConsumerPasswordlessRecoveryEmail(params: PasswordlessRecoveryEmailParams) {
    const html = googleSignInRecovery.processor(params.loginUrl);
    const subject = `Wirebill – Sign in with Google`;
    await this.mailTransportSender.sendEmailWithErrorHandling(`sendConsumerPasswordlessRecoveryEmail`, {
      to: params.email,
      subject,
      html,
    });
  }

  async sendConsumerPasswordlessRecoveryEmailSafe(params: PasswordlessRecoveryEmailParams): Promise<boolean> {
    const html = googleSignInRecovery.processor(params.loginUrl);
    const subject = `Wirebill – Sign in with Google`;
    return this.mailTransportSender.trySendEmail(`sendConsumerPasswordlessRecoveryEmail`, {
      to: params.email,
      subject,
      html,
    });
  }
}
