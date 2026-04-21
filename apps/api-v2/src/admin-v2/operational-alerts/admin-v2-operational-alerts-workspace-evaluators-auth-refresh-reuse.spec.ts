import { AuthRefreshReuseAlertEvaluator } from './admin-v2-operational-alerts-workspace-evaluators-auth-refresh-reuse';
import { AUTH_AUDIT_EVENTS } from '../../shared/auth-audit.service';

import type { OperationalAlertThreshold } from './admin-v2-operational-alerts-thresholds';

function buildHarness(count = 0) {
  const authAuditCount = jest.fn(async () => count);
  const prisma = { authAuditLogModel: { count: authAuditCount } };
  const evaluator = new AuthRefreshReuseAlertEvaluator(prisma as never);
  return { evaluator, authAuditCount };
}

const COUNT_GT_5: OperationalAlertThreshold = { type: `count_gt`, value: 5 };

describe(`AuthRefreshReuseAlertEvaluator`, () => {
  it(`fires when count exceeds threshold (count_gt)`, async () => {
    const { evaluator, authAuditCount } = buildHarness(7);
    const result = await evaluator.evaluate({ windowMinutes: 30 }, COUNT_GT_5);
    expect(result.fired).toBe(true);
    expect(result.observedValue).toBe(7);
    expect(result.reason).toMatch(/refresh_reuse count=7 in last 30m/);
    expect(authAuditCount).toHaveBeenCalledWith({
      where: expect.objectContaining({
        identityType: `admin`,
        event: AUTH_AUDIT_EVENTS.refresh_reuse,
        createdAt: { gte: expect.any(Date) },
      }),
    });
  });

  it(`does not fire when count is at or below threshold`, async () => {
    const { evaluator } = buildHarness(5);
    const result = await evaluator.evaluate({ windowMinutes: 60 }, COUNT_GT_5);
    expect(result.fired).toBe(false);
    expect(result.reason).toBeNull();
    expect(result.observedValue).toBe(5);
  });

  it(`rejects unknown payload keys`, async () => {
    const { evaluator } = buildHarness(0);
    await expect(evaluator.evaluate({ windowMinutes: 5, foo: 1 }, COUNT_GT_5)).rejects.toThrow(/not recognized/);
  });

  it(`rejects null/undefined payload`, async () => {
    const { evaluator } = buildHarness(0);
    await expect(evaluator.evaluate(null, COUNT_GT_5)).rejects.toThrow(/required/);
    await expect(evaluator.evaluate(undefined, COUNT_GT_5)).rejects.toThrow(/required/);
  });

  it(`rejects out-of-range windowMinutes`, async () => {
    const { evaluator } = buildHarness(0);
    await expect(evaluator.evaluate({ windowMinutes: 0 }, COUNT_GT_5)).rejects.toThrow(/integer in/);
    await expect(evaluator.evaluate({ windowMinutes: 1441 }, COUNT_GT_5)).rejects.toThrow(/integer in/);
    await expect(evaluator.evaluate({ windowMinutes: 1.5 }, COUNT_GT_5)).rejects.toThrow(/integer in/);
    await expect(evaluator.evaluate({ windowMinutes: -1 }, COUNT_GT_5)).rejects.toThrow(/integer in/);
  });

  it(`uses correct gte cutoff for windowMinutes`, async () => {
    const { evaluator, authAuditCount } = buildHarness(0);
    const fixedNow = new Date(`2026-04-21T12:00:00.000Z`);
    jest.useFakeTimers().setSystemTime(fixedNow);
    await evaluator.evaluate({ windowMinutes: 10 }, COUNT_GT_5);
    const call = authAuditCount.mock.calls[0] as unknown as [{ where: { createdAt: { gte: Date } } }] | undefined;
    expect(call).toBeDefined();
    const since = call![0].where.createdAt.gte;
    expect(fixedNow.getTime() - since.getTime()).toBe(10 * 60 * 1000);
    jest.useRealTimers();
  });

  it(`throws on unsupported threshold type`, async () => {
    const { evaluator } = buildHarness(10);
    await expect(
      evaluator.evaluate({ windowMinutes: 5 }, { type: `unknown_type` } as unknown as OperationalAlertThreshold),
    ).rejects.toThrow(/Unhandled threshold type/);
  });
});
