import { Logger } from '@nestjs/common';

import { AdminActionAuditService } from './admin-action-audit.service';

describe(`AdminActionAuditService`, () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it(`record swallows write failures for non-critical audit telemetry`, async () => {
    jest.spyOn(Logger.prototype, `warn`).mockImplementation(() => undefined);
    const prisma = {
      adminActionAuditLogModel: {
        create: jest.fn().mockRejectedValue(new Error(`database unavailable`)),
      },
    };
    const service = new AdminActionAuditService(prisma as never);

    await expect(
      service.record({
        adminId: `admin-1`,
        action: `consumer_note_create`,
        resource: `consumer`,
      }),
    ).resolves.toBeUndefined();
  });

  it(`recordRequired propagates write failures for critical audit evidence`, async () => {
    const prisma = {
      adminActionAuditLogModel: {
        create: jest.fn().mockRejectedValue(new Error(`database unavailable`)),
      },
    };
    const service = new AdminActionAuditService(prisma as never);

    await expect(
      service.recordRequired({
        adminId: `admin-1`,
        action: `payment_refund`,
        resource: `payment_request`,
      }),
    ).rejects.toThrow(`database unavailable`);
  });

  it(`recordRequiredWithClient writes through the provided transaction client`, async () => {
    const prisma = {
      adminActionAuditLogModel: {
        create: jest.fn().mockResolvedValue({ id: `audit-1` }),
      },
    };
    const service = new AdminActionAuditService(prisma as never);
    const tx = {
      adminActionAuditLogModel: {
        create: jest.fn().mockResolvedValue({ id: `audit-1` }),
      },
    };

    await service.recordRequiredWithClient(tx, {
      adminId: `admin-1`,
      action: `payment_refund`,
      resource: `payment_request`,
      resourceId: `payment-1`,
      metadata: { ledgerId: `ledger-1` },
    });

    expect(prisma.adminActionAuditLogModel.create).not.toHaveBeenCalled();
    expect(tx.adminActionAuditLogModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: `payment_refund`,
          resource: `payment_request`,
          resourceId: `payment-1`,
          metadata: { ledgerId: `ledger-1` },
        }),
      }),
    );
  });

  it(`recordRequiredWithClient propagates transaction write failures`, async () => {
    const service = new AdminActionAuditService({ adminActionAuditLogModel: { create: jest.fn() } } as never);
    const tx = {
      adminActionAuditLogModel: {
        create: jest.fn().mockRejectedValue(new Error(`tx failed`)),
      },
    };

    await expect(
      service.recordRequiredWithClient(tx, {
        adminId: `admin-1`,
        action: `payment_refund`,
        resource: `payment_request`,
      }),
    ).rejects.toThrow(`tx failed`);
  });
});
