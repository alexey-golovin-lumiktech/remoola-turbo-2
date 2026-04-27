import { NotFoundException } from '@nestjs/common';

import { AdminV2QuickstartsService } from './admin-v2-quickstarts.service';

describe(`AdminV2QuickstartsService`, () => {
  it(`returns the expanded catalog for overview and preserves capability-gated entries`, () => {
    const service = new AdminV2QuickstartsService();

    const quickstarts = service.list(`overview`);

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
  });

  it(`fails closed for unknown quickstart ids`, () => {
    const service = new AdminV2QuickstartsService();

    expect(() => service.get(`unknown` as never)).toThrow(NotFoundException);
  });
});
