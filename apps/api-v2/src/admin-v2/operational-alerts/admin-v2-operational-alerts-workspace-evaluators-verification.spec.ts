import { VerificationQueueAlertEvaluator } from './admin-v2-operational-alerts-workspace-evaluators-verification';

type GetQueueCountFilters = {
  status?: string;
  stripeIdentityStatus?: string;
  country?: string;
  contractorKind?: string;
  missingProfileData?: boolean;
  missingDocuments?: boolean;
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

describe(`VerificationQueueAlertEvaluator`, () => {
  describe(`payload parsing`, () => {
    it(`treats null payload as empty filters`, async () => {
      const { evaluator, getQueueCount } = buildEvaluator({ countResult: 0 });

      await evaluator.evaluate(null);

      expect(getQueueCount).toHaveBeenCalledWith({});
    });

    it(`treats undefined payload as empty filters`, async () => {
      const { evaluator, getQueueCount } = buildEvaluator({ countResult: 0 });

      await evaluator.evaluate(undefined);

      expect(getQueueCount).toHaveBeenCalledWith({});
    });

    it(`treats empty object payload as empty filters`, async () => {
      const { evaluator, getQueueCount } = buildEvaluator({ countResult: 0 });

      await evaluator.evaluate({});

      expect(getQueueCount).toHaveBeenCalledWith({});
    });

    it(`forwards a single supported filter to getQueueCount`, async () => {
      const { evaluator, getQueueCount } = buildEvaluator({ countResult: 0 });

      await evaluator.evaluate({ status: `PENDING` });

      expect(getQueueCount).toHaveBeenCalledWith({ status: `PENDING` });
    });

    it(`forwards all four supported filters together`, async () => {
      const { evaluator, getQueueCount } = buildEvaluator({ countResult: 0 });

      await evaluator.evaluate({
        status: `MORE_INFO`,
        stripeIdentityStatus: `requires_input`,
        country: `DE`,
        contractorKind: `BUSINESS`,
      });

      expect(getQueueCount).toHaveBeenCalledWith({
        status: `MORE_INFO`,
        stripeIdentityStatus: `requires_input`,
        country: `DE`,
        contractorKind: `BUSINESS`,
      });
    });

    it(`trims whitespace from string filters`, async () => {
      const { evaluator, getQueueCount } = buildEvaluator({ countResult: 0 });

      await evaluator.evaluate({ status: `  PENDING  `, country: `  US  ` });

      expect(getQueueCount).toHaveBeenCalledWith({ status: `PENDING`, country: `US` });
    });

    it(`drops empty / whitespace-only string filters silently`, async () => {
      const { evaluator, getQueueCount } = buildEvaluator({ countResult: 0 });

      await evaluator.evaluate({ status: ``, country: `   `, stripeIdentityStatus: `\t` });

      expect(getQueueCount).toHaveBeenCalledWith({});
    });

    it(`forwards missingProfileData to getQueueCount`, async () => {
      const { evaluator, getQueueCount } = buildEvaluator({ countResult: 0 });

      await evaluator.evaluate({ missingProfileData: true });

      expect(getQueueCount).toHaveBeenCalledWith({ missingProfileData: true });
    });

    it(`forwards missingDocuments to getQueueCount`, async () => {
      const { evaluator, getQueueCount } = buildEvaluator({ countResult: 0 });

      await evaluator.evaluate({ missingDocuments: true });

      expect(getQueueCount).toHaveBeenCalledWith({ missingDocuments: true });
    });

    it(`forwards all supported filters including saved-view parity booleans`, async () => {
      const { evaluator, getQueueCount } = buildEvaluator({ countResult: 0 });

      await evaluator.evaluate({
        status: `MORE_INFO`,
        stripeIdentityStatus: `requires_input`,
        country: `DE`,
        contractorKind: `BUSINESS`,
        missingProfileData: true,
        missingDocuments: true,
      });

      expect(getQueueCount).toHaveBeenCalledWith({
        status: `MORE_INFO`,
        stripeIdentityStatus: `requires_input`,
        country: `DE`,
        contractorKind: `BUSINESS`,
        missingProfileData: true,
        missingDocuments: true,
      });
    });

    it(`rejects payloads containing page (pagination is not part of an alert query)`, async () => {
      const { evaluator } = buildEvaluator();

      await expect(evaluator.evaluate({ page: 2 })).rejects.toThrow(
        /page[\s\S]*not supported by verification_queue evaluator/,
      );
    });

    it(`rejects payloads containing unknown keys`, async () => {
      const { evaluator } = buildEvaluator();

      await expect(evaluator.evaluate({ foo: `bar` })).rejects.toThrow(/key "foo" is not recognized/);
    });

    it(`rejects primitive payloads`, async () => {
      const { evaluator } = buildEvaluator();

      await expect(evaluator.evaluate(`pending`)).rejects.toThrow(/queryPayload must be an object/);
      await expect(evaluator.evaluate(7)).rejects.toThrow(/queryPayload must be an object/);
      await expect(evaluator.evaluate(true)).rejects.toThrow(/queryPayload must be an object/);
    });

    it(`rejects array payloads`, async () => {
      const { evaluator } = buildEvaluator();

      await expect(evaluator.evaluate([{ status: `PENDING` }])).rejects.toThrow(/queryPayload must be an object/);
    });
  });

  describe(`observation`, () => {
    it(`returns the queue count observation`, async () => {
      const { evaluator } = buildEvaluator({ countResult: 7 });

      const result = await evaluator.evaluate({ status: `PENDING` });

      expect(result.observedValue).toBe(7);
      expect(result.reasonSubject).toBe(`queue count`);
    });

    it(`returns observations when count is zero`, async () => {
      const { evaluator } = buildEvaluator({ countResult: 5 });

      const result = await evaluator.evaluate({});

      expect(result.observedValue).toBe(5);
      expect(result.reasonSubject).toBe(`queue count`);
    });
  });

  describe(`integration shape`, () => {
    it(`forwards exactly the parsed filter object (no extra wrapping) to verification.getQueueCount`, async () => {
      const getQueueCount: GetQueueCountFilters extends never ? never : jest.Mock = jest.fn().mockResolvedValue(3);
      const { evaluator } = buildEvaluator({ countImpl: getQueueCount as jest.Mock });

      await evaluator.evaluate({ status: `FLAGGED`, country: `US` });

      expect(getQueueCount).toHaveBeenCalledTimes(1);
      const arg = getQueueCount.mock.calls[0]?.[0] as GetQueueCountFilters;
      expect(arg).toEqual({ status: `FLAGGED`, country: `US` });
    });
  });
});
