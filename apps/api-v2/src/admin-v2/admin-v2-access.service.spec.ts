import { ForbiddenException } from '@nestjs/common';

import { AdminV2AccessService } from './admin-v2-access.service';

describe(`AdminV2AccessService`, () => {
  const opsBridgeCapabilities = [
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
  ];
  const superBridgeCapabilities = [
    ...opsBridgeCapabilities,
    `admins.read`,
    `exchange.manage`,
    `documents.manage`,
    `payment_methods.manage`,
    `payouts.escalate`,
    `consumers.force_logout`,
    `consumers.suspend`,
    `consumers.email_resend`,
    `verification.decide`,
  ];

  function makeService(
    record: null | {
      roleKey: string | null;
      roleCapabilities: string[];
      permissionOverrides?: Array<{ capability: string; granted: boolean }>;
    },
  ) {
    return new AdminV2AccessService({
      findAdminAccessRecord: jest.fn(async () =>
        record
          ? {
              roleKey: record.roleKey,
              roleCapabilities: record.roleCapabilities,
              permissionOverrides: record.permissionOverrides ?? [],
            }
          : null,
      ),
    } as never);
  }

  it(`uses schema-backed capabilities when role coverage matches the bridge baseline`, async () => {
    const service = makeService({
      roleKey: `OPS_ADMIN`,
      roleCapabilities: [...opsBridgeCapabilities],
    });

    const profile = await service.getAccessProfile({
      id: `admin-ops`,
      email: `ops@example.com`,
      type: `ADMIN`,
    });

    expect(profile.source).toBe(`schema`);
    expect(profile.role).toBe(`OPS_ADMIN`);
    expect(profile.capabilities).toEqual(opsBridgeCapabilities);
  });

  it(`keeps schema-only admins capabilities off the bridge path`, async () => {
    const service = makeService({
      roleKey: `SUPER_ADMIN`,
      roleCapabilities: [...superBridgeCapabilities, `admins.manage`],
    });

    const profile = await service.getAccessProfile({
      id: `admin-super`,
      email: `super@example.com`,
      type: `SUPER`,
    });

    expect(profile.source).toBe(`schema`);
    expect(profile.role).toBe(`SUPER_ADMIN`);
    expect(profile.capabilities).toEqual(expect.arrayContaining([`admins.read`, `admins.manage`]));
    expect(profile.workspaces).toContain(`admins`);
  });

  it(`applies schema-backed permission overrides on top of the assigned role`, async () => {
    const service = makeService({
      roleKey: `SUPER_ADMIN`,
      roleCapabilities: [...superBridgeCapabilities, `admins.manage`],
      permissionOverrides: [
        { capability: `admins.read`, granted: true },
        { capability: `admins.manage`, granted: true },
        { capability: `documents.manage`, granted: false },
      ],
    });

    const profile = await service.getAccessProfile({
      id: `admin-super`,
      email: `super@example.com`,
      type: `SUPER`,
    });

    expect(profile.source).toBe(`schema`);
    expect(profile.capabilities).toEqual(expect.arrayContaining([`admins.read`, `admins.manage`]));
    expect(profile.capabilities).not.toContain(`documents.manage`);
  });

  it(`falls back to the bridge posture when schema rows are not ready`, async () => {
    const service = makeService(null);

    const profile = await service.getAccessProfile({
      id: `admin-super`,
      email: `super@example.com`,
      type: `SUPER`,
    });

    expect(profile.source).toBe(`bridge-fallback`);
    expect(profile.role).toBe(`SUPER_ADMIN`);
    expect(profile.capabilities).toEqual(
      expect.arrayContaining([
        `admins.read`,
        `admins.manage`,
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
  });

  it(`prefers a valid schema role assignment even when it is broader than the bridge identity type`, async () => {
    const service = makeService({
      roleKey: `SUPER_ADMIN`,
      roleCapabilities: [...superBridgeCapabilities, `admins.manage`],
    });

    const profile = await service.getAccessProfile({
      id: `admin-ops`,
      email: `ops@example.com`,
      type: `ADMIN`,
    });

    expect(profile.source).toBe(`schema`);
    expect(profile.role).toBe(`SUPER_ADMIN`);
    expect(profile.capabilities).toEqual(expect.arrayContaining([`admins.read`, `admins.manage`]));
  });

  it(`falls back when schema misses a required bridge capability`, async () => {
    const service = makeService({
      roleKey: `OPS_ADMIN`,
      roleCapabilities: [
        `me.read`,
        `overview.read`,
        `verification.read`,
        `consumers.read`,
        `payments.read`,
        `ledger.read`,
        `ledger.anomalies`,
        `audit.read`,
        `consumers.notes`,
        // missing consumers.flags
      ],
    });

    const profile = await service.getAccessProfile({
      id: `admin-ops`,
      email: `ops@example.com`,
      type: `ADMIN`,
    });

    expect(profile.source).toBe(`bridge-fallback`);
    expect(profile.capabilities).toEqual(opsBridgeCapabilities);
  });

  it(`keeps fallback safety active even when allowed admin overrides exist`, async () => {
    const service = makeService({
      roleKey: `OPS_ADMIN`,
      roleCapabilities: [
        `me.read`,
        `overview.read`,
        `verification.read`,
        `consumers.read`,
        `payments.read`,
        `ledger.read`,
        `audit.read`,
        `consumers.notes`,
        // missing consumers.flags
      ],
      permissionOverrides: [{ capability: `admins.read`, granted: true }],
    });

    const profile = await service.getAccessProfile({
      id: `admin-ops`,
      email: `ops@example.com`,
      type: `ADMIN`,
    });

    expect(profile.source).toBe(`bridge-fallback`);
    expect(profile.capabilities).toEqual(opsBridgeCapabilities);
    expect(profile.capabilities).not.toContain(`admins.read`);
  });

  it(`applies schema-backed overrides across the canonical admin-v2 capability set`, async () => {
    const service = makeService({
      roleKey: `OPS_ADMIN`,
      roleCapabilities: [...opsBridgeCapabilities],
      permissionOverrides: [{ capability: `documents.manage`, granted: true }],
    });

    const profile = await service.getAccessProfile({
      id: `admin-ops`,
      email: `ops@example.com`,
      type: `ADMIN`,
    });

    expect(profile.source).toBe(`schema`);
    expect(profile.capabilities).toEqual(expect.arrayContaining([...opsBridgeCapabilities, `documents.manage`]));
    expect(profile.capabilities).not.toContain(`admins.read`);
  });

  it(`falls back when schema role rows contain duplicated capability values`, async () => {
    const service = makeService({
      roleKey: `OPS_ADMIN`,
      roleCapabilities: [...opsBridgeCapabilities, `audit.read`],
    });

    const profile = await service.getAccessProfile({
      id: `admin-ops`,
      email: `ops@example.com`,
      type: `ADMIN`,
    });

    expect(profile.source).toBe(`bridge-fallback`);
    expect(profile.capabilities).toEqual(opsBridgeCapabilities);
  });

  it(`falls back when schema role rows contain unknown capability values`, async () => {
    const service = makeService({
      roleKey: `SUPER_ADMIN`,
      roleCapabilities: [...superBridgeCapabilities, `not.real.capability`],
    });

    const profile = await service.getAccessProfile({
      id: `admin-super`,
      email: `super@example.com`,
      type: `SUPER`,
    });

    expect(profile.source).toBe(`bridge-fallback`);
    expect(profile.capabilities).toContain(`admins.read`);
    expect(profile.capabilities).not.toContain(`not.real.capability` as never);
  });

  it(`falls back when schema role capabilities are empty`, async () => {
    const service = makeService({
      roleKey: `READONLY_ADMIN`,
      roleCapabilities: [],
    });

    const profile = await service.getAccessProfile({
      id: `admin-readonly`,
      email: `readonly@example.com`,
      type: `ADMIN`,
    });

    expect(profile.source).toBe(`bridge-fallback`);
    expect(profile.capabilities).toEqual(opsBridgeCapabilities);
  });

  it(`falls back when schema role capabilities cannot bootstrap me.read`, async () => {
    const service = makeService({
      roleKey: `SUPPORT_ADMIN`,
      roleCapabilities: [`overview.read`, `consumers.read`, `audit.read`],
    });

    const profile = await service.getAccessProfile({
      id: `admin-support`,
      email: `support@example.com`,
      type: `ADMIN`,
    });

    expect(profile.source).toBe(`bridge-fallback`);
    expect(profile.capabilities).toEqual(opsBridgeCapabilities);
  });

  it(`denies access for identities outside the allowed bridge types`, async () => {
    const service = makeService(null);

    await expect(
      service.assertCapability(
        {
          id: `admin-unknown`,
          email: `unknown@example.com`,
          type: `SUPPORT`,
        },
        `overview.read`,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
