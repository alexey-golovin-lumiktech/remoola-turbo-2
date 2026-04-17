import { AdminV2Controller } from './admin-v2.controller';

describe(`AdminV2Controller`, () => {
  it(`returns truthful read-path identity fields from the resolved access profile`, async () => {
    const controller = new AdminV2Controller({
      assertCapability: jest.fn(async () => ({
        role: `OPS_ADMIN`,
        capabilities: [
          `me.read`,
          `overview.read`,
          `verification.read`,
          `consumers.read`,
          `payments.read`,
          `ledger.read`,
          `exchange.read`,
          `documents.read`,
          `payment_methods.read`,
          `system.read`,
          `consumers.notes`,
          `consumers.flags`,
          `audit.read`,
        ],
        workspaces: [
          `overview`,
          `verification`,
          `consumers`,
          `payments`,
          `ledger`,
          `audit`,
          `exchange`,
          `documents`,
          `payment_methods`,
          `system`,
        ],
        source: `schema`,
      })),
    } as never);

    const result = await controller.getMe({
      id: `admin-ops`,
      email: `ops@example.com`,
      type: `ADMIN`,
      sessionId: `session-1`,
    });

    expect(result).toEqual({
      id: `admin-ops`,
      email: `ops@example.com`,
      type: `ADMIN`,
      role: `OPS_ADMIN`,
      phase: `MVP-3 system maturity kickoff`,
      capabilities: [
        `me.read`,
        `overview.read`,
        `verification.read`,
        `consumers.read`,
        `payments.read`,
        `ledger.read`,
        `exchange.read`,
        `documents.read`,
        `payment_methods.read`,
        `system.read`,
        `consumers.notes`,
        `consumers.flags`,
        `audit.read`,
      ],
      workspaces: [
        `overview`,
        `verification`,
        `consumers`,
        `payments`,
        `ledger`,
        `audit`,
        `exchange`,
        `documents`,
        `payment_methods`,
        `system`,
      ],
    });
  });
});
