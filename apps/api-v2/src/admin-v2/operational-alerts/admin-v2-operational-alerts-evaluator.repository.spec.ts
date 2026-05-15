import { AdminV2OperationalAlertsEvaluatorRepository } from './admin-v2-operational-alerts-evaluator.repository';

describe(`AdminV2OperationalAlertsEvaluatorRepository`, () => {
  function buildRepository() {
    const update = jest.fn().mockResolvedValue(undefined);
    return {
      repository: new AdminV2OperationalAlertsEvaluatorRepository({
        operationalAlertModel: { update },
      } as never),
      update,
    };
  }

  it(`records fired state and truncates long reasons`, async () => {
    const { repository, update } = buildRepository();

    await repository.recordFired(`alert-1`, `x`.repeat(1500));

    const args = update.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(args.data.lastFiredAt).toBeInstanceOf(Date);
    expect((args.data.lastFireReason as string).length).toBe(500);
    expect(args.data.lastEvaluationError).toBeNull();
  });

  it(`records evaluator errors and truncates long messages`, async () => {
    const { repository, update } = buildRepository();

    await repository.recordError(`alert-1`, `e`.repeat(2000));

    const args = update.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(args.data.lastEvaluatedAt).toBeInstanceOf(Date);
    expect((args.data.lastEvaluationError as string).length).toBe(500);
  });
});
