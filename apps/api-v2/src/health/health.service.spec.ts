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
    envs.PUBLIC_DETAILED_HEALTH_ENABLED = true;
    envs.PUBLIC_MAIL_TRANSPORT_HEALTH_ENABLED = true;
    envs.HEALTH_TEST_EMAIL_ENABLED = true;
    service = new HealthService(prisma as never, brevoMailService as never);
  });

  afterEach(() => {
    envs.PUBLIC_DETAILED_HEALTH_ENABLED = true;
    envs.PUBLIC_MAIL_TRANSPORT_HEALTH_ENABLED = true;
    envs.HEALTH_TEST_EMAIL_ENABLED = true;
  });

  describe(`getDetailedHealthStatus`, () => {
    it(`throws when detailed health is disabled`, async () => {
      envs.PUBLIC_DETAILED_HEALTH_ENABLED = false;
      await expect(service.getDetailedHealthStatus()).rejects.toThrow(ForbiddenException);
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
    });
  });

  describe(`getMailTransportStatus`, () => {
    it(`throws when public mail transport health is disabled`, async () => {
      envs.PUBLIC_MAIL_TRANSPORT_HEALTH_ENABLED = false;
      await expect(service.getMailTransportStatus()).rejects.toThrow(ForbiddenException);
      expect(brevoMailService.verify).not.toHaveBeenCalled();
    });

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
    it(`throws when test email endpoint is disabled`, async () => {
      envs.HEALTH_TEST_EMAIL_ENABLED = false;
      await expect(service.sendTestEmail(`test@example.com`)).rejects.toThrow(ForbiddenException);
      expect(brevoMailService.sendMail).not.toHaveBeenCalled();
    });

    it(`throws when no recipient (no DEFAULT_ADMIN_EMAIL and no body.to)`, async () => {
      const initialAdminEmail = envs.DEFAULT_ADMIN_EMAIL;
      try {
        (envs as { DEFAULT_ADMIN_EMAIL: string }).DEFAULT_ADMIN_EMAIL = ``;
        await expect(service.sendTestEmail()).rejects.toThrow(ForbiddenException);
        await expect(service.sendTestEmail()).rejects.toThrow(/DEFAULT_ADMIN_EMAIL|pass to in body/);
      } finally {
        (envs as { DEFAULT_ADMIN_EMAIL: string }).DEFAULT_ADMIN_EMAIL = initialAdminEmail;
      }
    });

    it(`sends to body.to when provided`, async () => {
      brevoMailService.sendMail.mockResolvedValue(undefined);
      await service.sendTestEmail(`test@example.com`);
      expect(brevoMailService.sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: `test@example.com` }));
    });
  });
});
