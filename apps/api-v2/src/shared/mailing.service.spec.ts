jest.mock(`./resolve-email-api-base-url`, () => ({
  resolveEmailApiBaseUrl: jest.fn(() => `http://127.0.0.1:3334/api`),
}));

jest.mock(`../envs`, () => ({
  envs: {
    BREVO_API_KEY: `test-api-key`,
    BREVO_DEFAULT_FROM_EMAIL: `noreply@example.com`,
  },
}));

import { CURRENT_CONSUMER_APP_SCOPE } from '@remoola/api-types';

import { AdminNotificationMailingService } from './admin-notification-mailing.service';
import { type BrevoSendMailOptions } from './brevo-mail.service';
import { InvoiceMailingService } from './invoice-mailing.service';
import { MailingService } from './mailing.service';
import { PaymentMailingService } from './payment-mailing.service';
import { RecoveryMailingService } from './recovery-mailing.service';
import { SignupMailingService } from './signup-mailing.service';

describe(`MailingService signup verification links`, () => {
  function makeService() {
    const brevoMailService = {
      sendMail: jest.fn().mockResolvedValue(undefined),
    };
    const originResolver = {
      resolveConsumerOriginByScope: jest.fn((scope?: string) => {
        if (scope === CURRENT_CONSUMER_APP_SCOPE) return `https://grid.example.com`;
        return null;
      }),
    };
    const mailTransportSender = {
      trySendEmail: jest.fn(async (_context: string, options: BrevoSendMailOptions) => {
        await brevoMailService.sendMail(options);
        return true;
      }),
      sendEmailWithErrorHandling: jest.fn(async (_context: string, options: BrevoSendMailOptions) => {
        await brevoMailService.sendMail(options);
      }),
      sendEmailOrThrow: jest.fn(async (_context: string, options: BrevoSendMailOptions) => {
        await brevoMailService.sendMail(options);
      }),
    };

    const paymentMailingService = new PaymentMailingService(mailTransportSender as any, originResolver as any);
    const recoveryMailingService = new RecoveryMailingService(mailTransportSender as any);
    const signupMailingService = new SignupMailingService(mailTransportSender as any);
    const invoiceMailingService = new InvoiceMailingService(mailTransportSender as any);
    const adminNotificationMailingService = new AdminNotificationMailingService(mailTransportSender as any);
    const service = new MailingService(
      mailTransportSender as any,
      paymentMailingService,
      recoveryMailingService,
      signupMailingService,
      invoiceMailingService,
      adminNotificationMailingService,
    );
    return { service, brevoMailService, mailTransportSender, originResolver };
  }

  it(`builds token-only signup verification links without email or referer query params`, async () => {
    const { service, brevoMailService } = makeService();

    await service.sendConsumerSignupVerificationEmail({
      email: `user@example.com`,
      token: `signup-token`,
    });

    expect(brevoMailService.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: `user@example.com`,
        html: expect.stringContaining(`http://127.0.0.1:3334/api/consumer/auth/signup/verification?token=signup-token`),
      }),
    );

    const html = (brevoMailService.sendMail as jest.Mock).mock.calls[0]?.[0]?.html as string;
    expect(html).not.toMatch(/[?&]email=/);
    expect(html).not.toMatch(/[?&]referer=/);
  });

  it(`builds payment-request links from canonical consumer app scope instead of a raw origin`, async () => {
    const { service, brevoMailService, originResolver } = makeService();

    await service.sendPaymentRequestEmail({
      payerEmail: `payer@example.com`,
      requesterEmail: `requester@example.com`,
      amount: 10,
      currencyCode: `USD`,
      paymentRequestId: `pr-123`,
      consumerAppScope: CURRENT_CONSUMER_APP_SCOPE,
    });

    expect(originResolver.resolveConsumerOriginByScope).toHaveBeenCalledWith(CURRENT_CONSUMER_APP_SCOPE);
    expect(brevoMailService.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: `payer@example.com`,
        html: expect.stringContaining(`https://grid.example.com/payments/pr-123`),
      }),
    );
  });

  it(`routes refund email links through the stored consumer scope`, async () => {
    const { service, brevoMailService, originResolver } = makeService();

    await service.sendPaymentRefundEmail({
      recipientEmail: `payer@example.com`,
      counterpartyEmail: `requester@example.com`,
      amount: 7,
      currencyCode: `USD`,
      paymentRequestId: `pr-234`,
      role: `payer`,
      consumerAppScope: CURRENT_CONSUMER_APP_SCOPE,
    });

    expect(originResolver.resolveConsumerOriginByScope).toHaveBeenCalledWith(CURRENT_CONSUMER_APP_SCOPE);
    expect(brevoMailService.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: `payer@example.com`,
        html: expect.stringContaining(`https://grid.example.com/payments/pr-234`),
      }),
    );
  });

  it(`routes chargeback email links through the stored consumer scope`, async () => {
    const { service, brevoMailService, originResolver } = makeService();

    await service.sendPaymentChargebackEmail({
      recipientEmail: `payer@example.com`,
      counterpartyEmail: `requester@example.com`,
      amount: 9,
      currencyCode: `USD`,
      paymentRequestId: `pr-345`,
      role: `requester`,
      consumerAppScope: CURRENT_CONSUMER_APP_SCOPE,
    });

    expect(originResolver.resolveConsumerOriginByScope).toHaveBeenCalledWith(CURRENT_CONSUMER_APP_SCOPE);
    expect(brevoMailService.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: `payer@example.com`,
        html: expect.stringContaining(`https://grid.example.com/payments/pr-345`),
      }),
    );
  });

  it(`skips refund payment-link emails when consumer scope is unavailable`, async () => {
    const { service, brevoMailService, originResolver } = makeService();

    await service.sendPaymentRefundEmail({
      recipientEmail: `payer@example.com`,
      counterpartyEmail: `requester@example.com`,
      amount: 5,
      currencyCode: `USD`,
      paymentRequestId: `pr-456`,
      role: `payer`,
    });

    expect(originResolver.resolveConsumerOriginByScope).not.toHaveBeenCalled();
    expect(brevoMailService.sendMail).not.toHaveBeenCalled();
  });

  it(`fails required refund emails when consumer scope is unavailable`, async () => {
    const { service, brevoMailService, originResolver } = makeService();

    await expect(
      service.sendPaymentRefundEmailRequired({
        recipientEmail: `payer@example.com`,
        counterpartyEmail: `requester@example.com`,
        amount: 5,
        currencyCode: `USD`,
        paymentRequestId: `pr-456`,
        role: `payer`,
      }),
    ).rejects.toThrow(/CONSUMER_CSS_GRID_APP_ORIGIN is not configured/);

    expect(originResolver.resolveConsumerOriginByScope).not.toHaveBeenCalled();
    expect(brevoMailService.sendMail).not.toHaveBeenCalled();
  });

  it(`delegates consumer password reset emails through the recovery mailer`, async () => {
    const { service, brevoMailService } = makeService();

    await service.sendConsumerForgotPasswordEmail({
      email: `user@example.com`,
      forgotPasswordLink: `https://grid.example.com/forgot-password/confirm?token=reset-token`,
    });

    expect(brevoMailService.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: `user@example.com`,
        subject: `Wirebill – Reset your password`,
        html: expect.stringContaining(`https://grid.example.com/forgot-password/confirm?token=reset-token`),
      }),
    );
  });

  it(`delegates admin password reset emails through the recovery mailer`, async () => {
    const { service, brevoMailService } = makeService();

    await service.sendAdminV2PasswordResetEmail({
      email: `admin@example.com`,
      forgotPasswordLink: `https://admin.example.com/reset?token=admin-token`,
    });

    expect(brevoMailService.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: `admin@example.com`,
        subject: `Wirebill. Admin password reset`,
        html: expect.stringContaining(`https://admin.example.com/reset?token=admin-token`),
      }),
    );
  });

  it(`delegates passwordless recovery emails through the recovery mailer`, async () => {
    const { service, brevoMailService } = makeService();

    await service.sendConsumerPasswordlessRecoveryEmail({
      email: `google-user@example.com`,
      loginUrl: `https://grid.example.com/login/google`,
    });

    expect(brevoMailService.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: `google-user@example.com`,
        subject: `Wirebill – Sign in with Google`,
        html: expect.stringContaining(`https://grid.example.com/login/google`),
      }),
    );
  });

  it(`delegates invitation emails through the signup mailer`, async () => {
    const { service, brevoMailService } = makeService();

    await service.sendInvitationEmail({
      email: `admin@example.com`,
      signupLink: `https://admin.example.com/invitations/accept?token=invite-token`,
    });

    expect(brevoMailService.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: `admin@example.com`,
        subject: `Wirebill. Invitation`,
        html: expect.stringContaining(`https://admin.example.com/invitations/accept?token=invite-token`),
      }),
    );
  });

  it(`delegates pay-to-contact payment info emails through the invoice mailer`, async () => {
    const { service, brevoMailService } = makeService();

    await service.sendPayToContactPaymentInfoEmail({
      contactEmail: `contact@example.com`,
      payerEmail: `payer@example.com`,
      paymentDetailsLink: `https://grid.example.com/payments/details`,
    });

    expect(brevoMailService.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: `contact@example.com`,
        subject: `Wirebill. Payment`,
        html: expect.stringContaining(`https://grid.example.com/payments/details`),
      }),
    );
  });

  it(`delegates suspension emails through the admin notification mailer`, async () => {
    const { service, brevoMailService } = makeService();

    await service.sendAdminV2ConsumerSuspensionEmail({
      email: `consumer@example.com`,
      reason: `<policy violation>`,
    });

    expect(brevoMailService.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: `consumer@example.com`,
        subject: `Wirebill. Account suspended`,
        html: expect.stringContaining(`&lt;policy violation&gt;`),
      }),
    );
  });

  it(`delegates verification decision emails through the admin notification mailer`, async () => {
    const { service, brevoMailService } = makeService();

    await service.sendAdminV2VerificationDecisionEmail({
      email: `consumer@example.com`,
      decision: `request-info`,
      reason: `Upload <passport>`,
    });

    expect(brevoMailService.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: `consumer@example.com`,
        subject: `Wirebill. Additional verification information required`,
        html: expect.stringContaining(`Reviewer note: Upload &lt;passport&gt;`),
      }),
    );
  });
});
