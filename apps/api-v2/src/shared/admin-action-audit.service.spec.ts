import { Logger } from '@nestjs/common';

import { ADMIN_ACTION_AUDIT_ACTIONS, AdminActionAuditPolicyService } from './admin-action-audit-policy.service';
import { type AdminActionAuditRepository } from './admin-action-audit.repository';
import { AdminActionAuditService } from './admin-action-audit.service';

describe(`AdminActionAuditService`, () => {
  const createService = (repository: AdminActionAuditRepository) =>
    new AdminActionAuditService(repository, new AdminActionAuditPolicyService(ADMIN_ACTION_AUDIT_ACTIONS));

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it(`record swallows write failures for non-critical audit telemetry`, async () => {
    jest.spyOn(Logger.prototype, `warn`).mockImplementation(() => undefined);
    const repository = {
      createAuditEntry: jest.fn().mockRejectedValue(new Error(`database unavailable`)),
    } as unknown as AdminActionAuditRepository;
    const service = createService(repository);

    await expect(
      service.record({
        adminId: `admin-1`,
        action: `consumer_note_create`,
        resource: `consumer`,
      }),
    ).resolves.toBeUndefined();
  });

  it(`recordRequired propagates write failures for critical audit evidence`, async () => {
    const repository = {
      createAuditEntry: jest.fn().mockRejectedValue(new Error(`database unavailable`)),
    } as unknown as AdminActionAuditRepository;
    const service = createService(repository);

    await expect(
      service.recordRequired({
        adminId: `admin-1`,
        action: `payment_refund`,
        resource: `payment_request`,
      }),
    ).rejects.toThrow(`database unavailable`);
  });

  it(`recordRequiredWithClient writes through the provided transaction client`, async () => {
    const repository = {
      createAuditEntry: jest.fn().mockResolvedValue(undefined),
    } as unknown as AdminActionAuditRepository;
    const service = createService(repository);
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

    expect(repository.createAuditEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        action: `payment_refund`,
        resource: `payment_request`,
        resourceId: `payment-1`,
        metadata: { ledgerId: `ledger-1` },
      }),
      tx,
    );
  });

  it(`recordRequiredWithClient propagates transaction write failures`, async () => {
    const repository = {
      createAuditEntry: jest.fn().mockRejectedValue(new Error(`tx failed`)),
    } as unknown as AdminActionAuditRepository;
    const service = createService(repository);
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

  it(`exposes action names from the injected policy`, () => {
    const repository = {
      createAuditEntry: jest.fn(),
    } as unknown as AdminActionAuditRepository;
    const service = createService(repository);

    expect(service.actions.payment_refund).toBe(`payment_refund`);
  });
});
