import { Injectable } from '@nestjs/common';

import { MailTransportSenderService } from './mail-transport-sender.service';

function escapeHtml(value: string): string {
  return value
    .replaceAll(`&`, `&amp;`)
    .replaceAll(`<`, `&lt;`)
    .replaceAll(`>`, `&gt;`)
    .replaceAll(`"`, `&quot;`)
    .replaceAll(`'`, `&#39;`);
}

export type ConsumerSuspensionEmailParams = {
  email: string;
  reason: string;
};

export type VerificationDecisionEmailParams = {
  email: string;
  decision: `approve` | `reject` | `request-info`;
  reason?: string | null;
};

@Injectable()
export class AdminNotificationMailingService {
  constructor(private readonly mailTransportSender: MailTransportSenderService) {}

  async sendAdminV2ConsumerSuspensionEmail(params: ConsumerSuspensionEmailParams): Promise<boolean> {
    const escapedEmail = escapeHtml(params.email);
    const escapedReason = escapeHtml(params.reason.trim());
    return this.mailTransportSender.trySendEmail(`sendAdminV2ConsumerSuspensionEmail`, {
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

  async sendAdminV2VerificationDecisionEmail(params: VerificationDecisionEmailParams): Promise<boolean> {
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

    return this.mailTransportSender.trySendEmail(`sendAdminV2VerificationDecisionEmail:${params.decision}`, {
      to: params.email,
      subject,
      html,
    });
  }
}
