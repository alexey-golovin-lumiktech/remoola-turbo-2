import { getAdminV2AccessProfile } from './admin-v2-access';

describe(`AdminV2Access`, () => {
  it(`grants read-only MVP-1c capabilities to OPS admins`, () => {
    const profile = getAdminV2AccessProfile({ type: `ADMIN` });

    expect(profile.role).toBe(`OPS_ADMIN`);
    expect(profile.capabilities).toEqual(
      expect.arrayContaining([
        `overview.read`,
        `verification.read`,
        `consumers.read`,
        `payments.read`,
        `ledger.read`,
        `audit.read`,
      ]),
    );
    expect(profile.capabilities).not.toContain(`verification.decide`);
    expect(profile.capabilities).not.toContain(`consumers.force_logout`);
    expect(profile.workspaces).toEqual(
      expect.arrayContaining([`overview`, `verification`, `consumers`, `payments`, `ledger`, `audit`]),
    );
  });

  it(`grants dangerous MVP-1b capabilities only to SUPER admins`, () => {
    const profile = getAdminV2AccessProfile({ type: `SUPER` });

    expect(profile.role).toBe(`SUPER_ADMIN`);
    expect(profile.capabilities).toEqual(expect.arrayContaining([`verification.decide`, `consumers.force_logout`]));
  });
});
