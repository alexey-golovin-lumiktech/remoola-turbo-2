import { describe, expect, it, jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { type Cache } from 'cache-manager';

import { AdminV2QuickstartsService } from './admin-v2-quickstarts.service';

describe(`AdminV2QuickstartsService`, () => {
  function buildService() {
    const cacheManager = {
      get: jest.fn<(...a: any[]) => any>(),
      set: jest.fn<(...a: any[]) => any>(),
    };

    return {
      cacheManager,
      service: new AdminV2QuickstartsService(cacheManager as unknown as Cache),
    };
  }

  it(`returns the expanded catalog for overview and preserves capability-gated entries`, async () => {
    const { cacheManager, service } = buildService();
    cacheManager.get.mockResolvedValue(undefined);

    const quickstarts = await service.list(`overview`);

    expect(quickstarts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: `verification-missing-profile`, targetPath: `/verification` }),
        expect.objectContaining({ id: `payment-operations-review`, targetPath: `/payments/operations` }),
        expect.objectContaining({
          id: `ledger-anomalies-triage`,
          targetPath: `/ledger/anomalies`,
          operatorModel: `saved-view-compatible`,
        }),
        expect.objectContaining({ id: `documents-intake-review`, targetPath: `/documents` }),
        expect.objectContaining({ id: `exchange-scheduled-review`, targetPath: `/exchange/scheduled` }),
        expect.objectContaining({ id: `admins-access-review`, targetPath: `/admins`, operatorModel: `entry-only` }),
        expect.objectContaining({
          id: `system-alerts-console`,
          targetPath: `/system/alerts`,
          operatorModel: `threshold-editor`,
          requiredCapabilities: [`alerts.manage`],
        }),
      ]),
    );
    expect(cacheManager.set).toHaveBeenCalledWith(`admin-v2-quickstarts:list:overview`, quickstarts, 300_000);
  });

  it(`returns cached quickstart lists without rebuilding the catalog`, async () => {
    const { cacheManager, service } = buildService();
    const cached = [
      {
        id: `payment-operations-review`,
        label: `Payment operations review`,
        description: `Jump straight into the manual review buckets for payment cases with derived follow-up reasons.`,
        eyebrow: `Queue-first`,
        operatorModel: `entry-only`,
        targetPath: `/payments/operations`,
        surfaces: [`overview`],
      },
    ];
    cacheManager.get.mockResolvedValue(cached);

    await expect(service.list(`overview`)).resolves.toEqual(cached);

    expect(cacheManager.get).toHaveBeenCalledWith(`admin-v2-quickstarts:list:overview`);
    expect(cacheManager.set).not.toHaveBeenCalled();
  });

  it(`caches resolved quickstart presets`, async () => {
    const { cacheManager, service } = buildService();
    cacheManager.get.mockResolvedValue(undefined);

    const quickstart = await service.get(`payment-operations-review`);

    expect(cacheManager.set).toHaveBeenCalledWith(
      `admin-v2-quickstarts:get:payment-operations-review`,
      quickstart,
      300_000,
    );
  });

  it(`fails closed for unknown quickstart ids`, async () => {
    const { cacheManager, service } = buildService();
    cacheManager.get.mockResolvedValue(undefined);

    await expect(service.get(`unknown` as never)).rejects.toThrow(NotFoundException);
    expect(cacheManager.set).not.toHaveBeenCalled();
  });
});
