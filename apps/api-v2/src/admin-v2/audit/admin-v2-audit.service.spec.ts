import { describe, expect, it, jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import {
  AdminActionAuditWithPagingQuery,
  AuthAuditWithPagingQuery,
  ConsumerActionAuditWithPagingQuery,
} from './admin-v2-audit.dto';
import { AdminV2AuditService } from './admin-v2-audit.service';

// Minimum bounded-query merge-gate coverage for admin-v2 audit surface.
// Validates the canonical guarantee that `getConsumerActionAudit`:
//   - rejects calls without `dateFrom`              (DATE_FROM_REQUIRED gate)
//   - rejects ranges exceeding 31 days              (DATE_RANGE_TOO_LARGE gate)
//   - returns bounded `dateFrom`/`dateTo` echo on success path
//
// We use a thin Prisma stub: only the two methods touched by the service are mocked.

describe(`AdminV2AuditService — bounded-query merge gate`, () => {
  function makeService() {
    const query = {
      listAuthAudit: jest.fn<(...a: any[]) => any>(async () => [[], 0] as const),
      listAdminActionAudit: jest.fn<(...a: any[]) => any>(async () => [[], 0] as const),
      listConsumerActionAudit: jest.fn<(...a: any[]) => any>(async () => [[], 0] as const),
    };
    return {
      service: new AdminV2AuditService(query as never),
      query,
    };
  }

  it(`rejects getConsumerActionAudit without dateFrom`, async () => {
    const { service, query } = makeService();

    await expect(service.getConsumerActionAudit({ page: 1, pageSize: 20 })).rejects.toBeInstanceOf(BadRequestException);
    expect(query.listConsumerActionAudit).not.toHaveBeenCalled();
  });

  it(`rejects getConsumerActionAudit when range exceeds the canonical 31-day window`, async () => {
    const { service, query } = makeService();
    const dateFrom = new Date(`2026-01-01T00:00:00Z`);
    const dateTo = new Date(`2026-03-01T00:00:00Z`);

    await expect(service.getConsumerActionAudit({ page: 1, pageSize: 20, dateFrom, dateTo })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(query.listConsumerActionAudit).not.toHaveBeenCalled();
  });

  it(`accepts a bounded range and echoes dateFrom/dateTo on the success path`, async () => {
    const { service, query } = makeService();
    const dateFrom = new Date(`2026-04-01T00:00:00Z`);
    const dateTo = new Date(`2026-04-15T00:00:00Z`);

    const result = await service.getConsumerActionAudit({ page: 1, pageSize: 20, dateFrom, dateTo });

    expect(result.dateFrom).toEqual(dateFrom);
    expect(result.dateTo).toEqual(dateTo);
    expect(query.listConsumerActionAudit).toHaveBeenCalledTimes(1);
  });

  it(`normalizes auth audit pagination independently of consumer audit range requirements`, async () => {
    const { service, query } = makeService();

    await service.getAuthAudit({ page: 0, pageSize: 500 });

    expect(query.listAuthAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 200,
      }),
    );
    expect(query.listConsumerActionAudit).not.toHaveBeenCalled();
  });

  it(`normalizes admin action audit pagination independently of consumer audit range requirements`, async () => {
    const { service, query } = makeService();

    await service.getAdminActionAudit({ page: -2, pageSize: 0 });

    expect(query.listAdminActionAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 1,
      }),
    );
    expect(query.listConsumerActionAudit).not.toHaveBeenCalled();
  });
});

describe(`Admin v2 audit DTO contracts`, () => {
  it(`keeps auth audit date fields optional`, async () => {
    const query = plainToInstance(
      AuthAuditWithPagingQuery,
      { email: `admin@example.com` },
      { excludeExtraneousValues: true },
    );

    await expect(validate(query)).resolves.toHaveLength(0);
  });

  it(`keeps admin action audit date fields optional`, async () => {
    const query = plainToInstance(
      AdminActionAuditWithPagingQuery,
      { action: `admin_invite` },
      { excludeExtraneousValues: true },
    );

    await expect(validate(query)).resolves.toHaveLength(0);
  });

  it(`requires dateFrom for consumer action audit`, async () => {
    const query = plainToInstance(
      ConsumerActionAuditWithPagingQuery,
      { action: `PAYMENT_CREATED` },
      { excludeExtraneousValues: true },
    );

    const errors = await validate(query);

    expect(errors.some((error) => error.property === `dateFrom`)).toBe(true);
  });

  it(`accepts explicit consumer action audit date bounds`, async () => {
    const query = plainToInstance(
      ConsumerActionAuditWithPagingQuery,
      { action: `PAYMENT_CREATED`, dateFrom: `2026-05-01T00:00:00.000Z`, dateTo: `2026-05-02T00:00:00.000Z` },
      { excludeExtraneousValues: true },
    );

    await expect(validate(query)).resolves.toHaveLength(0);
    expect(query.dateFrom).toEqual(new Date(`2026-05-01T00:00:00.000Z`));
  });
});
