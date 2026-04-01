import { BrevoMailService } from './brevo-mail.service';

jest.mock(`../envs`, () => ({
  envs: {
    BREVO_API_KEY: `test-api-key`,
    BREVO_API_BASE_URL: `https://api.brevo.com/v3`,
    BREVO_DEFAULT_FROM_EMAIL: `noreply@example.com`,
    BREVO_DEFAULT_FROM_NAME: `Wirebill`,
  },
}));

describe(`BrevoMailService`, () => {
  let service: BrevoMailService;
  let fetchMock: jest.SpyInstance;
  const transientSocketError = () =>
    Object.assign(new TypeError(`fetch failed`), {
      cause: { code: `UND_ERR_SOCKET` },
    });

  beforeEach(() => {
    service = new BrevoMailService();
    fetchMock = jest.spyOn(global, `fetch`).mockResolvedValue({ ok: true } as Response);
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  describe(`sendMail recipient validation`, () => {
    it(`sends only valid emails: skips empty, invalid format, and over-length`, async () => {
      await service.sendMail({
        to: [
          `valid@example.com`,
          `some.email@asdasd.com`,
          ``,
          `  `,
          `no-at-sign`,
          `@nodomain.com`,
          `noaddot@domain`,
          `good@domain.co`,
          `x@y.z`,
          `a`.repeat(255),
        ],
        subject: `Test`,
        html: `<p>Test</p>`,
      });

      const body = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string) as { to: Array<{ email: string }> };
      expect(body.to).toEqual([
        { email: `valid@example.com` },
        { email: `some.email@asdasd.com` },
        { email: `good@domain.co` },
        { email: `x@y.z` },
      ]);
    });

    it(`trims whitespace and keeps valid address`, async () => {
      await service.sendMail({
        to: `  user@example.org  `,
        subject: `Test`,
        html: `<p>Test</p>`,
      });

      const body = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string) as { to: Array<{ email: string }> };
      expect(body.to).toEqual([{ email: `user@example.org` }]);
    });
  });

  describe(`sendMail transient fallback`, () => {
    it(`retries once and falls back to legacy Brevo host`, async () => {
      fetchMock
        .mockRejectedValueOnce(transientSocketError())
        .mockRejectedValueOnce(transientSocketError())
        .mockResolvedValueOnce({ ok: true } as Response);

      await service.sendMail({
        to: `user@example.org`,
        subject: `Test`,
        html: `<p>Test</p>`,
      });

      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(fetchMock.mock.calls[0]?.[0]).toBe(`https://api.brevo.com/v3/smtp/email`);
      expect(fetchMock.mock.calls[1]?.[0]).toBe(`https://api.brevo.com/v3/smtp/email`);
      expect(fetchMock.mock.calls[2]?.[0]).toBe(`https://api.sendinblue.com/v3/smtp/email`);
    });
  });
});
