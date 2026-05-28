import { describe, expect, it, jest } from '@jest/globals';

import { AdminV2AdminSessionsQuery } from './admin-v2-admin-sessions.query';

describe(`AdminV2AdminSessionsQuery`, () => {
  it(`looks up an active admin id with the expected guard filter`, async () => {
    const findFirst = jest.fn<(...a: any[]) => any>(async () => null);
    const query = new AdminV2AdminSessionsQuery({
      adminModel: { findFirst },
    } as never);

    await query.findActiveAdminId(`admin-2`);

    expect(findFirst).toHaveBeenCalledWith({
      where: { id: `admin-2`, deletedAt: null },
      select: { id: true },
    });
  });

  it(`looks up an owned session id with the expected admin/session filter`, async () => {
    const findFirst = jest.fn<(...a: any[]) => any>(async () => null);
    const query = new AdminV2AdminSessionsQuery({
      adminAuthSessionModel: { findFirst },
    } as never);

    await query.findOwnedSessionId({ adminId: `admin-2`, sessionId: `session-2` });

    expect(findFirst).toHaveBeenCalledWith({
      where: { id: `session-2`, adminId: `admin-2` },
      select: { id: true },
    });
  });
});
