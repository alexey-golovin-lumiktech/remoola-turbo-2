import {
  AdminV2OperationalAlertsEvaluatorService,
  EVALUATOR_PER_ALERT_TIMEOUT_MS,
  EVALUATOR_TICK_MAX_ALERTS,
  EVALUATOR_TICK_WALL_BUDGET_MS,
} from './admin-v2-operational-alerts-evaluator.service';

import type { OperationalAlertWorkspaceEvaluator } from './admin-v2-operational-alerts-workspace-evaluators';

type DueAlertRow = {
  id: string;
  owner_id: string;
  workspace: string;
  name: string;
  query_payload: unknown;
  threshold_payload: unknown;
  evaluation_interval_minutes: number;
  last_evaluated_at: Date | null;
};

const OWNER_ID = `11111111-1111-4111-8111-111111111111`;
const ALERT_ID = `33333333-3333-4333-8333-333333333333`;

function dueRow(overrides: Partial<DueAlertRow> = {}): DueAlertRow {
  return {
    id: ALERT_ID,
    owner_id: OWNER_ID,
    workspace: `ledger_anomalies`,
    name: `My alert`,
    query_payload: { class: `stalePendingEntries` },
    threshold_payload: { type: `count_gt`, value: 5 },
    evaluation_interval_minutes: 5,
    last_evaluated_at: null,
    ...overrides,
  };
}

function buildHarness(opts: {
  evaluator?: jest.Mock;
  due?: DueAlertRow[];
  ledgerAnomaliesEvaluator?: OperationalAlertWorkspaceEvaluator;
}) {
  const operationalAlertModel = {
    update: jest.fn().mockResolvedValue(undefined),
  };
  const queryRaw = jest.fn().mockResolvedValue(opts.due ?? []);
  const prisma = {
    operationalAlertModel,
    $queryRaw: queryRaw,
  };
  const evaluatorMock = opts.evaluator ?? jest.fn();
  const ledgerAnomaliesEvaluator: OperationalAlertWorkspaceEvaluator = opts.ledgerAnomaliesEvaluator ?? {
    evaluate: evaluatorMock as unknown as OperationalAlertWorkspaceEvaluator[`evaluate`],
  };
  const service = new AdminV2OperationalAlertsEvaluatorService(prisma as never, ledgerAnomaliesEvaluator as never);
  return { service, prisma, operationalAlertModel, queryRaw, evaluatorMock };
}

