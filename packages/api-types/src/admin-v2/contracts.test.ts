import {
  ADMIN_V2_ENDPOINTS,
  ADMIN_V2_OPERATIONAL_ALERT_WORKSPACES,
  ADMIN_V2_QUICKSTART_IDS,
  ADMIN_V2_SAVED_VIEW_WORKSPACES,
  adminV2AdminPasswordPatchBodySchema,
  adminV2AssignmentClaimBodySchema,
  adminV2AssignmentReassignBodySchema,
  adminV2AssignmentReleaseBodySchema,
  adminV2LegacyAdminStatusBodySchema,
  adminV2OperationalAlertThresholdSchema,
  adminV2PaymentReversalBodySchema,
  adminV2SavedViewCreateBodySchema,
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
});
