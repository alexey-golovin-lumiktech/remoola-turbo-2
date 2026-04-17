import { AdminV2SystemController } from './admin-v2-system.controller';

describe(`AdminV2SystemController`, () => {
  it(`guards the summary route with system.read`, async () => {
    const assertCapability = jest.fn(async () => ({
      role: `OPS_ADMIN`,
      capabilities: [`system.read`],
      workspaces: [`system`],
      source: `schema`,
    }));
    const getSummary = jest.fn(async () => ({ computedAt: `2026-04-17T12:00:00.000Z`, cards: {} }));
    const controller = new AdminV2SystemController(
      {
        getSummary,
      } as never,
      {
        assertCapability,
      } as never,
    );

    const admin = {
      id: `admin-1`,
      email: `ops@example.com`,
      type: `ADMIN`,
      sessionId: `session-1`,
    } as never;

    const result = await controller.getSummary(admin);

    expect(assertCapability).toHaveBeenCalledWith(expect.objectContaining({ id: `admin-1` }), `system.read`);
    expect(getSummary).toHaveBeenCalled();
    expect(result).toEqual({ computedAt: `2026-04-17T12:00:00.000Z`, cards: {} });
  });
});
