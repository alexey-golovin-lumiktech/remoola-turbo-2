import { BadRequestException, ConflictException } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';

import { AdminV2ExchangeService } from './admin-v2-exchange.service';

describe(`AdminV2ExchangeService`, () => {
  function createService(overrides?: {
    prisma?: Record<string, unknown>;
    idempotency?: Record<string, unknown>;
    balanceService?: Record<string, unknown>;
    domainEvents?: Record<string, unknown>;
    assignmentsService?: Record<string, unknown>;
  }) {
    const prisma = {
      exchangeRateModel: {
        count: jest.fn(async () => 1),
        findMany: jest.fn(async () => [
          {
            id: `rate-1`,
            fromCurrency: $Enums.CurrencyCode.USD,
            toCurrency: $Enums.CurrencyCode.EUR,
            rate: { toString: () => `0.92000000`, valueOf: () => 0.92 } as never,
            spreadBps: 12,
            confidence: 87,
            status: $Enums.ExchangeRateStatus.APPROVED,
            provider: `ECB`,
            effectiveAt: new Date(`2026-04-17T08:00:00.000Z`),
            fetchedAt: new Date(`2026-04-17T08:00:00.000Z`),
            expiresAt: null,
            approvedAt: new Date(`2026-04-17T08:05:00.000Z`),
            createdAt: new Date(`2026-04-17T07:55:00.000Z`),
            updatedAt: new Date(`2026-04-17T08:05:00.000Z`),
          },
        ]),
        findFirst: jest.fn(),
      },
      walletAutoConversionRuleModel: {
        findFirst: jest.fn(),
      },
      scheduledFxConversionModel: {
        findFirst: jest.fn(),
      },
      ledgerEntryModel: {
        findMany: jest.fn(async () => []),
      },
      adminActionAuditLogModel: {
        findMany: jest.fn(async () => []),
      },
      $queryRaw: jest.fn(),
      $transaction: jest.fn(),
      ...overrides?.prisma,
    } as any;

    const idempotency = {
      execute: jest.fn(async ({ execute }: { execute: () => Promise<unknown> }) => execute()),
      ...overrides?.idempotency,
    } as any;

    const balanceService = {
      calculateInTransaction: jest.fn(async () => 0),
      ...overrides?.balanceService,
    } as any;

    const domainEvents = {
      publishAfterCommit: jest.fn(async () => undefined),
      ...overrides?.domainEvents,
    } as any;

    const assignmentsService = {
      getAssignmentContextForResource: jest.fn(async () => ({ current: null, history: [] })),
      ...overrides?.assignmentsService,
    } as any;

    return {
      service: new AdminV2ExchangeService(prisma, idempotency, balanceService, domainEvents, assignmentsService),
      prisma,
      idempotency,
      balanceService,
      domainEvents,
      assignmentsService,
    };
  }

  it(`maps rates with spread, confidence and staleness visibility`, async () => {
    const { service } = createService();

    const result = await service.listRates({
      page: 1,
      pageSize: 20,
    });

    expect(result).toEqual({
      items: [
        expect.objectContaining({
          id: `rate-1`,
          sourceCurrency: `USD`,
          targetCurrency: `EUR`,
          rate: `0.92000000`,
          spreadBps: 12,
          confidence: 87,
          provider: `ECB`,
          stalenessIndicator: expect.objectContaining({
            isStale: expect.any(Boolean),
            ageMinutes: expect.any(Number),
          }),
        }),
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    });
  });

  it(`rejects stale exchange rate approval before any write`, async () => {
    const updatedAt = new Date(`2026-04-17T09:00:00.000Z`);
    const { service, prisma } = createService({
      prisma: {
        exchangeRateModel: {
          findFirst: jest.fn(async () => ({
            id: `rate-1`,
            updatedAt,
            deletedAt: null,
          })),
        },
      },
    });

    await expect(
      service.approveRate(
        `rate-1`,
        `admin-1`,
        {
          version: updatedAt.getTime() - 1,
          confirmed: true,
          reason: `Review complete`,
        },
        { idempotencyKey: `rate-approve-1` },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it(`enforces strong UUID idempotency keys for rule run-now`, async () => {
    const { service } = createService();

    await expect(
      service.runRuleNow(
        `rule-1`,
        `admin-1`,
        {
          version: 1,
        },
        {
          idempotencyKey: `not-a-uuid`,
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it(`publishes exchange.failed after a committed rule run with no executable amount`, async () => {
    const updatedAt = new Date(`2026-04-17T10:00:00.000Z`);
    const tx = {
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce([
          {
            id: `rule-1`,
            consumer_id: `consumer-1`,
            from_currency: $Enums.CurrencyCode.USD,
            to_currency: $Enums.CurrencyCode.EUR,
            target_balance: 100,
            max_convert_amount: null,
            min_interval_minutes: 60,
            next_run_at: null,
            last_run_at: null,
            enabled: true,
            metadata: null,
            updated_at: updatedAt,
            deleted_at: null,
            consumer_email: `consumer@example.com`,
          },
        ])
        .mockResolvedValueOnce([{ locked: true }]),
      walletAutoConversionRuleModel: {
        update: jest.fn(async () => ({
          id: `rule-1`,
          updatedAt,
          nextRunAt: new Date(`2026-04-17T11:00:00.000Z`),
          lastRunAt: new Date(`2026-04-17T10:00:00.000Z`),
        })),
      },
      adminActionAuditLogModel: {
        create: jest.fn(async () => ({ id: `audit-1` })),
      },
      $executeRaw: jest.fn(async () => undefined),
    } as any;
    const { service, prisma, balanceService, domainEvents } = createService({
      prisma: {
        walletAutoConversionRuleModel: {
          findFirst: jest.fn(async () => ({
            id: `rule-1`,
            updatedAt,
            deletedAt: null,
          })),
        },
        $transaction: jest.fn(async (callback: (client: unknown) => Promise<unknown>) => callback(tx)),
      },
      balanceService: {
        calculateInTransaction: jest.fn(async () => 100),
      },
    });

    const result = await service.runRuleNow(
      `rule-1`,
      `admin-1`,
      {
        version: updatedAt.getTime(),
      },
      {
        idempotencyKey: `77777777-7777-4777-8777-777777777777`,
      },
    );

    expect(result.summary.status).toBe(`failed`);
    expect(result.summary.reason).toBe(`balance_below_target`);
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(balanceService.calculateInTransaction).toHaveBeenCalled();
    expect(domainEvents.publishAfterCommit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: `exchange.failed`,
        resourceType: `exchange_rule`,
        resourceId: `rule-1`,
      }),
    );
  });

  it(`enforces strong UUID idempotency keys for scheduled force-execute`, async () => {
    const { service } = createService();

    await expect(
      service.forceExecuteScheduledConversion(
        `scheduled-1`,
        `admin-1`,
        {
          version: 1,
          confirmed: true,
        },
        {
          idempotencyKey: `bad-key`,
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it(`publishes exchange.executed after successful scheduled force-execute`, async () => {
    const now = Date.now();
    const updatedAt = new Date(now - 5 * 60_000);
    const rateObservedAt = new Date(now - 30 * 60_000);
    const tx = {
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce([
          {
            id: `scheduled-1`,
            consumer_id: `consumer-1`,
            from_currency: $Enums.CurrencyCode.USD,
            to_currency: $Enums.CurrencyCode.EUR,
            amount: 25,
            status: $Enums.ScheduledFxConversionStatus.PENDING,
            execute_at: new Date(now - 35 * 60_000),
            processing_at: null,
            executed_at: null,
            failed_at: null,
            attempts: 0,
            last_error: null,
            ledger_id: null,
            metadata: null,
            updated_at: updatedAt,
            deleted_at: null,
            consumer_email: `consumer@example.com`,
          },
        ])
        .mockResolvedValueOnce([{ locked: true }]),
      $executeRaw: jest.fn(async () => undefined),
      exchangeRateModel: {
        findFirst: jest.fn(async () => ({
          id: `rate-1`,
          rate: { valueOf: () => 0.9 } as never,
          fetchedAt: rateObservedAt,
          effectiveAt: rateObservedAt,
          createdAt: rateObservedAt,
        })),
      },
      ledgerEntryModel: {
        create: jest
          .fn()
          .mockResolvedValueOnce({ id: `source-1`, ledgerId: `ledger-1` })
          .mockResolvedValueOnce({ id: `target-1`, ledgerId: `ledger-1` }),
      },
      scheduledFxConversionModel: {
        update: jest.fn(async () => ({
          id: `scheduled-1`,
          updatedAt,
        })),
      },
      adminActionAuditLogModel: {
        create: jest.fn(async () => ({ id: `audit-1` })),
      },
    } as any;
    const { service, prisma, balanceService, domainEvents } = createService({
      prisma: {
        scheduledFxConversionModel: {
          findFirst: jest.fn(async () => ({
            id: `scheduled-1`,
            updatedAt,
            deletedAt: null,
          })),
        },
        $transaction: jest.fn(async (callback: (client: unknown) => Promise<unknown>) => callback(tx)),
      },
      balanceService: {
        calculateInTransaction: jest.fn(async () => 100),
      },
    });

    const result = await service.forceExecuteScheduledConversion(
      `scheduled-1`,
      `admin-1`,
      {
        version: updatedAt.getTime(),
        confirmed: true,
      },
      {
        idempotencyKey: `88888888-8888-4888-8888-888888888888`,
      },
    );

    expect(result.summary.status).toBe(`executed`);
    expect(balanceService.calculateInTransaction).toHaveBeenCalled();
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(domainEvents.publishAfterCommit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: `exchange.executed`,
        resourceType: `scheduled_fx_conversion`,
        resourceId: `scheduled-1`,
      }),
    );
  });

  describe(`getScheduledConversionCase assignment context`, () => {
    function buildConversion(overrides?: Partial<Record<string, unknown>>) {
      const updatedAt = new Date(`2026-04-17T08:05:00.000Z`);
      return {
        id: `scheduled-1`,
        ledgerId: null,
        fromCurrency: $Enums.CurrencyCode.USD,
        toCurrency: $Enums.CurrencyCode.EUR,
        amount: { toString: () => `25.00` } as never,
        status: $Enums.ScheduledFxConversionStatus.PENDING,
        attempts: 0,
        executeAt: new Date(`2026-04-17T08:00:00.000Z`),
        processingAt: null,
        executedAt: null,
        failedAt: null,
        createdAt: new Date(`2026-04-17T07:55:00.000Z`),
        updatedAt,
        lastError: null,
        metadata: {},
        consumer: { id: `consumer-1`, email: `consumer@example.com` },
        ...overrides,
      };
    }

    it(`returns assignment: { current: null, history: [] } when shared service has no rows`, async () => {
      const { service, assignmentsService } = createService({
        prisma: {
          scheduledFxConversionModel: {
            findFirst: jest.fn(async () => buildConversion()),
          },
        },
      });

      const result = await service.getScheduledConversionCase(`scheduled-1`);

      expect(result.assignment).toEqual({ current: null, history: [] });
      expect(assignmentsService.getAssignmentContextForResource).toHaveBeenCalledWith(`fx_conversion`, `scheduled-1`);
    });

    it(`returns populated assignment shape when shared service has active row`, async () => {
      const populated = {
        current: {
          id: `assignment-1`,
          assignedAdminId: `admin-1`,
          assignedAt: `2026-04-17T08:10:00.000Z`,
          expectedReleasedAtNull: true,
        },
        history: [
          {
            id: `assignment-1`,
            assignedAdminId: `admin-1`,
            assignedAt: `2026-04-17T08:10:00.000Z`,
            releasedAt: null,
            reason: null,
          },
        ],
      };
      const { service, assignmentsService } = createService({
        prisma: {
          scheduledFxConversionModel: {
            findFirst: jest.fn(async () => buildConversion()),
          },
        },
        assignmentsService: {
          getAssignmentContextForResource: jest.fn(async () => populated),
        },
      });

      const result = await service.getScheduledConversionCase(`scheduled-1`);

      expect(result.assignment).toEqual(populated);
      expect(assignmentsService.getAssignmentContextForResource).toHaveBeenCalledWith(`fx_conversion`, `scheduled-1`);
    });
  });
});
