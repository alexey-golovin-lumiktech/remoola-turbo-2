import { describe, expect, it, jest } from '@jest/globals';

import { AdminV2AssignmentsQuery } from './admin-v2-assignments.query';

const OPS_ADMIN_ID = `11111111-1111-4111-8111-111111111111`;
const OTHER_ADMIN_ID = `22222222-2222-4222-8222-222222222222`;
const SUPER_ADMIN_ID = `33333333-3333-4333-8333-333333333333`;
const RESOURCE_ID = `44444444-4444-4444-8444-444444444444`;
const ASSIGNMENT_ID = `55555555-5555-4555-8555-555555555555`;

function buildQuery() {
  const adminModel = {
    findUnique: jest.fn<(...a: any[]) => any>(),
  };
  const prisma = {
    adminModel,
    $queryRaw: jest.fn<(...a: any[]) => any>(),
  };

  return {
    query: new AdminV2AssignmentsQuery(prisma as never),
    prisma,
    adminModel,
  };
}

describe(`AdminV2AssignmentsQuery`, () => {
  describe(`loadAdminSummary`, () => {
    it(`returns a null-name summary when the admin exists`, async () => {
      const { query, adminModel } = buildQuery();
      adminModel.findUnique.mockResolvedValueOnce({ id: OPS_ADMIN_ID, email: `ops@example.com` });

      await expect(query.loadAdminSummary(OPS_ADMIN_ID)).resolves.toEqual({
        id: OPS_ADMIN_ID,
        name: null,
        email: `ops@example.com`,
      });
    });

    it(`falls back to an opaque summary when the admin no longer exists`, async () => {
      const { query, adminModel } = buildQuery();
      adminModel.findUnique.mockResolvedValueOnce(null);

      await expect(query.loadAdminSummary(OPS_ADMIN_ID)).resolves.toEqual({
        id: OPS_ADMIN_ID,
        name: null,
        email: null,
      });
    });
  });

  describe(`getAssignmentContextForResource`, () => {
    it(`maps current and history from assignment summary rows`, async () => {
      const { query, prisma } = buildQuery();
      const releasedAssignedAt = new Date(`2026-04-19T09:00:00.000Z`);
      const releasedReleasedAt = new Date(`2026-04-19T10:00:00.000Z`);
      const activeAssignedAt = new Date(`2026-04-20T11:00:00.000Z`);
      prisma.$queryRaw.mockResolvedValueOnce([
        {
          id: ASSIGNMENT_ID,
          resource_id: RESOURCE_ID,
          assigned_to: OPS_ADMIN_ID,
          assigned_by: OPS_ADMIN_ID,
          released_by: null,
          assigned_at: activeAssignedAt,
          released_at: null,
          expires_at: null,
          reason: `Investigating`,
          assigned_to_email: `ops@example.com`,
          assigned_by_email: `ops@example.com`,
          released_by_email: null,
        },
        {
          id: `66666666-6666-4666-8666-666666666666`,
          resource_id: RESOURCE_ID,
          assigned_to: OTHER_ADMIN_ID,
          assigned_by: SUPER_ADMIN_ID,
          released_by: SUPER_ADMIN_ID,
          assigned_at: releasedAssignedAt,
          released_at: releasedReleasedAt,
          expires_at: null,
          reason: null,
          assigned_to_email: `other@example.com`,
          assigned_by_email: `super@example.com`,
          released_by_email: `super@example.com`,
        },
      ]);

      const result = await query.getAssignmentContextForResource(`payment_request`, RESOURCE_ID);

      expect(result.current).toEqual({
        id: ASSIGNMENT_ID,
        assignedTo: { id: OPS_ADMIN_ID, name: null, email: `ops@example.com` },
        assignedBy: { id: OPS_ADMIN_ID, name: null, email: `ops@example.com` },
        assignedAt: activeAssignedAt.toISOString(),
        reason: `Investigating`,
        expiresAt: null,
      });
      expect(result.history).toEqual([
        expect.objectContaining({
          id: ASSIGNMENT_ID,
          releasedAt: null,
        }),
        expect.objectContaining({
          id: `66666666-6666-4666-8666-666666666666`,
          releasedAt: releasedReleasedAt.toISOString(),
          releasedBy: { id: SUPER_ADMIN_ID, name: null, email: `super@example.com` },
        }),
      ]);
    });

    it(`returns null current and empty history when no rows exist`, async () => {
      const { query, prisma } = buildQuery();
      prisma.$queryRaw.mockResolvedValueOnce([]);

      await expect(query.getAssignmentContextForResource(`fx_conversion`, RESOURCE_ID)).resolves.toEqual({
        current: null,
        history: [],
      });
    });
  });

  describe(`getActiveAssigneesForResource`, () => {
    it(`returns an empty map without hitting prisma for an empty resource list`, async () => {
      const { query, prisma } = buildQuery();

      const result = await query.getActiveAssigneesForResource(`verification`, []);

      expect(result).toEqual(new Map());
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
    });

    it(`maps active assignee rows by resource id`, async () => {
      const { query, prisma } = buildQuery();
      prisma.$queryRaw.mockResolvedValueOnce([
        { resource_id: RESOURCE_ID, assigned_to: OPS_ADMIN_ID, email: `ops@example.com` },
        { resource_id: `66666666-6666-4666-8666-666666666666`, assigned_to: OTHER_ADMIN_ID, email: null },
      ]);

      const result = await query.getActiveAssigneesForResource(`verification`, [
        RESOURCE_ID,
        `66666666-6666-4666-8666-666666666666`,
      ]);

      expect(result).toEqual(
        new Map([
          [RESOURCE_ID, { id: OPS_ADMIN_ID, name: null, email: `ops@example.com` }],
          [`66666666-6666-4666-8666-666666666666`, { id: OTHER_ADMIN_ID, name: null, email: null }],
        ]),
      );
    });
  });
});
