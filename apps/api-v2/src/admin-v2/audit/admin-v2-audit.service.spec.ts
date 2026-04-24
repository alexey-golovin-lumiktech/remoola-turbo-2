import { BadRequestException } from '@nestjs/common';

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
    const consumerActionLogModel = {
      findMany: jest.fn(async () => []),
      count: jest.fn(async () => 0),
    };
    const prisma = { consumerActionLogModel } as never;
    return {
      service: new AdminV2AuditService(prisma),
      consumerActionLogModel,
    };
  }

  it(`rejects getConsumerActionAudit without dateFrom`, async () => {
    const { service, consumerActionLogModel } = makeService();

    await expect(service.getConsumerActionAudit({ page: 1, pageSize: 20 })).rejects.toBeInstanceOf(BadRequestException);
    expect(consumerActionLogModel.findMany).not.toHaveBeenCalled();
    expect(consumerActionLogModel.count).not.toHaveBeenCalled();
  });

  it(`rejects getConsumerActionAudit when range exceeds the canonical 31-day window`, async () => {
    const { service, consumerActionLogModel } = makeService();
    const dateFrom = new Date(`2026-01-01T00:00:00Z`);
    const dateTo = new Date(`2026-03-01T00:00:00Z`);

    await expect(service.getConsumerActionAudit({ page: 1, pageSize: 20, dateFrom, dateTo })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(consumerActionLogModel.findMany).not.toHaveBeenCalled();
  });

  it(`accepts a bounded range and echoes dateFrom/dateTo on the success path`, async () => {
    const { service, consumerActionLogModel } = makeService();
    const dateFrom = new Date(`2026-04-01T00:00:00Z`);
    const dateTo = new Date(`2026-04-15T00:00:00Z`);

    const result = await service.getConsumerActionAudit({ page: 1, pageSize: 20, dateFrom, dateTo });

    expect(result.dateFrom).toEqual(dateFrom);
    expect(result.dateTo).toEqual(dateTo);
    expect(consumerActionLogModel.findMany).toHaveBeenCalledTimes(1);
    expect(consumerActionLogModel.count).toHaveBeenCalledTimes(1);
  });
});
