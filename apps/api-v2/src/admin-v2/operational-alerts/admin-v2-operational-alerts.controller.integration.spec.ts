import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { type INestApplication } from '@nestjs/common';
import request from 'supertest';

import { AdminV2AccessService } from '../admin-v2-access.service';
import { AdminV2OperationalAlertsController } from './admin-v2-operational-alerts.controller';
import { AdminV2OperationalAlertsService } from './admin-v2-operational-alerts.service';
import { bootstrapApiTestApp } from '../../../test/helpers/bootstrap-api-test-app';
import { nextIdempotencyKey } from '../../../test/helpers/http-test-helpers';

describe(`AdminV2OperationalAlertsController integration`, () => {
  let app: INestApplication;
  let close: (() => Promise<void>) | undefined;

  const adminIdentity = {
    id: `00000000-0000-4000-8000-000000000111`,
    email: `admin-json-payload@local.test`,
    type: `ADMIN`,
  };

  const create = jest.fn(async (_admin: unknown, body: Record<string, unknown>) => ({ id: `alert-1`, ...body }));
  const update = jest.fn(async (_admin: unknown, operationalAlertId: string, body: Record<string, unknown>) => ({
    id: operationalAlertId,
    ...body,
  }));
  const service = {
    list: jest.fn(),
    create,
    update,
    delete: jest.fn(),
  };

  const accessService = {
    assertCapability: jest.fn(async () => ({ capabilities: [`alerts.manage`] })),
  };

  beforeAll(async () => {
    const harness = await bootstrapApiTestApp({
      controllers: [AdminV2OperationalAlertsController],
      providers: [
        { provide: AdminV2OperationalAlertsService, useValue: service },
        { provide: AdminV2AccessService, useValue: accessService },
      ],
      preset: `validationOnly`,
      identity: adminIdentity,
      cookieSecret: `test-secret`,
    });

    app = harness.app;
    close = harness.close;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    accessService.assertCapability.mockImplementation(async () => ({ capabilities: [`alerts.manage`] }));
    create.mockImplementation(async (_admin: unknown, body: Record<string, unknown>) => ({ id: `alert-1`, ...body }));
    update.mockImplementation(async (_admin: unknown, operationalAlertId: string, body: Record<string, unknown>) => ({
      id: operationalAlertId,
      ...body,
    }));
  });

  afterAll(async () => {
    if (close) {
      await close();
    }
  });

  it(`POST /api/admin-v2/operational-alerts accepts queryPayload and thresholdPayload`, async () => {
    const queryPayload = {
      class: `stalePendingEntries`,
      dateFrom: `2026-04-01`,
      dateTo: `2026-04-30`,
      assignees: [`ops`, `compliance`],
    };
    const thresholdPayload = {
      type: `count_gt`,
      value: 7,
    };

    const res = await request(app.getHttpServer())
      .post(`/api/admin-v2/operational-alerts`)
      .set(`Idempotency-Key`, nextIdempotencyKey(`operational-alert-create`))
      .send({
        workspace: `ledger_anomalies`,
        name: `Operational alert`,
        description: `alert filter`,
        queryPayload,
        thresholdPayload,
        evaluationIntervalMinutes: 15,
      })
      .expect(201);

    expect(accessService.assertCapability as jest.Mock).toHaveBeenCalledWith(adminIdentity, `alerts.manage`);
    expect(service.create as jest.Mock).toHaveBeenCalledWith(
      adminIdentity,
      {
        workspace: `ledger_anomalies`,
        name: `Operational alert`,
        description: `alert filter`,
        queryPayload,
        thresholdPayload,
        evaluationIntervalMinutes: 15,
      },
      expect.objectContaining({ idempotencyKey: expect.stringContaining(`operational-alert-create-`) }),
    );
    expect(res.body).toEqual(
      expect.objectContaining({
        id: `alert-1`,
        workspace: `ledger_anomalies`,
        name: `Operational alert`,
        description: `alert filter`,
        queryPayload,
        thresholdPayload,
        evaluationIntervalMinutes: 15,
      }),
    );
  });

  it(`POST /api/admin-v2/operational-alerts strips unknown top-level keys`, async () => {
    const thresholdPayload = { type: `count_gt`, value: 5 };

    const res = await request(app.getHttpServer())
      .post(`/api/admin-v2/operational-alerts`)
      .set(`Idempotency-Key`, nextIdempotencyKey(`operational-alert-create-invalid`))
      .send({
        workspace: `ledger_anomalies`,
        name: `Operational alert`,
        queryPayload: null,
        thresholdPayload,
        unexpectedTopLevel: true,
      })
      .expect(201);

    expect(service.create as jest.Mock).toHaveBeenCalledWith(
      adminIdentity,
      {
        workspace: `ledger_anomalies`,
        name: `Operational alert`,
        queryPayload: null,
        thresholdPayload,
      },
      expect.any(Object),
    );
    expect((service.create as jest.Mock).mock.calls[0]?.[1]).not.toHaveProperty(`unexpectedTopLevel`);
    expect(res.body).not.toHaveProperty(`unexpectedTopLevel`);
  });

  it(`PATCH /api/admin-v2/operational-alerts/:operationalAlertId accepts payload updates`, async () => {
    const queryPayload = {
      class: `stalePendingEntries`,
      dateFrom: `2026-05-01`,
      dateTo: `2026-05-31`,
    };
    const thresholdPayload = {
      type: `count_gt`,
      value: 9,
    };

    const res = await request(app.getHttpServer())
      .patch(`/api/admin-v2/operational-alerts/alert-1`)
      .set(`Idempotency-Key`, nextIdempotencyKey(`operational-alert-update`))
      .send({
        queryPayload,
        thresholdPayload,
        evaluationIntervalMinutes: 10,
        expectedDeletedAtNull: 0,
      })
      .expect(200);

    expect(service.update as jest.Mock).toHaveBeenCalledWith(
      adminIdentity,
      `alert-1`,
      {
        queryPayload,
        thresholdPayload,
        evaluationIntervalMinutes: 10,
        expectedDeletedAtNull: 0,
      },
      expect.objectContaining({ idempotencyKey: expect.stringContaining(`operational-alert-update-`) }),
    );
    expect(res.body).toEqual(
      expect.objectContaining({
        id: `alert-1`,
        queryPayload,
        thresholdPayload,
        evaluationIntervalMinutes: 10,
        expectedDeletedAtNull: 0,
      }),
    );
  });

  it(`PATCH /api/admin-v2/operational-alerts/:operationalAlertId strips unknown top-level keys`, async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/admin-v2/operational-alerts/alert-1`)
      .set(`Idempotency-Key`, nextIdempotencyKey(`operational-alert-update-invalid`))
      .send({
        name: `Updated operational alert`,
        expectedDeletedAtNull: 0,
        unexpectedTopLevel: true,
      })
      .expect(200);

    expect(service.update as jest.Mock).toHaveBeenCalledWith(
      adminIdentity,
      `alert-1`,
      {
        name: `Updated operational alert`,
        expectedDeletedAtNull: 0,
      },
      expect.any(Object),
    );
    expect((service.update as jest.Mock).mock.calls[0]?.[2]).not.toHaveProperty(`unexpectedTopLevel`);
    expect(res.body).not.toHaveProperty(`unexpectedTopLevel`);
  });
});