describe(`AdminV2OperationalAlertsEvaluatorService`, () => {
  beforeEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe(`runTick — selection`, () => {
    it(`makes no row updates when no due alerts`, async () => {
      const { service, operationalAlertModel } = buildHarness({ due: [] });
      await service.runTick(Date.now());
      expect(operationalAlertModel.update).not.toHaveBeenCalled();
    });

    it(`enforces LIMIT of EVALUATOR_TICK_MAX_ALERTS via parameterized query`, async () => {
      const { service, queryRaw } = buildHarness({ due: [] });
      await service.runTick(Date.now());
      expect(queryRaw).toHaveBeenCalledTimes(1);
      const sql = queryRaw.mock.calls[0]?.[0];
      const values = sql?.values;
      expect(Array.isArray(values)).toBe(true);
      expect(values).toContain(EVALUATOR_TICK_MAX_ALERTS);
      const text = typeof sql === `object` && sql !== null && `text` in sql ? (sql as { text: string }).text : ``;
      expect(text).toContain(`"deleted_at" IS NULL`);
      expect(text).toContain(`last_evaluated_at`);
      expect(text).toContain(`evaluation_interval_minutes`);
    });
  });

  describe(`runTick — fired path`, () => {
    it(`writes last_fired_at, last_fire_reason and clears last_evaluation_error when fired=true`, async () => {
      const evaluator = jest
        .fn()
        .mockResolvedValue({ fired: true, reason: `count=8 exceeded threshold=5 (count_gt)`, observedValue: 8 });
      const { service, operationalAlertModel } = buildHarness({ due: [dueRow()], evaluator });
      await service.runTick(Date.now());
      expect(operationalAlertModel.update).toHaveBeenCalledTimes(1);
      const args = operationalAlertModel.update.mock.calls[0]?.[0] as {
        where: { id: string };
        data: Record<string, unknown>;
      };
      expect(args.where.id).toBe(ALERT_ID);
      expect(args.data.lastFiredAt).toBeInstanceOf(Date);
      expect(args.data.lastFireReason).toBe(`count=8 exceeded threshold=5 (count_gt)`);
      expect(args.data.lastEvaluatedAt).toBeInstanceOf(Date);
      expect(args.data.lastEvaluationError).toBeNull();
    });

    it(`truncates very long fire reason to 500 chars`, async () => {
      const huge = `x`.repeat(1500);
      const evaluator = jest.fn().mockResolvedValue({ fired: true, reason: huge });
      const { service, operationalAlertModel } = buildHarness({ due: [dueRow()], evaluator });
      await service.runTick(Date.now());
      const args = operationalAlertModel.update.mock.calls[0]?.[0] as { data: Record<string, unknown> };
      expect((args.data.lastFireReason as string).length).toBe(500);
    });
  });

  describe(`runTick — not fired path`, () => {
    it(`writes last_evaluated_at and clears last_evaluation_error but does NOT touch last_fired_at`, async () => {
      const evaluator = jest.fn().mockResolvedValue({ fired: false, reason: null, observedValue: 0 });
      const { service, operationalAlertModel } = buildHarness({ due: [dueRow()], evaluator });
      await service.runTick(Date.now());
      const args = operationalAlertModel.update.mock.calls[0]?.[0] as { data: Record<string, unknown> };
      expect(args.data.lastEvaluatedAt).toBeInstanceOf(Date);
      expect(args.data.lastEvaluationError).toBeNull();
      expect(args.data).not.toHaveProperty(`lastFiredAt`);
      expect(args.data).not.toHaveProperty(`lastFireReason`);
    });
  });

  describe(`runTick — error path`, () => {
    it(`records last_evaluation_error and does NOT touch last_fired_at when evaluator throws`, async () => {
      const evaluator = jest.fn().mockRejectedValue(new Error(`Anomaly query failed`));
      const { service, operationalAlertModel } = buildHarness({ due: [dueRow()], evaluator });
      await service.runTick(Date.now());
      const args = operationalAlertModel.update.mock.calls[0]?.[0] as { data: Record<string, unknown> };
      expect(args.data.lastEvaluationError).toBe(`Anomaly query failed`);
      expect(args.data.lastEvaluatedAt).toBeInstanceOf(Date);
      expect(args.data).not.toHaveProperty(`lastFiredAt`);
      expect(args.data).not.toHaveProperty(`lastFireReason`);
    });

    it(`truncates long error message to 500 chars`, async () => {
      const huge = `e`.repeat(2000);
      const evaluator = jest.fn().mockRejectedValue(new Error(huge));
      const { service, operationalAlertModel } = buildHarness({ due: [dueRow()], evaluator });
      await service.runTick(Date.now());
      const args = operationalAlertModel.update.mock.calls[0]?.[0] as { data: Record<string, unknown> };
      expect((args.data.lastEvaluationError as string).length).toBe(500);
    });

    it(`records timeout error when evaluator hangs longer than EVALUATOR_PER_ALERT_TIMEOUT_MS`, async () => {
      jest.useFakeTimers();
      const evaluator = jest.fn().mockImplementation(() => new Promise(() => {}));
      const { service, operationalAlertModel } = buildHarness({ due: [dueRow()], evaluator });
      const tick = service.runTick(Date.now());
      await jest.advanceTimersByTimeAsync(EVALUATOR_PER_ALERT_TIMEOUT_MS + 1);
      await tick;
      const args = operationalAlertModel.update.mock.calls[0]?.[0] as { data: Record<string, unknown> };
      expect(args.data.lastEvaluationError).toBe(`Evaluator timeout after ${EVALUATOR_PER_ALERT_TIMEOUT_MS}ms`);
      expect(args.data).not.toHaveProperty(`lastFiredAt`);
    });

    it(`records 'Unknown workspace evaluator' error when workspace strategy is missing`, async () => {
      const { service, operationalAlertModel } = buildHarness({
        due: [dueRow({ workspace: `payments_unknown` })],
      });
      await service.runTick(Date.now());
      const args = operationalAlertModel.update.mock.calls[0]?.[0] as { data: Record<string, unknown> };
      expect(args.data.lastEvaluationError).toContain(`Unknown workspace evaluator`);
      expect(args.data.lastEvaluationError).toContain(`payments_unknown`);
    });
  });

  describe(`runTick — error isolation across batch`, () => {
    it(`continues processing remaining alerts when one alert evaluation fails`, async () => {
      const due = [dueRow({ id: `a` }), dueRow({ id: `b` }), dueRow({ id: `c` })];
      const evaluator = jest
        .fn()
        .mockResolvedValueOnce({ fired: true, reason: `r-a` })
        .mockRejectedValueOnce(new Error(`boom`))
        .mockResolvedValueOnce({ fired: false, reason: null });
      const { service, operationalAlertModel } = buildHarness({ due, evaluator });
      await service.runTick(Date.now());
      expect(operationalAlertModel.update).toHaveBeenCalledTimes(3);
      const ids = operationalAlertModel.update.mock.calls.map((c) => (c[0] as { where: { id: string } }).where.id);
      expect(ids).toEqual([`a`, `b`, `c`]);
    });
  });

  describe(`runTick — wall budget`, () => {
    it(`stops processing once wall budget is exhausted`, async () => {
      const due = Array.from({ length: 5 }, (_, i) => dueRow({ id: `id-${i}` }));
      let nowValue = 1_000_000;
      const tickStart = nowValue;
      const dateNow = jest.spyOn(Date, `now`).mockImplementation(() => nowValue);
      const evaluator = jest.fn().mockImplementation(async () => {
        nowValue += EVALUATOR_TICK_WALL_BUDGET_MS / 2 + 1;
        return { fired: false, reason: null };
      });
      const { service, operationalAlertModel } = buildHarness({ due, evaluator });
      await service.runTick(tickStart);
      expect(operationalAlertModel.update.mock.calls.length).toBeLessThan(due.length);
      dateNow.mockRestore();
    });
  });

  describe(`evaluateDueAlerts — top-level resilience`, () => {
    it(`does not throw when runTick fails (selection query rejects)`, async () => {
      const { service, queryRaw } = buildHarness({});
      queryRaw.mockRejectedValueOnce(new Error(`db gone`));
      await expect(service.evaluateDueAlerts()).resolves.toBeUndefined();
    });
  });
});
