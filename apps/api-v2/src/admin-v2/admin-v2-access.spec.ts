import { applyAdminV2PermissionOverrides, getAdminV2AccessProfile } from './admin-v2-access';

describe(`AdminV2Access`, () => {
  it(`keeps the exchange-read bridge posture for OPS admins without widening adjacent writes`, () => {
    const profile = getAdminV2AccessProfile({ type: `ADMIN` });

    expect(profile.role).toBe(`OPS_ADMIN`);
    expect(profile.source).toBe(`bridge`);
    expect(profile.capabilities).toEqual([
      `me.read`,
      `overview.read`,
      `verification.read`,
      `consumers.read`,
      `payments.read`,
      `ledger.read`,
      `ledger.anomalies`,
      `exchange.read`,
      `documents.read`,
      `payment_methods.read`,
      `system.read`,
      `consumers.notes`,
      `consumers.flags`,
      `audit.read`,
      `assignments.manage`,
      `saved_views.manage`,
      `alerts.manage`,
    ]);
    expect(profile.capabilities).not.toContain(`verification.decide`);
    expect(profile.capabilities).not.toContain(`consumers.force_logout`);
    expect(profile.capabilities).not.toContain(`admins.read`);
    expect(profile.capabilities).not.toContain(`admins.manage`);
    expect(profile.capabilities.map(String)).not.toContain(`payment_methods.manage`);
    expect(profile.workspaces).toEqual([
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
    ]);
  });

  it(`keeps dangerous active capabilities on the SUPER bridge baseline`, () => {
    const profile = getAdminV2AccessProfile({ type: `SUPER` });

    expect(profile.role).toBe(`SUPER_ADMIN`);
    expect(profile.source).toBe(`bridge`);
    expect(profile.capabilities).toEqual(
      expect.arrayContaining([
        `admins.read`,
        `verification.decide`,
        `exchange.manage`,
        `documents.manage`,
        `payment_methods.manage`,
        `payouts.escalate`,
        `consumers.force_logout`,
        `consumers.suspend`,
        `consumers.email_resend`,
      ]),
    );
    expect(profile.capabilities).toContain(`admins.manage`);
    expect(profile.workspaces).toContain(`admins`);
  });

  it(`applies explicit schema overrides on top of the bridge baseline`, () => {
    const capabilities = applyAdminV2PermissionOverrides(
      [
        `me.read`,
        `overview.read`,
        `verification.read`,
        `consumers.read`,
        `payments.read`,
        `ledger.read`,
        `ledger.anomalies`,
        `exchange.read`,
        `documents.read`,
        `payment_methods.read`,
        `system.read`,
        `consumers.notes`,
        `consumers.flags`,
        `audit.read`,
      ],
      [
        { capability: `admins.read`, granted: true },
        { capability: `documents.manage`, granted: true },
      ],
    );

    expect(capabilities).toContain(`admins.read`);
    expect(capabilities).toContain(`documents.manage`);
  });
});
