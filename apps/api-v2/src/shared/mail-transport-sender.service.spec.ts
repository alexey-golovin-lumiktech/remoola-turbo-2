import { MailTransportSenderService } from './mail-transport-sender.service';

describe(`MailTransportSenderService`, () => {
  it(`throws from required sends when transport delivery returns false`, async () => {
    const brevoMailService = {
      sendMail: jest.fn().mockRejectedValue(new Error(`Brevo down`)),
    };
    const service = new MailTransportSenderService(brevoMailService as any);

    await expect(
      service.sendEmailOrThrow(`required-email`, {
        to: `user@example.com`,
        subject: `Subject`,
        html: `<p>Hello</p>`,
      }),
    ).rejects.toThrow(/\[required-email\] Email delivery failed/);
  });
});
