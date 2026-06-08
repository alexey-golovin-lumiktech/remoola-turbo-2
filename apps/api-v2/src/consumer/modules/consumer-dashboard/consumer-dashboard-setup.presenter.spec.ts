import { afterEach, describe, expect, it, jest } from '@jest/globals';

import { buildDashboardSetupActivity, buildDashboardTasks } from './consumer-dashboard-setup.presenter';

describe(`consumer-dashboard-setup presenter`, () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it(`uses current timestamp defaults for pending verification and missing bank details`, () => {
    const now = new Date(`2026-04-03T10:11:12.000Z`);
    jest.useFakeTimers().setSystemTime(now);

    expect(
      buildDashboardSetupActivity(
        {
          consumerResources: [],
          paymentMethods: [],
        },
        {
          status: `not_started`,
          profileComplete: false,
          effectiveVerified: false,
          startedAt: null,
          updatedAt: null,
          verifiedAt: null,
        },
      ),
    ).toStrictEqual([
      {
        id: `kyc_pending`,
        label: `Identity verification pending`,
        createdAt: now.toISOString(),
        kind: `kyc_in_review`,
      },
      {
        id: `bank_pending`,
        label: `Bank details pending`,
        createdAt: now.toISOString(),
        kind: `bank_pending`,
      },
    ]);
  });

  it(`preserves verified activity ordering and current bank-task asymmetry`, () => {
    const verifiedAt = new Date(`2026-04-03T15:00:00.000Z`);
    const w9CreatedAt = new Date(`2026-04-03T14:00:00.000Z`);
    const cardCreatedAt = new Date(`2026-04-03T13:00:00.000Z`);
    const consumer = {
      consumerResources: [
        {
          resource: {
            originalName: `IRS-W-9.pdf`,
            createdAt: w9CreatedAt,
          },
        },
      ],
      paymentMethods: [
        {
          type: `CARD_ONLY`,
          createdAt: cardCreatedAt,
        },
      ],
    };
    const verification = {
      status: `verified`,
      profileComplete: true,
      effectiveVerified: true,
      startedAt: null,
      updatedAt: null,
      verifiedAt: verifiedAt.toISOString(),
    };

    expect(buildDashboardSetupActivity(consumer, verification)).toStrictEqual([
      {
        id: `kyc`,
        label: `Identity verified`,
        createdAt: verifiedAt.toISOString(),
        kind: `kyc_completed`,
      },
      {
        id: `w9`,
        label: `W-9 pack ready`,
        createdAt: w9CreatedAt.toISOString(),
        kind: `w9_ready`,
      },
      {
        id: `bank`,
        label: `Bank account added`,
        createdAt: cardCreatedAt.toISOString(),
        kind: `bank_added`,
      },
    ]);

    expect(buildDashboardTasks(consumer, verification)).toStrictEqual([
      {
        id: `kyc`,
        label: `Complete KYC`,
        completed: true,
      },
      {
        id: `profile`,
        label: `Complete your profile`,
        completed: true,
      },
      {
        id: `w9`,
        label: `Upload W-9 form`,
        completed: true,
      },
      {
        id: `bank`,
        label: `Add bank account`,
        completed: false,
      },
    ]);
  });

  it(`preserves attention-branch ordering and W-9 detection`, () => {
    const consumer = {
      consumerResources: [
        {
          resource: {
            originalName: `forms-w-9-checklist.pdf`,
            createdAt: new Date(`2026-04-04T11:00:00.000Z`),
          },
        },
      ],
      paymentMethods: [
        {
          type: `CARD_ONLY`,
          createdAt: new Date(`2026-04-04T13:00:00.000Z`),
        },
      ],
    };
    const verification = {
      status: `more_info`,
      profileComplete: false,
      effectiveVerified: false,
      startedAt: null,
      updatedAt: `2026-04-04T12:00:00.000Z`,
      verifiedAt: null,
    };

    expect(buildDashboardSetupActivity(consumer, verification)).toStrictEqual([
      {
        id: `bank`,
        label: `Bank account added`,
        createdAt: `2026-04-04T13:00:00.000Z`,
        kind: `bank_added`,
      },
      {
        id: `kyc_attention`,
        label: `Verification needs attention`,
        createdAt: `2026-04-04T12:00:00.000Z`,
        kind: `kyc_requires_input`,
      },
      {
        id: `w9`,
        label: `W-9 pack ready`,
        createdAt: `2026-04-04T11:00:00.000Z`,
        kind: `w9_ready`,
      },
    ]);
  });
});
