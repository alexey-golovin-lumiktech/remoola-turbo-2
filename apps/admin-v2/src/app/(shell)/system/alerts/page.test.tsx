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

const { getOperationalAlerts: mockedGetOperationalAlerts } = jest.requireMock(
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
    mockedGetOperationalAlerts.mockReset();
  });

  it(`renders empty state for both workspaces when there are no alerts`, async () => {
    mockedGetOperationalAlerts.mockResolvedValue({ alerts: [] });

    const markup = renderToStaticMarkup(await OperationalAlertsPage());

    expect(markup).toContain(`Operational alerts`);
    expect(markup).toContain(`Ledger anomalies alerts`);
    expect(markup).toContain(`Auth refresh reuse alerts`);
    expect(markup).toContain(`No alerts yet for this workspace`);
    expect(markup).toContain(`New ledger anomalies alert`);
    expect(markup).toContain(`New auth refresh reuse alert`);
    expect(markup).toContain(`value="ledger_anomalies"`);
    expect(markup).toContain(`value="auth_refresh_reuse"`);
  });

  it(`renders auth_refresh_reuse alert with windowMinutes payload summary`, async () => {
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

    expect(markup).toContain(`Refresh reuse spike`);
    expect(markup).toContain(`Window: 30m`);
    expect(markup).toContain(`count &gt; 2`);
    expect(mockedGetOperationalAlerts).toHaveBeenCalledWith({ workspace: `ledger_anomalies` });
    expect(mockedGetOperationalAlerts).toHaveBeenCalledWith({ workspace: `auth_refresh_reuse` });
  });

  it(`renders backend-unavailable fallback when getOperationalAlerts returns null`, async () => {
    mockedGetOperationalAlerts.mockResolvedValue(null);

    const markup = renderToStaticMarkup(await OperationalAlertsPage());

    expect(markup).toContain(`Operational alerts list is temporarily unavailable`);
  });

  it(`renders fired badge for alert fired within 2x interval window`, async () => {
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

    expect(markup).toContain(`Recently fired alert`);
    expect(markup).toContain(`FIRED`);
    expect(markup).toContain(`count=8 exceeded threshold=5`);
  });

  it(`renders 'Last fired' history label for an alert fired well outside the active window`, async () => {
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

    expect(markup).toContain(`Old fired alert`);
    expect(markup).toContain(`Last fired:`);
    expect(markup).not.toContain(`>FIRED<`);
  });

  it(`renders evaluation error badge with truncated tooltip when last_evaluation_error is set`, async () => {
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

    expect(markup).toContain(`Errored alert`);
    expect(markup).toContain(`Evaluation error`);
    expect(markup).toContain(`Anomaly query timed out`);
    expect(markup).toContain(`Never fired`);
  });

  it(`renders threshold and interval summary plus inline rename/threshold form for each alert`, async () => {
    mockedGetOperationalAlerts.mockResolvedValue({
      alerts: [
        {
          ...ALERT_TEMPLATE,
          id: `alert-normal`,
          name: `Normal alert`,
          description: `Watching stale entries`,
          lastEvaluatedAt: new Date().toISOString(),
          lastEvaluationError: null,
          lastFiredAt: null,
          lastFireReason: null,
        },
      ],
    });

    const markup = renderToStaticMarkup(await OperationalAlertsPage());

    expect(markup).toContain(`Normal alert`);
    expect(markup).toContain(`Watching stale entries`);
    expect(markup).toContain(`count &gt; 5`);
    expect(markup).toContain(`every 5 min`);
    expect(markup).toContain(`Class: stalePendingEntries`);
    expect(markup).toContain(`Rename or update threshold`);
    expect(markup).toContain(`name="thresholdPayload"`);
    expect(markup).toContain(`name="evaluationIntervalMinutes"`);
    expect(markup).toContain(`Delete`);
  });
});
