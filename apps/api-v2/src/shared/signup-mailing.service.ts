import { Injectable } from '@nestjs/common';

import { MailTransportSenderService } from './mail-transport-sender.service';
import { invitation, signupCompletionToHtml } from './mailing-utils';
import { resolveEmailApiBaseUrl } from './resolve-email-api-base-url';

export type SignupVerificationEmailParams = {
  email: string;
  token: string;
};

export type InvitationEmailParams = {
  email: string;
  signupLink: string;
};

@Injectable()
export class SignupMailingService {
  constructor(private readonly mailTransportSender: MailTransportSenderService) {}

  async sendConsumerSignupVerificationEmail(params: SignupVerificationEmailParams) {
    const { html, subject } = this.buildSignupVerificationEmail(params);
    await this.mailTransportSender.sendEmailWithErrorHandling(`sendConsumerSignupVerificationEmail`, {
      to: params.email,
      subject,
      html,
    });
  }

  async sendConsumerSignupVerificationEmailSafe(params: SignupVerificationEmailParams): Promise<boolean> {
    const { html, subject } = this.buildSignupVerificationEmail(params);
    return this.mailTransportSender.trySendEmail(`sendConsumerSignupVerificationEmail`, {
      to: params.email,
      subject,
      html,
    });
  }

  async sendInvitationEmail(params: InvitationEmailParams) {
    const html = invitation.processor(params);
    const subject = `Wirebill. Invitation`;
    await this.mailTransportSender.sendEmailWithErrorHandling(`sendInvitationEmail`, {
      to: params.email,
      subject,
      html,
    });
  }

  private buildSignupVerificationEmail(params: SignupVerificationEmailParams) {
    const backendBaseURL = resolveEmailApiBaseUrl();
    const emailConfirmationUrl = new URL(`${backendBaseURL}/consumer/auth/signup/verification`);
    // Do not put `email` in the URL (Referer/history/proxy logs); the JWT identifies the consumer.
    emailConfirmationUrl.search = new URLSearchParams({
      token: params.token,
    }).toString();

    return {
      html: signupCompletionToHtml.processor(emailConfirmationUrl.toString()),
      subject: `Welcome to Wirebill! Confirm your Email`,
    };
  }
}
