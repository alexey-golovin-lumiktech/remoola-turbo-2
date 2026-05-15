import { NotFoundException } from '@nestjs/common';

import { type AdminV2AdminsActivityQuery } from './admin-v2-admins-activity.query';
import { AdminV2AdminsQueriesService } from './admin-v2-admins-queries.service';
import { type AdminV2AdminsQuery } from './admin-v2-admins.query';

describe(`AdminV2AdminsQueriesService`, () => {
  function buildService() {
    const listAdminsPage = jest.fn(async () => [[], 0] as [Array<any>, number]);
    const listPendingInvitations = jest.fn(async () => [] as Array<any>);
    const findAdminCaseBase = jest.fn(async () => null);
    const listRelatedInvitations = jest.fn(async () => [] as Array<any>);
    const query = {
      listAdminsPage,
      listPendingInvitations,
      findAdminCaseBase,
      listRelatedInvitations,
    };
    const listLastActivitySources = jest.fn(async () => [[], []] as [Array<any>, Array<any>]);
    const listRecentAuditActions = jest.fn(async () => [] as Array<any>);
    const listRecentAuthEvents = jest.fn(async () => [] as Array<any>);
    const activityQuery = {
      listLastActivitySources,
      listRecentAuditActions,
      listRecentAuthEvents,
    };
    const accessService = {
      getAccessProfile: jest.fn(async () => ({
        role: null,
        source: `schema`,
        capabilities: [],
        workspaces: [],
      })),
    };

    return {
      service: new AdminV2AdminsQueriesService(
        query as unknown as AdminV2AdminsQuery,
        activityQuery as unknown as AdminV2AdminsActivityQuery,
        accessService as never,
      ),
      query,
      activityQuery,
      accessService,
    };
  }

  it(`returns an empty last-activity map without touching the activity query`, async () => {
    const { service, activityQuery } = buildService();

    await expect(service.buildLastActivityMap([])).resolves.toEqual(new Map());
    expect(activityQuery.listLastActivitySources).not.toHaveBeenCalled();
  });

  it(`prefers auth activity before admin actions when building last-activity map`, async () => {
    const { service, activityQuery } = buildService();
    activityQuery.listLastActivitySources.mockResolvedValueOnce([
      [
        { identityId: `admin-1`, createdAt: new Date(`2026-04-21T12:00:00.000Z`) },
        { identityId: `admin-3`, createdAt: new Date(`2026-04-21T09:00:00.000Z`) },
      ],
      [
        { adminId: `admin-1`, createdAt: new Date(`2026-04-21T11:00:00.000Z`) },
        { adminId: `admin-2`, createdAt: new Date(`2026-04-21T10:00:00.000Z`) },
      ],
    ]);

    await expect(service.buildLastActivityMap([`admin-1`, `admin-2`, `admin-3`])).resolves.toEqual(
      new Map([
        [`admin-1`, `2026-04-21T12:00:00.000Z`],
        [`admin-2`, `2026-04-21T10:00:00.000Z`],
        [`admin-3`, `2026-04-21T09:00:00.000Z`],
      ]),
    );
  });

  it(`maps listAdmins with normalized filters, access enrichment, and invitation summaries`, async () => {
    const { service, query, activityQuery, accessService } = buildService();
    query.listAdminsPage.mockResolvedValueOnce([
      [
        {
          id: `admin-1`,
          email: `ops@example.com`,
          type: `ADMIN`,
          createdAt: new Date(`2026-04-20T08:00:00.000Z`),
          updatedAt: new Date(`2026-04-21T09:00:00.000Z`),
          deletedAt: null,
          role: { key: `SUPPORT_ADMIN` },
        },
      ],
      1,
    ] as const);
    query.listPendingInvitations.mockResolvedValueOnce([
      {
        id: `inv-1`,
        email: `pending@example.com`,
        expiresAt: new Date(`2099-05-01T00:00:00.000Z`),
        acceptedAt: null,
        createdAt: new Date(`2026-04-21T08:00:00.000Z`),
        role: { key: `OPS_ADMIN` },
        invitedByAdmin: { id: `admin-9`, email: `lead@example.com` },
      },
    ]);
    activityQuery.listLastActivitySources.mockResolvedValueOnce([
      [{ identityId: `admin-1`, createdAt: new Date(`2026-04-21T10:00:00.000Z`) }],
      [],
    ]);
    accessService.getAccessProfile.mockResolvedValueOnce({
      role: `OPS_ADMIN`,
      source: `schema`,
      capabilities: [`admins.read`],
      workspaces: [`admins`],
    });

    await expect(
      service.listAdmins({ page: 0, pageSize: 100, q: ` ops@example.com `, status: `active` }),
    ).resolves.toEqual({
      items: [
        {
          id: `admin-1`,
          email: `ops@example.com`,
          type: `ADMIN`,
          role: `OPS_ADMIN`,
          status: `ACTIVE`,
          lastActivityAt: `2026-04-21T10:00:00.000Z`,
          createdAt: `2026-04-20T08:00:00.000Z`,
          updatedAt: `2026-04-21T09:00:00.000Z`,
          deletedAt: null,
        },
      ],
      pendingInvitations: [
        {
          id: `inv-1`,
          email: `pending@example.com`,
          role: `OPS_ADMIN`,
          status: `pending`,
          expiresAt: `2099-05-01T00:00:00.000Z`,
          createdAt: `2026-04-21T08:00:00.000Z`,
          invitedBy: {
            id: `admin-9`,
            email: `lead@example.com`,
          },
        },
      ],
      total: 1,
      page: 1,
      pageSize: 50,
    });

    expect(query.listAdminsPage).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        OR: [{ email: { contains: `ops@example.com`, mode: `insensitive` } }],
      },
      skip: 0,
      take: 50,
    });
  });

  it(`throws NotFoundException when the admin case base is missing`, async () => {
    const { service } = buildService();

    await expect(service.getAdminCase(`missing-admin`)).rejects.toBeInstanceOf(NotFoundException);
  });

  it(`maps getAdminCase with deleted settings filtered out and permission overrides narrowed`, async () => {
    const { service, query, activityQuery, accessService } = buildService();
    query.findAdminCaseBase.mockResolvedValueOnce({
      id: `admin-1`,
      email: `ops@example.com`,
      type: `ADMIN`,
      createdAt: new Date(`2026-04-01T08:00:00.000Z`),
      updatedAt: new Date(`2026-04-21T09:00:00.000Z`),
      deletedAt: null,
      role: { id: `role-1`, key: `OPS_ADMIN` },
      adminSettings: {
        id: `settings-1`,
        theme: `dark`,
        createdAt: new Date(`2026-04-01T08:30:00.000Z`),
        updatedAt: new Date(`2026-04-02T08:30:00.000Z`),
        deletedAt: new Date(`2026-04-03T08:30:00.000Z`),
      },
      permissionOverrides: [
        { granted: true, permission: { capability: `admins.manage` } },
        { granted: false, permission: { capability: `not-overridable` } },
      ],
      _count: {
        consumerNotes: 3,
        consumerFlags: 1,
      },
    });
    accessService.getAccessProfile.mockResolvedValueOnce({
      role: `OPS_ADMIN`,
      source: `schema`,
      capabilities: [`admins.read`, `admins.manage`],
      workspaces: [`admins`],
    });
    activityQuery.listRecentAuditActions.mockResolvedValueOnce([
      {
        id: `audit-1`,
        action: `admin_update`,
        resource: `admin`,
        resourceId: `admin-1`,
        metadata: { field: `role` },
        admin: { email: `ops@example.com` },
        createdAt: new Date(`2026-04-21T10:00:00.000Z`),
      },
    ]);
    activityQuery.listRecentAuthEvents.mockResolvedValueOnce([
      {
        id: `auth-1`,
        event: `login_success`,
        ipAddress: `203.0.113.5`,
        userAgent: `jest`,
        createdAt: new Date(`2026-04-21T11:00:00.000Z`),
      },
    ]);
    query.listRelatedInvitations.mockResolvedValueOnce([
      {
        id: `inv-1`,
        email: `ops@example.com`,
        role: { key: `OPS_ADMIN` },
        expiresAt: new Date(`2099-05-01T00:00:00.000Z`),
        acceptedAt: new Date(`2026-04-10T00:00:00.000Z`),
        createdAt: new Date(`2026-04-09T00:00:00.000Z`),
      },
    ]);

    await expect(service.getAdminCase(`admin-1`)).resolves.toEqual(
      expect.objectContaining({
        id: `admin-1`,
        core: expect.objectContaining({
          role: `OPS_ADMIN`,
          status: `ACTIVE`,
        }),
        accessProfile: expect.objectContaining({
          source: `schema`,
          resolvedRole: `OPS_ADMIN`,
          schemaRoleKey: `OPS_ADMIN`,
          permissionOverrides: [{ capability: `admins.manage`, granted: true }],
        }),
        settings: null,
        authoredNotesCount: 3,
        authoredFlagsCount: 1,
        recentAuditActions: [
          {
            id: `audit-1`,
            action: `admin_update`,
            resource: `admin`,
            resourceId: `admin-1`,
            metadata: { field: `role` },
            actorEmail: `ops@example.com`,
            createdAt: `2026-04-21T10:00:00.000Z`,
          },
        ],
        recentAuthEvents: [
          {
            id: `auth-1`,
            event: `login_success`,
            ipAddress: `203.0.113.5`,
            userAgent: `jest`,
            createdAt: `2026-04-21T11:00:00.000Z`,
          },
        ],
        invitations: [
          {
            id: `inv-1`,
            email: `ops@example.com`,
            role: `OPS_ADMIN`,
            status: `accepted`,
            expiresAt: `2099-05-01T00:00:00.000Z`,
            acceptedAt: `2026-04-10T00:00:00.000Z`,
            createdAt: `2026-04-09T00:00:00.000Z`,
          },
        ],
        auditShortcuts: {
          adminActionsHref: `/audit/admin-actions?adminId=admin-1`,
          authHref: `/audit/auth?email=ops%40example.com`,
        },
        version: new Date(`2026-04-21T09:00:00.000Z`).getTime(),
        updatedAt: `2026-04-21T09:00:00.000Z`,
        staleWarning: false,
        dataFreshnessClass: `exact`,
      }),
    );
  });
});
