import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { type INestApplication } from '@nestjs/common';
import request from 'supertest';

import { AdminV2AccessService } from '../admin-v2-access.service';
import { AdminV2SavedViewsController } from './admin-v2-saved-views.controller';
import { AdminV2SavedViewsService } from './admin-v2-saved-views.service';
import { bootstrapApiTestApp } from '../../../test/helpers/bootstrap-api-test-app';
import { nextIdempotencyKey } from '../../../test/helpers/http-test-helpers';

describe(`AdminV2SavedViewsController integration`, () => {
  let app: INestApplication;
  let close: (() => Promise<void>) | undefined;

  const adminIdentity = {
    id: `00000000-0000-4000-8000-000000000111`,
    email: `admin-json-payload@local.test`,
    type: `ADMIN`,
  };

  const create = jest.fn(async (_admin: unknown, body: Record<string, unknown>) => ({ id: `saved-view-1`, ...body }));
  const update = jest.fn(async (_admin: unknown, savedViewId: string, body: Record<string, unknown>) => ({
    id: savedViewId,
    ...body,
  }));
  const service = {
    list: jest.fn(),
    create,
    update,
    delete: jest.fn(),
  };

  const accessService = {
    assertCapability: jest.fn(async () => ({ capabilities: [`saved_views.manage`] })),
  };

  beforeAll(async () => {
    const harness = await bootstrapApiTestApp({
      controllers: [AdminV2SavedViewsController],
      providers: [
        { provide: AdminV2SavedViewsService, useValue: service },
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
    accessService.assertCapability.mockImplementation(async () => ({ capabilities: [`saved_views.manage`] }));
    create.mockImplementation(async (_admin: unknown, body: Record<string, unknown>) => ({
      id: `saved-view-1`,
      ...body,
    }));
    update.mockImplementation(async (_admin: unknown, savedViewId: string, body: Record<string, unknown>) => ({
      id: savedViewId,
      ...body,
    }));
  });

  afterAll(async () => {
    if (close) {
      await close();
    }
  });

  it(`POST /api/admin-v2/saved-views accepts nested queryPayload`, async () => {
    const queryPayload = {
      class: `STALE_PENDING`,
      filters: {
        dateFrom: `2026-04-01`,
        dateTo: `2026-04-30`,
        owners: [`ops`, `risk`],
      },
      includeArchived: false,
    };

    const res = await request(app.getHttpServer())
      .post(`/api/admin-v2/saved-views`)
      .set(`Idempotency-Key`, nextIdempotencyKey(`saved-view-create`))
      .send({
        workspace: `ledger_anomalies`,
        name: `Saved view`,
        description: `saved filter`,
        queryPayload,
      })
      .expect(201);

    expect(accessService.assertCapability as jest.Mock).toHaveBeenCalledWith(adminIdentity, `saved_views.manage`);
    expect(service.create as jest.Mock).toHaveBeenCalledWith(
      adminIdentity,
      {
        workspace: `ledger_anomalies`,
        name: `Saved view`,
        description: `saved filter`,
        queryPayload,
      },
      expect.objectContaining({ idempotencyKey: expect.stringContaining(`saved-view-create-`) }),
    );
    expect(res.body).toEqual(
      expect.objectContaining({
        id: `saved-view-1`,
        workspace: `ledger_anomalies`,
        name: `Saved view`,
        description: `saved filter`,
        queryPayload,
      }),
    );
  });

  it(`POST /api/admin-v2/saved-views strips unknown top-level keys before the service boundary`, async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/admin-v2/saved-views`)
      .set(`Idempotency-Key`, nextIdempotencyKey(`saved-view-create-invalid`))
      .send({
        workspace: `ledger_anomalies`,
        name: `Saved view`,
        queryPayload: null,
        unexpectedTopLevel: true,
      })
      .expect(201);

    expect(service.create as jest.Mock).toHaveBeenCalledWith(
      adminIdentity,
      {
        workspace: `ledger_anomalies`,
        name: `Saved view`,
        queryPayload: null,
      },
      expect.any(Object),
    );
    expect((service.create as jest.Mock).mock.calls[0]?.[1]).not.toHaveProperty(`unexpectedTopLevel`);
    expect(res.body).not.toHaveProperty(`unexpectedTopLevel`);
  });

  it(`PATCH /api/admin-v2/saved-views/:savedViewId accepts queryPayload updates`, async () => {
    const queryPayload = {
      class: `STALE_PENDING`,
      filters: {
        dateFrom: `2026-05-01`,
        dateTo: `2026-05-31`,
      },
      includeArchived: true,
    };

    const res = await request(app.getHttpServer())
      .patch(`/api/admin-v2/saved-views/saved-view-1`)
      .set(`Idempotency-Key`, nextIdempotencyKey(`saved-view-update`))
      .send({
        queryPayload,
        expectedDeletedAtNull: 0,
      })
      .expect(200);

    expect(service.update as jest.Mock).toHaveBeenCalledWith(
      adminIdentity,
      `saved-view-1`,
      {
        queryPayload,
        expectedDeletedAtNull: 0,
      },
      expect.objectContaining({ idempotencyKey: expect.stringContaining(`saved-view-update-`) }),
    );
    expect(res.body).toEqual(
      expect.objectContaining({
        id: `saved-view-1`,
        queryPayload,
        expectedDeletedAtNull: 0,
      }),
    );
  });

  it(`PATCH /api/admin-v2/saved-views/:savedViewId strips unknown top-level keys`, async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/admin-v2/saved-views/saved-view-1`)
      .set(`Idempotency-Key`, nextIdempotencyKey(`saved-view-update-invalid`))
      .send({
        name: `Updated saved view`,
        expectedDeletedAtNull: 0,
        unexpectedTopLevel: true,
      })
      .expect(200);

    expect(service.update as jest.Mock).toHaveBeenCalledWith(
      adminIdentity,
      `saved-view-1`,
      {
        name: `Updated saved view`,
        expectedDeletedAtNull: 0,
      },
      expect.any(Object),
    );
    expect((service.update as jest.Mock).mock.calls[0]?.[2]).not.toHaveProperty(`unexpectedTopLevel`);
    expect(res.body).not.toHaveProperty(`unexpectedTopLevel`);
  });
});
