import { BrevoMailService } from './brevo-mail.service';

describe(`BrevoMailService`, () => {
  let service: BrevoMailService;
  let fetchMock: jest.SpyInstance;

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
});
