import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type * as AdminApi from '../../../../lib/admin-api.server';

jest.mock(`next/link`, () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement(`a`, { href, ...props }, children),
}));

jest.mock(`../../../../lib/admin-api.server`, () => ({
  getAdminIdentity: jest.fn(),
  getOperationalAlerts: jest.fn(),
}));

jest.mock(`../../../../lib/admin-mutations.server`, () => ({
  createOperationalAlertAction: jest.fn(),
  updateOperationalAlertAction: Object.assign(jest.fn(), {
    bind: () => () => Promise.resolve(),
  }),
  deleteOperationalAlertAction: Object.assign(jest.fn(), {
    bind: () => () => Promise.resolve(),
  }),
}));

const { getAdminIdentity: mockedGetAdminIdentity, getOperationalAlerts: mockedGetOperationalAlerts } = jest.requireMock(
  `../../../../lib/admin-api.server`,
) as jest.Mocked<typeof AdminApi>;

async function loadSubject() {
  return (await import(`./page`)).default;
}

let OperationalAlertsPage: Awaited<ReturnType<typeof loadSubject>>;

const ALERT_TEMPLATE = {
  workspace: `ledger_anomalies` as const,
  description: null,
  queryPayload: { class: `stalePendingEntries`, dateFrom: `2026-04-01`, dateTo: `2026-04-30` },
  thresholdPayload: { type: `count_gt` as const, value: 5 },
  evaluationIntervalMinutes: 5,
  createdAt: `2026-04-21T10:00:00.000Z`,
  updatedAt: `2026-04-21T10:00:00.000Z`,
};

