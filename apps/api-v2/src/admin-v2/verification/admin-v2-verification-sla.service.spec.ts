import { describe, expect, it, jest } from '@jest/globals';

import { AdminV2VerificationSlaService } from './admin-v2-verification-sla.service';

describe(`AdminV2VerificationSlaService`, () => {
  function buildService() {
    const query = {
      listActiveVerificationSlaCandidates: jest.fn<(...a: any[]) => any>(async () => []),
    };

    return {
      service: new AdminV2VerificationSlaService(query as never),
      query,
    };
  }

  it(`refreshes breached ids from active verification candidates`, async () => {
    const { service, query } = buildService();
    query.listActiveVerificationSlaCandidates.mockResolvedValueOnce([
      {
        id: `consumer-breached`,
        createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000),
        verificationUpdatedAt: null,
      },
      {
        id: `consumer-fresh`,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        verificationUpdatedAt: new Date(Date.now() - 60 * 60 * 1000),
      },
    ]);

    await service.refreshBreaches();

    await expect(service.getSnapshot()).resolves.toEqual({
      breachedConsumerIds: new Set([`consumer-breached`]),
      lastComputedAt: expect.any(String),
      thresholdHours: 24,
    });
  });

  it(`lazily refreshes on getSnapshot before the first successful computation`, async () => {
    const { service, query } = buildService();
    query.listActiveVerificationSlaCandidates.mockResolvedValueOnce([
      {
        id: `consumer-1`,
        createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000),
        verificationUpdatedAt: null,
      },
    ]);

    const snapshot = await service.getSnapshot();

    expect(query.listActiveVerificationSlaCandidates).toHaveBeenCalledTimes(1);
    expect(snapshot).toEqual({
      breachedConsumerIds: new Set([`consumer-1`]),
      lastComputedAt: expect.any(String),
      thresholdHours: 24,
    });
  });
});
