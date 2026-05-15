import { AdminV2ExchangeRuleQuery } from './admin-v2-exchange-rule.query';

describe(`AdminV2ExchangeRuleQuery`, () => {
  it(`lists rules with consumer include and total count`, async () => {
    const count = jest.fn(async () => 2);
    const findMany = jest.fn(async () => []);
    const query = new AdminV2ExchangeRuleQuery({
      walletAutoConversionRuleModel: { count, findMany },
    } as never);

    await query.listRules({
      where: { deletedAt: null },
      skip: 0,
      take: 25,
    });

    expect(count).toHaveBeenCalledWith({ where: { deletedAt: null } });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { deletedAt: null },
        include: { consumer: { select: { id: true, email: true } } },
        orderBy: [{ updatedAt: `desc` }, { id: `desc` }],
        skip: 0,
        take: 25,
      }),
    );
  });

  it(`loads a single rule case with consumer include`, async () => {
    const findFirst = jest.fn(async () => null);
    const query = new AdminV2ExchangeRuleQuery({
      walletAutoConversionRuleModel: { findFirst },
    } as never);

    await query.findRuleById(`rule-1`);

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: `rule-1`, deletedAt: null },
        include: { consumer: { select: { id: true, email: true } } },
      }),
    );
  });
});
