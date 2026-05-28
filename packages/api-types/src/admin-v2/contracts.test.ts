import { describe, expect, it } from '@jest/globals';

import {
  ADMIN_V2_DEFAULT_AUTH_REFRESH_REUSE_WINDOW_MINUTES,
  ADMIN_V2_MAX_AUTH_REFRESH_REUSE_WINDOW_MINUTES,
  ADMIN_V2_MIN_AUTH_REFRESH_REUSE_WINDOW_MINUTES,
  ADMIN_V2_ENDPOINTS,
  ADMIN_V2_OPERATIONAL_ALERT_WORKSPACES,
  ADMIN_V2_QUICKSTART_IDS,
  ADMIN_V2_SAVED_VIEW_WORKSPACES,
  adminV2AdminIdentitySchema,
  adminV2AdminPasswordPatchBodySchema,
  adminV2AdminsListQuerySchema,
  adminV2AdminsListResponseSchema,
  adminV2ApproveRateBodySchema,
  adminV2AuthRefreshReuseAlertQueryPayloadSchema,
  adminV2ChangeAdminPermissionsBodySchema,
  adminV2ChangeAdminRoleBodySchema,
  adminV2AssignmentClaimBodySchema,
  adminV2AssignmentReassignBodySchema,
  adminV2AssignmentReleaseBodySchema,
  adminV2ConsumerCaseResponseSchema,
  adminV2ConsumersListResponseSchema,
  adminV2DeactivateAdminBodySchema,
  adminV2InviteAdminBodySchema,
  adminV2ListAdminSessionsResponseSchema,
  adminV2LegacyAdminStatusBodySchema,
  adminV2OperationalAlertThresholdSchema,
  adminV2OverviewSummaryResponseSchema,
  adminV2PaymentReversalBodySchema,
  adminV2QuickstartsListResponseSchema,
  adminV2SavedViewCreateBodySchema,
  adminV2VerificationQueuePayloadSchema,
  adminV2VerificationQueueQuerySchema,
  adminV2VerificationQueueResponseSchema,
} from '.';

