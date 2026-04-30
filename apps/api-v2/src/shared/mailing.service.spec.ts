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

import { MailingService } from './mailing.service';

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

    const service = new MailingService(brevoMailService as any, originResolver as any);
    return { service, brevoMailService, originResolver };
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
    expect(html).not.toContain(`email=`);
    expect(html).not.toContain(`referer=`);
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
});
