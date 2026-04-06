jest.mock(`./resolve-email-api-base-url`, () => ({
  resolveEmailApiBaseUrl: jest.fn(() => `http://127.0.0.1:3334/api`),
}));

import { MailingService } from './mailing.service';

describe(`MailingService signup verification links`, () => {
  function makeService() {
    const brevoMailService = {
      sendMail: jest.fn().mockResolvedValue(undefined),
    };
    const originResolver = {};

    const service = new MailingService(brevoMailService as any, originResolver as any);
    return { service, brevoMailService };
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
});