describe(`admin-v2 shared contracts`, () => {
  it(`keeps core endpoint inventory entries available`, () => {
    expect(ADMIN_V2_ENDPOINTS.me).toMatchObject({
      method: `GET`,
      path: `/admin-v2/me`,
      response: `AdminV2AdminIdentity`,
    });
    expect(ADMIN_V2_ENDPOINTS.paymentsRefund).toMatchObject({
      method: `POST`,
      path: `/admin-v2/payments/:id/refund`,
      body: `AdminV2PaymentReversalBody`,
    });
    expect(ADMIN_V2_ENDPOINTS.operationalAlertsCreate).toMatchObject({
      method: `POST`,
      path: `/admin-v2/operational-alerts`,
      body: `AdminV2OperationalAlertCreateBody`,
    });
  });

  it(`validates shared saved-view and alert payload primitives`, () => {
    expect(ADMIN_V2_QUICKSTART_IDS).toContain(`ledger-anomalies-triage`);
    expect(ADMIN_V2_SAVED_VIEW_WORKSPACES).toEqual([`ledger_anomalies`, `verification_queue`]);
    expect(ADMIN_V2_OPERATIONAL_ALERT_WORKSPACES).toContain(`auth_refresh_reuse`);

    expect(() =>
      adminV2SavedViewCreateBodySchema.parse({
        workspace: `ledger_anomalies`,
        name: `Ledger review`,
        queryPayload: { class: `stalePendingEntries` },
      }),
    ).not.toThrow();
    expect(() => adminV2OperationalAlertThresholdSchema.parse({ type: `count_gt`, value: 1 })).not.toThrow();
  });

  it(`keeps shared verification queue and auth refresh payload contracts strict`, () => {
    expect(
      adminV2VerificationQueuePayloadSchema.safeParse({
        status: `pending`,
        stripeIdentityStatus: `requires_input`,
        missingDocuments: true,
      }).success,
    ).toBe(true);
    expect(
      adminV2VerificationQueuePayloadSchema.safeParse({
        status: `pending`,
        extra: `nope`,
      }).success,
    ).toBe(false);

    expect(
      adminV2AuthRefreshReuseAlertQueryPayloadSchema.safeParse({
        windowMinutes: ADMIN_V2_DEFAULT_AUTH_REFRESH_REUSE_WINDOW_MINUTES,
      }).success,
    ).toBe(true);
    expect(
      adminV2AuthRefreshReuseAlertQueryPayloadSchema.safeParse({
        windowMinutes: ADMIN_V2_MIN_AUTH_REFRESH_REUSE_WINDOW_MINUTES - 1,
      }).success,
    ).toBe(false);
    expect(
      adminV2AuthRefreshReuseAlertQueryPayloadSchema.safeParse({
        windowMinutes: ADMIN_V2_MAX_AUTH_REFRESH_REUSE_WINDOW_MINUTES + 1,
      }).success,
    ).toBe(false);
  });

  it(`runtime-validates normalized admin-v2 query objects`, () => {
    expect(
      adminV2AdminsListQuerySchema.safeParse({
        page: 2,
        q: `ops@example.com`,
        status: `active`,
      }).success,
    ).toBe(true);
    expect(
      adminV2AdminsListQuerySchema.safeParse({
        page: 0,
        q: `ops@example.com`,
      }).success,
    ).toBe(false);

    expect(
      adminV2VerificationQueueQuerySchema.safeParse({
        page: 3,
        status: `pending`,
        missingProfileData: true,
      }).success,
    ).toBe(true);
    expect(
      adminV2VerificationQueueQuerySchema.safeParse({
        page: 1,
        missingProfileData: `true`,
      }).success,
    ).toBe(false);
  });

  it(`keeps sensitive admin mutation bodies aligned with backend DTO field names`, () => {
    expect(
      adminV2PaymentReversalBodySchema.safeParse({
        amount: 25,
        reason: `Customer refund`,
        passwordConfirmation: `Current1!@#abc`,
      }).success,
    ).toBe(true);
    expect(
      adminV2PaymentReversalBodySchema.safeParse({
        amount: 25,
        reason: `Customer refund`,
        idempotencyKey: `refund-key`,
      }).success,
    ).toBe(false);

    expect(
      adminV2AdminPasswordPatchBodySchema.safeParse({
        password: `NewValid1!@#abc`,
        passwordConfirmation: `Current1!@#abc`,
      }).success,
    ).toBe(true);
    expect(
      adminV2AdminPasswordPatchBodySchema.safeParse({
        password: `NewValid1!@#abc`,
        stepUpToken: `legacy-step-up-token`,
      }).success,
    ).toBe(false);

    expect(
      adminV2LegacyAdminStatusBodySchema.safeParse({
        action: `delete`,
        passwordConfirmation: `Current1!@#abc`,
      }).success,
    ).toBe(true);
    expect(
      adminV2LegacyAdminStatusBodySchema.safeParse({
        action: `delete`,
        reason: `legacy reason field`,
      }).success,
    ).toBe(false);

    expect(
      adminV2InviteAdminBodySchema.safeParse({
        email: `new-admin@example.com`,
        roleKey: `OPS_ADMIN`,
        passwordConfirmation: `Current1!@#abc`,
      }).success,
    ).toBe(true);
    expect(
      adminV2InviteAdminBodySchema.safeParse({
        email: `new-admin@example.com`,
        roleKey: `OPS_ADMIN`,
      }).success,
    ).toBe(false);

    expect(
      adminV2DeactivateAdminBodySchema.safeParse({
        version: 1,
        confirmed: true,
        reason: `audit trail reason`,
        passwordConfirmation: `Current1!@#abc`,
      }).success,
    ).toBe(true);
    expect(
      adminV2ChangeAdminRoleBodySchema.safeParse({
        version: 1,
        confirmed: true,
        roleKey: `RISK_ADMIN`,
        passwordConfirmation: `Current1!@#abc`,
      }).success,
    ).toBe(true);
    expect(
      adminV2ChangeAdminPermissionsBodySchema.safeParse({
        version: 1,
        capabilityOverrides: [{ capability: `admins.manage`, mode: `grant` }],
        passwordConfirmation: `Current1!@#abc`,
      }).success,
    ).toBe(true);
    expect(
      adminV2ApproveRateBodySchema.safeParse({
        version: 1,
        confirmed: true,
        reason: `Fresh provider sample`,
        passwordConfirmation: `Current1!@#abc`,
      }).success,
    ).toBe(true);
    expect(
      adminV2ApproveRateBodySchema.safeParse({
        version: 1,
        confirmed: true,
        reason: `Fresh provider sample`,
      }).success,
    ).toBe(false);
  });

  it(`keeps assignment mutation bodies aligned with backend expectedReleasedAtNull`, () => {
    const ASSIGNMENT_ID = `11111111-1111-4111-8111-111111111111`;
    const ASSIGNEE_ID = `22222222-2222-4222-8222-222222222222`;

    expect(
      adminV2AssignmentClaimBodySchema.safeParse({
        resourceType: `verification`,
        resourceId: ASSIGNMENT_ID,
        reason: `triage`,
      }).success,
    ).toBe(true);

    expect(
      adminV2AssignmentReleaseBodySchema.safeParse({
        assignmentId: ASSIGNMENT_ID,
        expectedReleasedAtNull: 0,
      }).success,
    ).toBe(true);

    expect(
      adminV2AssignmentReleaseBodySchema.safeParse({
        assignmentId: ASSIGNMENT_ID,
        expectedDeletedAtNull: 0,
      }).success,
    ).toBe(false);

    expect(
      adminV2AssignmentReassignBodySchema.safeParse({
        assignmentId: ASSIGNMENT_ID,
        newAssigneeId: ASSIGNEE_ID,
        confirmed: true,
        reason: `Re-route to ops triage`,
        expectedReleasedAtNull: 0,
      }).success,
    ).toBe(true);

    expect(
      adminV2AssignmentReassignBodySchema.safeParse({
        assignmentId: ASSIGNMENT_ID,
        newAssigneeId: ASSIGNEE_ID,
        confirmed: true,
        reason: `Re-route to ops triage`,
        expectedDeletedAtNull: 0,
      }).success,
    ).toBe(false);

    expect(
      adminV2AssignmentReleaseBodySchema.safeParse({
        assignmentId: ASSIGNMENT_ID,
        expectedReleasedAtNull: 1,
      }).success,
    ).toBe(false);
  });

  it(`runtime-validates representative admin-v2 read contracts`, () => {
    const schemaCases = [
      {
        name: `admin identity`,
        schema: adminV2AdminIdentitySchema,
        valid: {
          id: `admin-1`,
          email: `ops@example.com`,
          type: `ADMIN`,
          role: `OPS_ADMIN`,
          source: `schema`,
          bootstrapReason: null,
          phase: `MVP-3`,
          accessMode: `schema-active`,
          featureMaturity: `selective-operator-platform`,
          capabilities: [`overview.read`],
          workspaces: [`overview`],
        },
        invalid: {
          id: 1,
          email: `ops@example.com`,
          type: `ADMIN`,
          role: `OPS_ADMIN`,
          phase: `MVP-3`,
          capabilities: [`overview.read`],
          workspaces: [`overview`],
        },
      },
      {
        name: `overview summary`,
        schema: adminV2OverviewSummaryResponseSchema,
        valid: {
          computedAt: `2026-04-27T09:00:00.000Z`,
          signals: {
            pendingVerifications: {
              label: `Pending verifications`,
              count: 4,
              phaseStatus: `live-actionable`,
              availability: `available`,
              href: `/verification`,
              slaBreachedCount: 0,
            },
          },
        },
        invalid: {
          computedAt: `2026-04-27T09:00:00.000Z`,
          signals: {
            pendingVerifications: {
              label: `Pending verifications`,
              count: `4`,
              phaseStatus: `live-actionable`,
              availability: `available`,
              href: `/verification`,
            },
          },
        },
      },
      {
        name: `quickstarts list`,
        schema: adminV2QuickstartsListResponseSchema,
        valid: {
          items: [
            {
              id: `verification-missing-documents`,
              label: `Verification missing documents`,
              description: `Focus the verification queue on cases blocked by missing consumer documents.`,
              eyebrow: `Priority queue`,
              operatorModel: `saved-view-compatible`,
              targetPath: `/verification`,
              surfaces: [`shell`, `overview`],
            },
          ],
        },
        invalid: {
          items: [
            {
              id: `verification-missing-documents`,
              label: `Verification missing documents`,
              description: `Focus the verification queue on cases blocked by missing consumer documents.`,
              eyebrow: `Priority queue`,
              operatorModel: `saved-view-compatible`,
              targetPath: `/verification`,
              surfaces: [`mobile`],
            },
          ],
        },
      },
      {
        name: `consumers list`,
        schema: adminV2ConsumersListResponseSchema,
        valid: {
          items: [
            {
              id: `consumer-1`,
              email: `consumer@example.com`,
              accountType: `PERSONAL`,
              contractorKind: null,
              verificationStatus: `PENDING`,
              stripeIdentityStatus: null,
              createdAt: `2026-04-20T08:00:00.000Z`,
              updatedAt: `2026-04-20T10:00:00.000Z`,
              deletedAt: null,
              displayName: null,
              adminFlags: [{ id: `flag-1`, flag: `needs_review` }],
              _count: { adminNotes: 1, adminFlags: 1 },
              summary: { notesCount: 1, activeFlagsCount: 1, deleted: false },
            },
          ],
          total: 1,
          page: 1,
          pageSize: 20,
        },
        invalid: {
          items: [],
          total: `1`,
          page: 1,
          pageSize: 20,
        },
      },
      {
        name: `consumer case`,
        schema: adminV2ConsumerCaseResponseSchema,
        valid: {
          id: `consumer-1`,
          email: `consumer@example.com`,
          accountType: `PERSONAL`,
          verificationStatus: `PENDING`,
          contractorKind: null,
          verified: false,
          legalVerified: false,
          verificationReason: null,
          verificationUpdatedAt: `2026-04-20T10:00:00.000Z`,
          stripeIdentityStatus: null,
          stripeIdentityLastErrorCode: null,
          stripeIdentityLastErrorReason: null,
          stripeIdentityStartedAt: null,
          stripeIdentityUpdatedAt: null,
          stripeIdentityVerifiedAt: null,
          suspendedAt: null,
          suspendedBy: null,
          suspensionReason: null,
          createdAt: `2026-04-20T08:00:00.000Z`,
          updatedAt: `2026-04-20T10:00:00.000Z`,
          deletedAt: null,
          personalDetails: null,
          organizationDetails: null,
          addressDetails: null,
          googleProfileDetails: null,
          contacts: [],
          paymentMethods: [],
          recentPaymentRequests: [],
          ledgerSummary: {},
          consumerResources: [],
          adminNotes: [],
          adminFlags: [],
          _count: {
            contacts: 0,
            paymentMethods: 0,
            asPayerPaymentRequests: 0,
            asRequesterPaymentRequests: 0,
            ledgerEntries: 0,
            consumerResources: 0,
            adminNotes: 0,
            adminFlags: 0,
          },
          recentAuthEvents: [],
          recentAdminActions: [],
          recentConsumerActions: [],
        },
        invalid: {
          id: `consumer-1`,
          email: `consumer@example.com`,
          accountType: `PERSONAL`,
        },
      },
      {
        name: `verification queue`,
        schema: adminV2VerificationQueueResponseSchema,
        valid: {
          items: [],
          total: 0,
          page: 1,
          pageSize: 20,
          activeStatuses: [],
          sla: { breachedCount: 0, thresholdHours: 24, lastComputedAt: null },
        },
        invalid: {
          items: [],
          total: 0,
          page: 1,
          pageSize: 20,
          activeStatuses: [],
          sla: { breachedCount: 0, thresholdHours: `24`, lastComputedAt: null },
        },
      },
      {
        name: `admins list`,
        schema: adminV2AdminsListResponseSchema,
        valid: {
          items: [
            {
              id: `admin-1`,
              email: `ops@example.com`,
              type: `ADMIN`,
              role: `OPS_ADMIN`,
              status: `ACTIVE`,
              lastActivityAt: null,
              createdAt: `2026-04-20T08:00:00.000Z`,
              updatedAt: `2026-04-20T10:00:00.000Z`,
              deletedAt: null,
            },
          ],
          pendingInvitations: [
            {
              id: `invite-1`,
              email: `new-admin@example.com`,
              role: `OPS_ADMIN`,
              status: `pending`,
              expiresAt: `2026-04-30T10:00:00.000Z`,
              createdAt: `2026-04-20T10:00:00.000Z`,
              invitedBy: { id: `admin-1`, email: `ops@example.com` },
            },
          ],
          total: 1,
          page: 1,
          pageSize: 20,
        },
        invalid: {
          items: [{ id: `admin-1` }],
          pendingInvitations: [],
          total: 1,
          page: 1,
          pageSize: 20,
        },
      },
      {
        name: `admin sessions`,
        schema: adminV2ListAdminSessionsResponseSchema,
        valid: {
          sessions: [
            {
              id: `session-1`,
              sessionFamilyId: `family-1`,
              createdAt: `2026-04-20T08:00:00.000Z`,
              lastUsedAt: `2026-04-20T10:00:00.000Z`,
              expiresAt: `2026-04-21T10:00:00.000Z`,
              revokedAt: null,
              invalidatedReason: null,
              replacedById: null,
              current: true,
            },
          ],
        },
        invalid: {
          sessions: [
            {
              id: `session-1`,
              sessionFamilyId: `family-1`,
              createdAt: `2026-04-20T08:00:00.000Z`,
              lastUsedAt: `2026-04-20T10:00:00.000Z`,
              expiresAt: `2026-04-21T10:00:00.000Z`,
              revokedAt: null,
              invalidatedReason: `not-real`,
              replacedById: null,
            },
          ],
        },
      },
    ] as const;

    for (const testCase of schemaCases) {
      const validResult = testCase.schema.safeParse(testCase.valid);
      if (!validResult.success) {
        throw new Error(`${testCase.name} valid fixture failed: ${validResult.error.message}`);
      }

      const invalidResult = testCase.schema.safeParse(testCase.invalid);
      expect(invalidResult.success).toBe(false);
    }
  });
});
