import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { type INestApplication } from '@nestjs/common';
import request from 'supertest';

import { AdminV2LedgerAnomaliesController } from './admin-v2-ledger-anomalies.controller';
import { AdminV2LedgerAnomaliesService } from './admin-v2-ledger-anomalies.service';
import { bootstrapApiTestApp } from '../../../../test/helpers/bootstrap-api-test-app';
import { AdminV2AccessService } from '../../admin-v2-access.service';

describe(`AdminV2LedgerAnomaliesController`, () => {
  it(`guards summary and list routes with ledger.anomalies capability`, async () => {
    const assertCapability = jest.fn<(admin: unknown, capability: string) => Promise<object>>(async () => ({
      role: `OPS_ADMIN`,
      capabilities: [`ledger.anomalies`],
      workspaces: [`ledger`],
      source: `schema`,
    }));
    const getSummary = jest.fn<() => Promise<object>>(async () => ({
      computedAt: `2026-04-20T00:00:00.000Z`,
      classes: {},
      totalCount: 0,
    }));
    const getList = jest.fn<(query: object) => Promise<object>>(async () => ({
      class: `stalePendingEntries`,
      items: [],
      nextCursor: null,
      computedAt: `2026-04-20T00:00:00.000Z`,
    }));
    const controller = new AdminV2LedgerAnomaliesController(
      {
        getSummary,
        getList,
      } as never,
      {
        assertCapability,
      } as never,
    );

    await controller.getSummary({
      id: `admin-1`,
      email: `ops@example.com`,
      type: `ADMIN`,
      sessionId: `session-1`,
    } as never);

    await controller.getList(
      {
        id: `admin-1`,
        email: `ops@example.com`,
        type: `ADMIN`,
        sessionId: `session-1`,
      } as never,
      {
        className: `largeValueOutliers`,
        dateFrom: new Date(`2026-04-01T00:00:00.000Z`),
        dateTo: new Date(`2026-04-20T00:00:00.000Z`),
        cursor: `cursor-1`,
        limit: 10,
      },
    );

    expect(assertCapability).toHaveBeenNthCalledWith(1, expect.objectContaining({ id: `admin-1` }), `ledger.anomalies`);
    expect(getSummary).toHaveBeenCalledTimes(1);
    expect(assertCapability).toHaveBeenNthCalledWith(2, expect.objectContaining({ id: `admin-1` }), `ledger.anomalies`);
    expect(getList).toHaveBeenCalledWith({
      className: `largeValueOutliers`,
      dateFrom: new Date(`2026-04-01T00:00:00.000Z`),
      dateTo: new Date(`2026-04-20T00:00:00.000Z`),
      cursor: `cursor-1`,
      limit: 10,
    });
  });
});

describe(`AdminV2LedgerAnomaliesController integration`, () => {
  let app: INestApplication;
  let close: (() => Promise<void>) | undefined;

  const admin = { id: `00000000-0000-4000-8000-000000000104`, email: `admin@example.com`, type: `ADMIN` };
  const getSummary = jest.fn(async () => ({ computedAt: `2026-04-20T00:00:00.000Z`, classes: {}, totalCount: 0 }));
  const getList = jest.fn<(query?: unknown) => Promise<object>>(async () => ({
    class: `stalePendingEntries`,
    items: [],
    nextCursor: null,
    computedAt: `2026-04-20T00:00:00.000Z`,
  }));
  const assertCapability = jest.fn<(admin: unknown, capability: string) => Promise<void>>(async () => undefined);

  beforeAll(async () => {
    const harness = await bootstrapApiTestApp({
      controllers: [AdminV2LedgerAnomaliesController],
      providers: [
        { provide: AdminV2LedgerAnomaliesService, useValue: { getSummary, getList } },
        { provide: AdminV2AccessService, useValue: { assertCapability } },
      ],
      preset: `validationOnly`,
      identity: admin,
    });

    app = harness.app;
    close = harness.close;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    getSummary.mockResolvedValue({ computedAt: `2026-04-20T00:00:00.000Z`, classes: {}, totalCount: 0 });
    getList.mockResolvedValue({
      class: `stalePendingEntries`,
      items: [],
      nextCursor: null,
      computedAt: `2026-04-20T00:00:00.000Z`,
    });
  });

  afterAll(async () => {
    if (close) {
      await close();
    }
  });

  it(`rejects repeated optional date query params before service dispatch`, async () => {
    const query = [
      `/api/admin-v2/ledger/anomalies?class=stalePendingEntries`,
      `dateFrom=2026-04-01T00:00:00.000Z`,
      `dateTo=2026-04-20T00:00:00.000Z`,
      `dateTo=2026-04-21T00:00:00.000Z`,
    ].join(`&`);

    await request(app.getHttpServer()).get(query).expect(400);

    expect(getList).not.toHaveBeenCalled();
  });

  it(`requires anomaly class to match the shared API contract`, async () => {
    await request(app.getHttpServer())
      .get(`/api/admin-v2/ledger/anomalies?dateFrom=2026-04-01T00:00:00.000Z`)
      .expect(400);

    expect(getList).not.toHaveBeenCalled();
  });

  it(`trims anomaly class before service dispatch`, async () => {
    await request(app.getHttpServer())
      .get(`/api/admin-v2/ledger/anomalies?class=%20stalePendingEntries%20&dateFrom=2026-04-01T00:00:00.000Z`)
      .expect(200);

    expect(getList).toHaveBeenCalledWith(
      expect.objectContaining({
        className: `stalePendingEntries`,
        dateFrom: new Date(`2026-04-01T00:00:00.000Z`),
      }),
    );
  });
});
