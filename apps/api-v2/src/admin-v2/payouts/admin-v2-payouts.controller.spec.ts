import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { type INestApplication } from '@nestjs/common';
import request from 'supertest';

import { AdminV2AccessService } from '../admin-v2-access.service';
import { AdminV2PayoutsController } from './admin-v2-payouts.controller';
import { AdminV2PayoutsService } from './admin-v2-payouts.service';
import { bootstrapApiTestApp } from '../../../test/helpers/bootstrap-api-test-app';

describe(`AdminV2PayoutsController integration`, () => {
  let app: INestApplication;
  let close: (() => Promise<void>) | undefined;

  const admin = { id: `00000000-0000-4000-8000-000000000102`, email: `admin@example.com`, type: `ADMIN` };
  const listPayouts = jest.fn<(params?: unknown) => Promise<{ items: unknown[] }>>(async () => ({ items: [] }));
  const getPayoutCase = jest.fn<(id: string) => Promise<{ id: string }>>(async () => ({
    id: `00000000-0000-4000-8000-000000000301`,
  }));
  const assertCapability = jest.fn<(admin: unknown, capability: string) => Promise<void>>(async () => undefined);

  beforeAll(async () => {
    const harness = await bootstrapApiTestApp({
      controllers: [AdminV2PayoutsController],
      providers: [
        { provide: AdminV2PayoutsService, useValue: { listPayouts, getPayoutCase, escalatePayout: jest.fn() } },
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
    listPayouts.mockResolvedValue({ items: [] });
    getPayoutCase.mockResolvedValue({ id: `00000000-0000-4000-8000-000000000301` });
  });

  afterAll(async () => {
    if (close) {
      await close();
    }
  });

  it(`binds and transforms validated list query DTO values`, async () => {
    await request(app.getHttpServer()).get(`/api/admin-v2/payouts?limit=10&cursor=cursor-1`).expect(200);

    expect(assertCapability).toHaveBeenCalledWith(admin, `ledger.read`);
    expect(listPayouts).toHaveBeenCalledWith({ cursor: `cursor-1`, limit: 10 });
  });

  it(`rejects malformed list query values before service dispatch`, async () => {
    await request(app.getHttpServer()).get(`/api/admin-v2/payouts?limit=abc`).expect(400);

    expect(listPayouts).not.toHaveBeenCalled();
  });

  it(`rejects malformed payout ids before service dispatch`, async () => {
    await request(app.getHttpServer()).get(`/api/admin-v2/payouts/not-a-uuid`).expect(400);

    expect(getPayoutCase).not.toHaveBeenCalled();
  });
});
