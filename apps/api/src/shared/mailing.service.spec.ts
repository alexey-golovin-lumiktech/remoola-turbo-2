import { MailingService } from './mailing.service';

describe(`MailingService payment links`, () => {
  function makeService() {
    const brevoMailService = {
      sendMail: jest.fn().mockResolvedValue(undefined),
    };
    const originResolver = {
      resolveConsumerOriginByScope: jest.fn((scope: string) => {
        if (scope === `consumer-mobile`) return `https://mobile.example.com`;
        if (scope === `consumer`) return `https://consumer.example.com`;
        return null;
      }),
    };

    const service = new MailingService(brevoMailService as any, originResolver as any);
    return { service, brevoMailService, originResolver };
  }

  it(`routes payment request email links through the provided consumer scope`, async () => {
    const { service, brevoMailService, originResolver } = makeService();

    await service.sendPaymentRequestEmail({
      payerEmail: `payer@example.com`,
      requesterEmail: `requester@example.com`,
      amount: 12,
      currencyCode: `USD`,
      paymentRequestId: `pr_1`,
      consumerAppScope: `consumer-mobile`,
    });

    expect(originResolver.resolveConsumerOriginByScope).toHaveBeenCalledWith(`consumer-mobile`);
    expect(brevoMailService.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: `payer@example.com`,
        html: expect.stringContaining(`https://mobile.example.com/payments/pr_1`),
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
      paymentRequestId: `pr_2`,
      role: `payer`,
      consumerAppScope: `consumer-mobile`,
    });

    expect(originResolver.resolveConsumerOriginByScope).toHaveBeenCalledWith(`consumer-mobile`);
    expect(brevoMailService.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: `payer@example.com`,
        html: expect.stringContaining(`https://mobile.example.com/payments/pr_2`),
      }),
    );
  });

  it(`routes chargeback email links through the stored consumer scope`, async () => {
    const { service, brevoMailService, originResolver } = makeService();

    await service.sendPaymentChargebackEmail({
      recipientEmail: `payer@example.com`,
      counterpartyEmail: `requester@example.com`,
      amount: 5,
      currencyCode: `USD`,
      paymentRequestId: `pr_3`,
      role: `requester`,
      consumerAppScope: `consumer-mobile`,
    });

    expect(originResolver.resolveConsumerOriginByScope).toHaveBeenCalledWith(`consumer-mobile`);
    expect(brevoMailService.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: `payer@example.com`,
        html: expect.stringContaining(`https://mobile.example.com/payments/pr_3`),
      }),
    );
  });

  it(`skips payment-link emails when no scope is available`, async () => {
    const { service, brevoMailService, originResolver } = makeService();

    await service.sendPaymentRefundEmail({
      recipientEmail: `payer@example.com`,
      counterpartyEmail: `requester@example.com`,
      amount: 7,
      currencyCode: `USD`,
      paymentRequestId: `pr_4`,
      role: `payer`,
    });

    expect(originResolver.resolveConsumerOriginByScope).not.toHaveBeenCalled();
    expect(brevoMailService.sendMail).not.toHaveBeenCalled();
  });
});
