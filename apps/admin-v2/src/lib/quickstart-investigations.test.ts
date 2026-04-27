import { describe, expect, it } from '@jest/globals';

import { type QuickstartCard } from './admin-api.server';
import { filterQuickstartsForWorkspaces } from './quickstart-investigations';

describe(`quickstart investigations`, () => {
  it(`filters quickstarts by both workspace and required capability`, () => {
    const quickstarts: QuickstartCard[] = [
      {
        id: `verification-missing-documents`,
        label: `Verification missing documents`,
        description: `Queue shortcut`,
        eyebrow: `Priority queue`,
        targetPath: `/verification`,
        surfaces: [`shell`],
      },
      {
        id: `system-alerts-console`,
        label: `System alerts console`,
        description: `Manage alerts`,
        eyebrow: `Queue-first`,
        targetPath: `/system/alerts`,
        surfaces: [`shell`],
        requiredCapabilities: [`alerts.manage`],
      },
    ];

    expect(
      filterQuickstartsForWorkspaces(quickstarts, {
        workspaces: [`verification`, `system`],
        capabilities: [`verification.read`],
      }),
    ).toEqual([quickstarts[0]!]);

    expect(
      filterQuickstartsForWorkspaces(quickstarts, {
        workspaces: [`verification`, `system`],
        capabilities: [`verification.read`, `alerts.manage`],
      }),
    ).toEqual(quickstarts);
  });
});
