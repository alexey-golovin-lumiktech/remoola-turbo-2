import { VerificationQueueAlertEvaluator } from './admin-v2-operational-alerts-workspace-evaluators-verification';

import type { OperationalAlertThreshold } from './admin-v2-operational-alerts-thresholds';

type GetQueueCountFilters = {
  status?: string;
  stripeIdentityStatus?: string;
  country?: string;
  contractorKind?: string;
};

function buildEvaluator(
  opts: {
    countResult?: number;
    countImpl?: jest.Mock;
  } = {},
) {
  const getQueueCount = opts.countImpl ?? jest.fn(async () => opts.countResult ?? 0);
  const verification = { getQueueCount } as never;
  const evaluator = new VerificationQueueAlertEvaluator(verification);
  return { evaluator, getQueueCount };
}

const COUNT_GT_FIVE: OperationalAlertThreshold = { type: `count_gt`, value: 5 };

describe(`VerificationQueueAlertEvaluator`, () => {
  describe(`payload parsing`, () => {
    it(`treats null payload as empty filters`, async () => {
      const { evaluator, getQueueCount } = buildEvaluator({ countResult: 0 });

      await evaluator.evaluate(null, COUNT_GT_FIVE);

      expect(getQueueCount).toHaveBeenCalledWith({});
    });

    it(`treats undefined payload as empty filters`, async () => {
      const { evaluator, getQueueCount } = buildEvaluator({ countResult: 0 });

      await evaluator.evaluate(undefined, COUNT_GT_FIVE);

      expect(getQueueCount).toHaveBeenCalledWith({});
    });

    it(`treats empty object payload as empty filters`, async () => {
      const { evaluator, getQueueCount } = buildEvaluator({ countResult: 0 });

      await evaluator.evaluate({}, COUNT_GT_FIVE);

      expect(getQueueCount).toHaveBeenCalledWith({});
    });

    it(`forwards a single supported filter to getQueueCount`, async () => {
      const { evaluator, getQueueCount } = buildEvaluator({ countResult: 0 });

      await evaluator.evaluate({ status: `PENDING` }, COUNT_GT_FIVE);

      expect(getQueueCount).toHaveBeenCalledWith({ status: `PENDING` });
    });

    it(`forwards all four supported filters together`, async () => {
      const { evaluator, getQueueCount } = buildEvaluator({ countResult: 0 });

      await evaluator.evaluate(
        {
          status: `MORE_INFO`,
          stripeIdentityStatus: `requires_input`,
          country: `DE`,
          contractorKind: `BUSINESS`,
        },
        COUNT_GT_FIVE,
      );

      expect(getQueueCount).toHaveBeenCalledWith({
        status: `MORE_INFO`,
        stripeIdentityStatus: `requires_input`,
        country: `DE`,
        contractorKind: `BUSINESS`,
      });
    });

    it(`trims whitespace from string filters`, async () => {
      const { evaluator, getQueueCount } = buildEvaluator({ countResult: 0 });

      await evaluator.evaluate({ status: `  PENDING  `, country: `  US  ` }, COUNT_GT_FIVE);

      expect(getQueueCount).toHaveBeenCalledWith({ status: `PENDING`, country: `US` });
    });

    it(`drops empty / whitespace-only string filters silently`, async () => {
      const { evaluator, getQueueCount } = buildEvaluator({ countResult: 0 });

      await evaluator.evaluate({ status: ``, country: `   `, stripeIdentityStatus: `\t` }, COUNT_GT_FIVE);

      expect(getQueueCount).toHaveBeenCalledWith({});
    });

    it(`rejects payloads containing missingProfileData (frontend-only filter)`, async () => {
      const { evaluator, getQueueCount } = buildEvaluator({ countResult: 0 });

      await expect(evaluator.evaluate({ missingProfileData: true }, COUNT_GT_FIVE)).rejects.toThrow(
        /missingProfileData[\s\S]*not supported by verification_queue evaluator/,
      );
      expect(getQueueCount).not.toHaveBeenCalled();
    });

    it(`rejects payloads containing missingDocuments (frontend-only filter)`, async () => {
      const { evaluator, getQueueCount } = buildEvaluator({ countResult: 0 });

      await expect(evaluator.evaluate({ missingDocuments: true }, COUNT_GT_FIVE)).rejects.toThrow(
        /missingDocuments[\s\S]*not supported by verification_queue evaluator/,
      );
      expect(getQueueCount).not.toHaveBeenCalled();
    });

    it(`rejects payloads containing page (pagination is not part of an alert query)`, async () => {
      const { evaluator } = buildEvaluator();

      await expect(evaluator.evaluate({ page: 2 }, COUNT_GT_FIVE)).rejects.toThrow(
        /page[\s\S]*not supported by verification_queue evaluator/,
      );
    });

    it(`rejects payloads containing unknown keys`, async () => {
      const { evaluator } = buildEvaluator();

      await expect(evaluator.evaluate({ foo: `bar` }, COUNT_GT_FIVE)).rejects.toThrow(/key "foo" is not recognized/);
    });

    it(`rejects primitive payloads`, async () => {
      const { evaluator } = buildEvaluator();

      await expect(evaluator.evaluate(`pending`, COUNT_GT_FIVE)).rejects.toThrow(/queryPayload must be an object/);
      await expect(evaluator.evaluate(7, COUNT_GT_FIVE)).rejects.toThrow(/queryPayload must be an object/);
      await expect(evaluator.evaluate(true, COUNT_GT_FIVE)).rejects.toThrow(/queryPayload must be an object/);
    });

    it(`rejects array payloads`, async () => {
      const { evaluator } = buildEvaluator();

      await expect(evaluator.evaluate([{ status: `PENDING` }], COUNT_GT_FIVE)).rejects.toThrow(
        /queryPayload must be an object/,
      );
    });
  });

  describe(`threshold dispatch (count_gt)`, () => {
    it(`fires when count strictly exceeds threshold and includes observedValue`, async () => {
      const { evaluator } = buildEvaluator({ countResult: 7 });

      const result = await evaluator.evaluate({ status: `PENDING` }, COUNT_GT_FIVE);

      expect(result.fired).toBe(true);
      expect(result.observedValue).toBe(7);
      expect(result.reason).toMatch(/queue count=7 exceeded threshold=5 \(count_gt\)/);
    });

    it(`does NOT fire when count equals threshold (strict greater-than)`, async () => {
      const { evaluator } = buildEvaluator({ countResult: 5 });

      const result = await evaluator.evaluate({}, COUNT_GT_FIVE);

      expect(result.fired).toBe(false);
      expect(result.reason).toBeNull();
      expect(result.observedValue).toBe(5);
    });

    it(`does NOT fire when count is below threshold`, async () => {
      const { evaluator } = buildEvaluator({ countResult: 0 });

      const result = await evaluator.evaluate({}, COUNT_GT_FIVE);

      expect(result.fired).toBe(false);
      expect(result.reason).toBeNull();
      expect(result.observedValue).toBe(0);
    });

    it(`throws on unknown threshold type via TypeScript exhaustiveness assertion`, async () => {
      const { evaluator } = buildEvaluator({ countResult: 0 });

      await expect(
        evaluator.evaluate({}, { type: `unknown_type`, value: 1 } as unknown as OperationalAlertThreshold),
      ).rejects.toThrow(/Unhandled threshold type for verification_queue/);
    });
  });

  describe(`integration shape`, () => {
    it(`forwards exactly the parsed filter object (no extra wrapping) to verification.getQueueCount`, async () => {
      const getQueueCount: GetQueueCountFilters extends never ? never : jest.Mock = jest.fn().mockResolvedValue(3);
      const { evaluator } = buildEvaluator({ countImpl: getQueueCount as jest.Mock });

      await evaluator.evaluate({ status: `FLAGGED`, country: `US` }, COUNT_GT_FIVE);

      expect(getQueueCount).toHaveBeenCalledTimes(1);
      const arg = getQueueCount.mock.calls[0]?.[0] as GetQueueCountFilters;
      expect(arg).toEqual({ status: `FLAGGED`, country: `US` });
    });
  });
});
