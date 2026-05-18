import { Test } from '@nestjs/testing';

import { AdminV2OperationalAlertsAuthRefreshReuseQuery } from './admin-v2-operational-alerts-auth-refresh-reuse.query';
import { AuthRefreshReuseAlertEvaluator } from './admin-v2-operational-alerts-workspace-evaluators-auth-refresh-reuse';

type AuthRefreshReuseQueryMock = {
  countRefreshReuseSince: jest.Mock<Promise<number>, [Date]>;
};

function buildHarness(count = 0) {
  const query = {
    countRefreshReuseSince: jest.fn(async (_since: Date) => count),
  } satisfies AuthRefreshReuseQueryMock;
  const evaluator = new AuthRefreshReuseAlertEvaluator(
    query as unknown as AdminV2OperationalAlertsAuthRefreshReuseQuery,
  );
  return { evaluator, countRefreshReuseSince: query.countRefreshReuseSince };
}

describe(`AuthRefreshReuseAlertEvaluator`, () => {
  it(`resolves from the Nest container with the concrete query token`, async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthRefreshReuseAlertEvaluator,
        {
          provide: AdminV2OperationalAlertsAuthRefreshReuseQuery,
          useValue: { countRefreshReuseSince: jest.fn(async () => 0) },
        },
      ],
    }).compile();

    expect(moduleRef.get(AuthRefreshReuseAlertEvaluator)).toBeInstanceOf(AuthRefreshReuseAlertEvaluator);
  });

  it(`returns refresh reuse observations`, async () => {
    const { evaluator, countRefreshReuseSince } = buildHarness(7);
    const result = await evaluator.evaluate({ windowMinutes: 30 });
    expect(result.observedValue).toBe(7);
    expect(result.reasonSubject).toBe(`refresh_reuse count`);
    expect(result.reasonDetail).toBe(`in last 30m`);
    expect(countRefreshReuseSince).toHaveBeenCalledWith(expect.any(Date));
  });

  it(`returns the observed count without threshold dispatch`, async () => {
    const { evaluator } = buildHarness(5);
    const result = await evaluator.evaluate({ windowMinutes: 60 });
    expect(result.observedValue).toBe(5);
    expect(result.reasonDetail).toBe(`in last 60m`);
  });

  it(`rejects unknown payload keys`, async () => {
    const { evaluator } = buildHarness(0);
    await expect(evaluator.evaluate({ windowMinutes: 5, foo: 1 })).rejects.toThrow(/not recognized/);
  });

  it(`rejects null/undefined payload`, async () => {
    const { evaluator } = buildHarness(0);
    await expect(evaluator.evaluate(null)).rejects.toThrow(/required/);
    await expect(evaluator.evaluate(undefined)).rejects.toThrow(/required/);
  });

  it(`rejects out-of-range windowMinutes`, async () => {
    const { evaluator } = buildHarness(0);
    await expect(evaluator.evaluate({ windowMinutes: 0 })).rejects.toThrow(/integer in/);
    await expect(evaluator.evaluate({ windowMinutes: 1441 })).rejects.toThrow(/integer in/);
    await expect(evaluator.evaluate({ windowMinutes: 1.5 })).rejects.toThrow(/integer in/);
    await expect(evaluator.evaluate({ windowMinutes: -1 })).rejects.toThrow(/integer in/);
  });

  it(`uses correct gte cutoff for windowMinutes`, async () => {
    const { evaluator, countRefreshReuseSince } = buildHarness(0);
    const fixedNow = new Date(`2026-04-21T12:00:00.000Z`);
    jest.useFakeTimers().setSystemTime(fixedNow);
    await evaluator.evaluate({ windowMinutes: 10 });
    const since = countRefreshReuseSince.mock.calls[0]?.[0];
    expect(since).toBeDefined();
    if (!since) throw new Error(`Expected refresh reuse query to be called`);
    expect(fixedNow.getTime() - since.getTime()).toBe(10 * 60 * 1000);
    jest.useRealTimers();
  });
});
