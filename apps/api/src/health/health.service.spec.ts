import { ForbiddenException } from '@nestjs/common';

import { envs } from '../envs';
import { HealthService } from './health.service';

describe(`HealthService`, () => {
  const prisma = {
    $queryRaw: jest.fn(),
  };
  const brevoMailService = {
    verify: jest.fn(),
    sendMail: jest.fn(),
  };

  let service: HealthService;

  beforeEach(() => {
    prisma.$queryRaw.mockReset();
    brevoMailService.verify.mockReset();
    brevoMailService.sendMail.mockReset();
    service = new HealthService(prisma as never, brevoMailService as never);
  });

  describe(`getMailTransportStatus`, () => {
    it(`returns ok when Brevo verify succeeds`, async () => {
      brevoMailService.verify.mockResolvedValue(undefined);

      const result = await service.getMailTransportStatus();

      expect(result.status).toBe(`ok`);
      expect(result.transport).toBe(`brevo`);
    });

    it(`returns skipped when Brevo is not configured`, async () => {
      brevoMailService.verify.mockRejectedValue(new Error(`Brevo mail transport is not configured`));

      const result = await service.getMailTransportStatus();

      expect(result).toMatchObject({
        status: `skipped`,
        transport: `brevo`,
        reason: `not_configured`,
      });
    });

    it(`returns error when Brevo verify fails`, async () => {
      brevoMailService.verify.mockRejectedValue(new Error(`fetch failed`));

      const result = await service.getMailTransportStatus();

      expect(result).toMatchObject({
        status: `error`,
        transport: `brevo`,
        error: `Mail transport check failed`,
      });
    });
  });

  describe(`sendTestEmail`, () => {
    it(`throws when no recipient (no ADMIN_EMAIL and no body.to)`, async () => {
      const initialAdminEmail = envs.ADMIN_EMAIL;
      try {
        (envs as { ADMIN_EMAIL: string }).ADMIN_EMAIL = ``;
        await expect(service.sendTestEmail()).rejects.toThrow(ForbiddenException);
        await expect(service.sendTestEmail()).rejects.toThrow(/ADMIN_EMAIL|pass to in body/);
      } finally {
        (envs as { ADMIN_EMAIL: string }).ADMIN_EMAIL = initialAdminEmail;
      }
    });

    it(`sends to body.to when provided`, async () => {
      brevoMailService.sendMail.mockResolvedValue(undefined);
      await service.sendTestEmail(`test@example.com`);
      expect(brevoMailService.sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: `test@example.com` }));
    });
  });
});
