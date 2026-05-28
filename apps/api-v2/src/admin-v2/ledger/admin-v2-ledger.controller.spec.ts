import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { type INestApplication } from '@nestjs/common';
import request from 'supertest';

import { AdminV2AccessService } from '../admin-v2-access.service';
import { AdminV2LedgerController } from './admin-v2-ledger.controller';
import { AdminV2LedgerService } from './admin-v2-ledger.service';
import { bootstrapApiTestApp } from '../../../test/helpers/bootstrap-api-test-app';

describe(`AdminV2LedgerController integration`, () => {
  let app: INestApplication;
  let close: (() => Promise<void>) | undefined;

  const admin = { id: `00000000-0000-4000-8000-000000000103`, email: `admin@example.com`, type: `ADMIN` };
  const listLedgerEntries = jest.fn<
    (params?: unknown) => Promise<{ items: unknown[]; pageInfo: { nextCursor: string | null } }>
  >(async () => ({ items: [], pageInfo: { nextCursor: null } }));
  const listDisputes = jest.fn<(params?: unknown) => Promise<{ items: unknown[] }>>(async () => ({ items: [] }));
  const getLedgerEntryCase = jest.fn<(id: string) => Promise<{ id: string }>>(async (id) => ({ id }));
  const assertCapability = jest.fn<(admin: unknown, capability: string) => Promise<void>>(async () => undefined);

  beforeAll(async () => {
    const harness = await bootstrapApiTestApp({
      controllers: [AdminV2LedgerController],
      providers: [
        { provide: AdminV2LedgerService, useValue: { listLedgerEntries, listDisputes, getLedgerEntryCase } },
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
    listLedgerEntries.mockResolvedValue({ items: [], pageInfo: { nextCursor: null } });
    listDisputes.mockResolvedValue({ items: [] });
    getLedgerEntryCase.mockImplementation(async (id) => ({ id }));
  });

  afterAll(async () => {
    if (close) {
      await close();
    }
  });

  it(`binds and transforms validated list query DTO values`, async () => {
    await request(app.getHttpServer())
      .get(`/api/admin-v2/ledger?limit=10&dateFrom=2026-01-01T00:00:00.000Z`)
      .expect(200);

    expect(assertCapability).toHaveBeenCalledWith(admin, `ledger.read`);
    expect(listLedgerEntries).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 10,
        dateFrom: new Date(`2026-01-01T00:00:00.000Z`),
      }),
    );
  });

  it(`rejects repeated optional date query params before ledger service dispatch`, async () => {
    await request(app.getHttpServer())
      .get(`/api/admin-v2/ledger?dateFrom=2026-01-01T00:00:00.000Z&dateFrom=2026-01-02T00:00:00.000Z`)
      .expect(400);

    expect(listLedgerEntries).not.toHaveBeenCalled();
  });

  it(`rejects repeated optional dispute date query params before service dispatch`, async () => {
    await request(app.getHttpServer())
      .get(`/api/admin-v2/ledger/disputes?dateTo=2026-01-01T00:00:00.000Z&dateTo=2026-01-02T00:00:00.000Z`)
      .expect(400);

    expect(listDisputes).not.toHaveBeenCalled();
  });
});
