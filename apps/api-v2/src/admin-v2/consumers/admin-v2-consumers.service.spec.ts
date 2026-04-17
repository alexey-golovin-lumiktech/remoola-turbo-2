import { BadRequestException } from '@nestjs/common';

import { AdminV2ConsumersService } from './admin-v2-consumers.service';

describe(`AdminV2ConsumersService`, () => {
  function buildService() {
    const prisma = {
      consumerModel: {
        findUnique: jest.fn(async () => ({
          id: `consumer-1`,
          email: `consumer@example.com`,
          suspendedAt: null,
          suspendedBy: null,
          suspensionReason: null,
        })),
        update: jest.fn(async () => undefined),
      },
      authSessionModel: {
        count: jest.fn(async () => 0),
      },
    };
    const consumerContractsService = {
      getContracts: jest.fn(),
    };
    const adminActionAudit = {
      record: jest.fn(async () => undefined),
    };
    const consumerAuthService = {
      revokeAllSessionsByConsumerIdAndAudit: jest.fn(async () => undefined),
      sendConsumerSuspensionEmail: jest.fn(async () => true),
      resendSignupVerificationEmail: jest.fn(async () => true),
      resendPasswordRecoveryEmail: jest.fn(async () => ({
        requestedKind: `password_recovery`,
        dispatchedKind: `password_reset`,
      })),
    };
    const idempotency = {
      execute: jest.fn(async ({ execute }: { execute: () => Promise<unknown> }) => execute()),
    };

    return {
      service: new AdminV2ConsumersService(
        prisma as never,
        consumerContractsService as never,
        adminActionAudit as never,
        consumerAuthService as never,
        idempotency as never,
      ),
      prisma,
      adminActionAudit,
      consumerAuthService,
      idempotency,
    };
  }

  it(`requires confirmation and reason for consumer suspension`, async () => {
    const { service } = buildService();

    await expect(
      service.suspendConsumer(`consumer-1`, `admin-1`, { confirmed: false, reason: `risk` }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.suspendConsumer(`consumer-1`, `admin-1`, { confirmed: true, reason: ` ` }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it(`routes consumer suspension through admin-v2 idempotency with exact scope`, async () => {
    const { service, idempotency, adminActionAudit, consumerAuthService } = buildService();

    const result = await service.suspendConsumer(
      `consumer-1`,
      `admin-1`,
      { confirmed: true, reason: `Regulatory block` },
      { idempotencyKey: `idem-1` },
    );

    expect(idempotency.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: `admin-1`,
        scope: `consumer-suspend:consumer-1`,
        key: `idem-1`,
        payload: {
          consumerId: `consumer-1`,
          confirmed: true,
          reason: `Regulatory block`,
        },
      }),
    );
    expect(consumerAuthService.sendConsumerSuspensionEmail).toHaveBeenCalledWith(`consumer-1`, `Regulatory block`);
    expect(adminActionAudit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: `consumer_suspend`,
        resource: `consumer`,
        resourceId: `consumer-1`,
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        consumerId: `consumer-1`,
        alreadySuspended: false,
        emailDispatched: true,
      }),
    );
  });

  it(`records explicit email resend metadata without generic mail affordances`, async () => {
    const { service, adminActionAudit } = buildService();

    const result = await service.resendConsumerEmail(
      `consumer-1`,
      `admin-1`,
      { emailKind: `password_recovery`, appScope: `consumer` },
      { ipAddress: `127.0.0.1`, userAgent: `jest` },
    );

    expect(adminActionAudit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: `consumer_email_resend`,
        metadata: expect.objectContaining({
          requestedEmailKind: `password_recovery`,
          dispatchedEmailKind: `password_reset`,
          appScope: `consumer`,
        }),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        consumerId: `consumer-1`,
        requestedKind: `password_recovery`,
        dispatchedKind: `password_reset`,
        emailDispatched: true,
      }),
    );
  });
});
