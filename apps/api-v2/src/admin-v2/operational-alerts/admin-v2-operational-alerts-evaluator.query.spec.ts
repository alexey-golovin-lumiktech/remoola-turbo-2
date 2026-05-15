import { AdminV2OperationalAlertsEvaluatorQuery } from './admin-v2-operational-alerts-evaluator.query';
import { EVALUATOR_TICK_MAX_ALERTS } from './admin-v2-operational-alerts-evaluator.service';

describe(`AdminV2OperationalAlertsEvaluatorQuery`, () => {
  it(`selects due alerts via parameterized raw SQL with the tick limit`, async () => {
    const queryRaw = jest.fn(async () => []);
    const query = new AdminV2OperationalAlertsEvaluatorQuery({
      $queryRaw: queryRaw,
    } as never);

    await query.selectDueAlerts(EVALUATOR_TICK_MAX_ALERTS);

    expect(queryRaw).toHaveBeenCalledTimes(1);
    const firstCall = queryRaw.mock.calls[0] as unknown as [{ values: unknown[] }];
    const sql = firstCall[0];
    const values = sql?.values;
    expect(Array.isArray(values)).toBe(true);
    expect(values).toContain(EVALUATOR_TICK_MAX_ALERTS);
  });
});
