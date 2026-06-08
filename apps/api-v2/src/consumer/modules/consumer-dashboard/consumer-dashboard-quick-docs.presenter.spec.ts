import { describe, expect, it } from '@jest/globals';

import { mapDashboardQuickDocs } from './consumer-dashboard-quick-docs.presenter';

describe(`consumer-dashboard-quick-docs presenter`, () => {
  it(`preserves source order, maps current fields, and falls back to an empty createdAt`, () => {
    const quickDocs = mapDashboardQuickDocs([
      {
        resource: {
          id: `doc-2`,
          originalName: `Later.pdf`,
          createdAt: null,
        },
      },
      {
        resource: {
          id: `doc-1`,
          originalName: `Earlier.pdf`,
          createdAt: new Date(`2026-04-02T10:00:00.000Z`),
        },
      },
    ]);

    expect(quickDocs).toStrictEqual([
      {
        id: `doc-2`,
        name: `Later.pdf`,
        createdAt: ``,
      },
      {
        id: `doc-1`,
        name: `Earlier.pdf`,
        createdAt: `2026-04-02T10:00:00.000Z`,
      },
    ]);
  });
});