describe(`admin-v2 operational alerts page`, () => {
  beforeAll(async () => {
    OperationalAlertsPage = await loadSubject();
  });

  beforeEach(() => {
    mockedGetAdminIdentity.mockReset();
    mockedGetOperationalAlerts.mockReset();
    mockedGetAdminIdentity.mockResolvedValue({
      id: `admin-1`,
      email: `ops@example.com`,
      role: `OPS_ADMIN`,
      type: `ADMIN`,
      phase: `MVP-3`,
      capabilities: [`alerts.manage`],
      workspaces: [`system`],
    } as never);
  });

  it(`parses auth refresh reuse payloads and still loads all supported workspaces`, async () => {
    mockedGetOperationalAlerts.mockImplementation(async ({ workspace }) => {
      if (workspace === `auth_refresh_reuse`) {
        return {
          alerts: [
            {
              ...ALERT_TEMPLATE,
              workspace: `auth_refresh_reuse`,
              id: `alert-arr`,
              name: `Refresh reuse spike`,
              description: `Watch for refresh-token reuse`,
              queryPayload: { windowMinutes: 30 },
              thresholdPayload: { type: `count_gt`, value: 2 },
              lastEvaluatedAt: new Date().toISOString(),
              lastEvaluationError: null,
              lastFiredAt: null,
              lastFireReason: null,
            },
          ],
        };
      }
      return { alerts: [] };
    });

    const markup = renderToStaticMarkup(await OperationalAlertsPage());

    expect(markup).toContain(`Window: 30m`);
    expect(markup).toContain(`Threshold: count &gt; 2 - every 5 min`);
    expect(mockedGetOperationalAlerts).toHaveBeenCalledWith({ workspace: `ledger_anomalies` });
    expect(mockedGetOperationalAlerts).toHaveBeenCalledWith({ workspace: `verification_queue` });
    expect(mockedGetOperationalAlerts).toHaveBeenCalledWith({ workspace: `auth_refresh_reuse` });
  });

  it(`summarizes filtered and total verification queue alert payloads`, async () => {
    mockedGetOperationalAlerts.mockImplementation(async ({ workspace }) => {
      if (workspace === `verification_queue`) {
        return {
          alerts: [
            {
              ...ALERT_TEMPLATE,
              workspace: `verification_queue`,
              id: `alert-vq-filtered`,
              name: `Pending US backlog`,
              description: `Watch pending verifications from US`,
              queryPayload: { status: `pending`, country: `US`, missingDocuments: true },
              thresholdPayload: { type: `count_gt`, value: 25 },
              lastEvaluatedAt: new Date().toISOString(),
              lastEvaluationError: null,
              lastFiredAt: null,
              lastFireReason: null,
            },
            {
              ...ALERT_TEMPLATE,
              workspace: `verification_queue`,
              id: `alert-vq-total`,
              name: `Total queue size`,
              description: null,
              queryPayload: {},
              thresholdPayload: { type: `count_gt`, value: 100 },
              lastEvaluatedAt: new Date().toISOString(),
              lastEvaluationError: null,
              lastFiredAt: null,
              lastFireReason: null,
            },
          ],
        };
      }
      return { alerts: [] };
    });

    const markup = renderToStaticMarkup(await OperationalAlertsPage());

    expect(markup).toContain(`Filters: status=pending, country=US, missingDocuments=true`);
    expect(markup).toContain(`Filters: (none — total queue)`);
    expect(markup).toContain(`Threshold: count &gt; 25 - every 5 min`);
    expect(markup).toContain(`Threshold: count &gt; 100 - every 5 min`);
    expect(mockedGetOperationalAlerts).toHaveBeenCalledWith({ workspace: `ledger_anomalies` });
    expect(mockedGetOperationalAlerts).toHaveBeenCalledWith({ workspace: `verification_queue` });
    expect(mockedGetOperationalAlerts).toHaveBeenCalledWith({ workspace: `auth_refresh_reuse` });
  });

  it(`shows the backend-unavailable fallback when a workspace response is null`, async () => {
    mockedGetOperationalAlerts.mockResolvedValue(null);

    const markup = renderToStaticMarkup(await OperationalAlertsPage());

    expect(mockedGetOperationalAlerts).toHaveBeenCalledTimes(3);
    expect(markup).toContain(`Operational alerts list is temporarily unavailable`);
  });

  it(`marks alerts as fired when lastFiredAt is still inside the active window`, async () => {
    const now = new Date();
    const recent = new Date(now.getTime() - 60_000).toISOString();
    mockedGetOperationalAlerts.mockResolvedValue({
      alerts: [
        {
          ...ALERT_TEMPLATE,
          id: `alert-1`,
          name: `Recently fired alert`,
          lastEvaluatedAt: now.toISOString(),
          lastEvaluationError: null,
          lastFiredAt: recent,
          lastFireReason: `count=8 exceeded threshold=5 (count_gt)`,
        },
      ],
    });

    const markup = renderToStaticMarkup(await OperationalAlertsPage());

    expect(markup).toContain(`FIRED`);
    expect(markup).toContain(`count=8 exceeded threshold=5`);
  });

  it(`renders fire history instead of the active badge outside the firing window`, async () => {
    const old = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    mockedGetOperationalAlerts.mockResolvedValue({
      alerts: [
        {
          ...ALERT_TEMPLATE,
          id: `alert-old`,
          name: `Old fired alert`,
          lastEvaluatedAt: new Date().toISOString(),
          lastEvaluationError: null,
          lastFiredAt: old,
          lastFireReason: `count=10 exceeded threshold=5 (count_gt)`,
        },
      ],
    });

    const markup = renderToStaticMarkup(await OperationalAlertsPage());

    expect(markup).toContain(`Last fired:`);
    expect(markup).not.toContain(`>FIRED<`);
  });

  it(`surfaces evaluation errors without losing the non-firing state`, async () => {
    mockedGetOperationalAlerts.mockResolvedValue({
      alerts: [
        {
          ...ALERT_TEMPLATE,
          id: `alert-err`,
          name: `Errored alert`,
          lastEvaluatedAt: new Date().toISOString(),
          lastEvaluationError: `Anomaly query timed out after 10000ms`,
          lastFiredAt: null,
          lastFireReason: null,
        },
      ],
    });

    const markup = renderToStaticMarkup(await OperationalAlertsPage());

    expect(markup).toContain(`Evaluation error`);
    expect(markup).toContain(`Anomaly query timed out`);
    expect(markup).toContain(`Never fired`);
  });

  it(`renders access denied before loading alert workspaces when alerts.manage is missing`, async () => {
    mockedGetAdminIdentity.mockResolvedValueOnce({
      id: `admin-2`,
      email: `readonly@example.com`,
      role: `OPS_ADMIN`,
      type: `ADMIN`,
      phase: `MVP-3`,
      capabilities: [`overview.read`],
      workspaces: [`overview`],
    } as never);

    const markup = renderToStaticMarkup(await OperationalAlertsPage());

    expect(mockedGetOperationalAlerts).not.toHaveBeenCalled();
    expect(markup).toContain(`Operational alerts unavailable`);
    expect(markup).toContain(`cannot manage operational alerts`);
  });
});
