import { AdminV2PayoutsController } from './admin-v2-payouts.controller';

describe(`AdminV2PayoutsController`, () => {
  it(`guards payout read routes with ledger.read and escalation writes with payouts.escalate only`, async () => {
    const assertCapability = jest.fn(async () => ({
      role: `OPS_ADMIN`,
      capabilities: [`ledger.read`],
      workspaces: [`ledger`],
      source: `schema`,
    }));
    const listPayouts = jest.fn(async () => ({ items: [], pageInfo: { nextCursor: null, limit: 25 } }));
    const getPayoutCase = jest.fn(async () => ({ id: `payout-1` }));
    const escalatePayout = jest.fn(async () => ({ payoutId: `payout-1`, escalationId: `esc-1` }));
    const controller = new AdminV2PayoutsController(
      {
        listPayouts,
        getPayoutCase,
        escalatePayout,
      } as never,
      {
        assertCapability,
      } as never,
    );

    await controller.listPayouts(
      {
        id: `admin-1`,
        email: `ops@example.com`,
        type: `ADMIN`,
        sessionId: `session-1`,
      } as never,
      {
        cursor: `cursor-1`,
        limit: `10`,
      },
    );

    await controller.getPayoutCase(
      {
        id: `admin-1`,
        email: `ops@example.com`,
        type: `ADMIN`,
        sessionId: `session-1`,
      } as never,
      `payout-1`,
    );

    await controller.escalatePayout(
      {
        id: `admin-1`,
        email: `super@example.com`,
        type: `SUPER`,
        sessionId: `session-1`,
      } as never,
      `payout-1`,
      {
        confirmed: true,
        version: 10,
        reason: `Ops handoff`,
      },
      {
        ip: `127.0.0.1`,
        headers: {
          'user-agent': `jest`,
          'idempotency-key': `idem-1`,
        },
      } as never,
    );

    expect(assertCapability).toHaveBeenNthCalledWith(1, expect.objectContaining({ id: `admin-1` }), `ledger.read`);
    expect(listPayouts).toHaveBeenCalledWith({
      cursor: `cursor-1`,
      limit: 10,
    });
    expect(assertCapability).toHaveBeenNthCalledWith(2, expect.objectContaining({ id: `admin-1` }), `ledger.read`);
    expect(getPayoutCase).toHaveBeenCalledWith(`payout-1`);
    expect(assertCapability).toHaveBeenNthCalledWith(3, expect.objectContaining({ id: `admin-1` }), `payouts.escalate`);
    expect(escalatePayout).toHaveBeenCalledWith(
      `payout-1`,
      `admin-1`,
      {
        confirmed: true,
        version: 10,
        reason: `Ops handoff`,
      },
      expect.objectContaining({
        ipAddress: `127.0.0.1`,
        userAgent: `jest`,
        idempotencyKey: `idem-1`,
      }),
    );
  });
});
