import { BadRequestException, NotFoundException } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';
import { errorCodes } from '@remoola/shared-constants';

import { ConsumerScheduledConversionService } from './consumer-scheduled-conversion.service';

function createScheduledConversion(overrides?: Partial<Record<string, unknown>>) {
  return {
    id: `conversion-1`,
    consumerId: `consumer-1`,
    fromCurrency: $Enums.CurrencyCode.USD,
    toCurrency: $Enums.CurrencyCode.EUR,
    amount: 12.34,
    executeAt: new Date(`2026-06-01T10:00:00.000Z`),
    status: $Enums.ScheduledFxConversionStatus.PENDING,
    ...overrides,
  };
}

function createService() {
  const conversionService = {
    convertInternal: jest.fn().mockResolvedValue({ ledgerId: `ledger-1` }),
  } as any;
  const automationRepository = {
    countScheduledConversions: jest.fn().mockResolvedValue(0),
    listScheduledConversions: jest.fn().mockResolvedValue([]),
    createScheduledConversion: jest.fn().mockImplementation((data) =>
      Promise.resolve(
        createScheduledConversion({
          id: `created-conversion`,
          ...data,
          status: $Enums.ScheduledFxConversionStatus.PENDING,
        }),
      ),
    ),
    findActiveScheduledConversion: jest.fn().mockResolvedValue(createScheduledConversion()),
    cancelScheduledConversion: jest.fn().mockResolvedValue(undefined),
    findDueScheduledConversions: jest.fn().mockResolvedValue([]),
    claimDueScheduledConversion: jest.fn().mockResolvedValue(true),
    markScheduledConversionExecuted: jest.fn().mockResolvedValue(undefined),
    markScheduledConversionFailed: jest.fn().mockResolvedValue(undefined),
    findScheduledConversionById: jest.fn().mockResolvedValue(createScheduledConversion()),
    claimScheduledConversionNow: jest.fn().mockResolvedValue(true),
  } as any;
  const service = new ConsumerScheduledConversionService(conversionService, automationRepository);

  jest
    .spyOn((service as unknown as { logger: { debug: (...args: unknown[]) => void } }).logger, `debug`)
    .mockImplementation(() => undefined);
  jest
    .spyOn((service as unknown as { logger: { warn: (...args: unknown[]) => void } }).logger, `warn`)
    .mockImplementation(() => undefined);
  jest
    .spyOn((service as unknown as { logger: { log: (...args: unknown[]) => void } }).logger, `log`)
    .mockImplementation(() => undefined);

  return { service, conversionService, automationRepository };
}

describe(`ConsumerScheduledConversionService`, () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it(`normalizes pagination and scheduled conversion rows`, async () => {
    const { service, automationRepository } = createService();
    automationRepository.countScheduledConversions.mockResolvedValueOnce(1);
    automationRepository.listScheduledConversions.mockResolvedValueOnce([
      createScheduledConversion({
        id: `conversion-2`,
        amount: `15.50`,
        executeAt: new Date(`2026-06-02T10:00:00.000Z`),
      }),
    ]);

    const result = await service.listScheduledConversions(`consumer-1`, -2, 500);

    expect(automationRepository.listScheduledConversions).toHaveBeenCalledWith(`consumer-1`, 0, 100);
    expect(result).toEqual({
      items: [
        {
          id: `conversion-2`,
          fromCurrency: $Enums.CurrencyCode.USD,
          toCurrency: $Enums.CurrencyCode.EUR,
          amount: 15.5,
          executeAt: `2026-06-02T10:00:00.000Z`,
          status: $Enums.ScheduledFxConversionStatus.PENDING,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 100,
    });
  });

  it.each([
    {
      body: { from: $Enums.CurrencyCode.USD, to: $Enums.CurrencyCode.USD, amount: 10, executeAt: `2026-06-01` },
      code: errorCodes.CURRENCIES_MUST_DIFFER_SCHEDULE,
    },
    {
      body: { from: $Enums.CurrencyCode.USD, to: $Enums.CurrencyCode.EUR, amount: 0, executeAt: `2026-06-01` },
      code: errorCodes.INVALID_AMOUNT_SCHEDULE,
    },
    {
      body: { from: $Enums.CurrencyCode.USD, to: $Enums.CurrencyCode.EUR, amount: 10, executeAt: `not-a-date` },
      code: errorCodes.INVALID_EXECUTE_AT,
    },
    {
      body: { from: $Enums.CurrencyCode.USD, to: $Enums.CurrencyCode.EUR, amount: 10, executeAt: `2020-01-01` },
      code: errorCodes.EXECUTE_AT_MUST_BE_FUTURE,
    },
  ])(`rejects invalid schedule request with $code`, async ({ body, code }) => {
    const { service, automationRepository } = createService();

    await expect(service.scheduleConversion(`consumer-1`, body)).rejects.toMatchObject({
      response: { message: code },
    });
    expect(automationRepository.createScheduledConversion).not.toHaveBeenCalled();
  });

  it(`creates a scheduled conversion with unchanged repository call shape`, async () => {
    const { service, automationRepository } = createService();

    const result = await service.scheduleConversion(`consumer-1`, {
      from: $Enums.CurrencyCode.USD,
      to: $Enums.CurrencyCode.EUR,
      amount: 20,
      executeAt: `2999-06-01T10:00:00.000Z`,
    });

    expect(automationRepository.createScheduledConversion).toHaveBeenCalledWith({
      consumerId: `consumer-1`,
      fromCurrency: $Enums.CurrencyCode.USD,
      toCurrency: $Enums.CurrencyCode.EUR,
      amount: 20,
      executeAt: new Date(`2999-06-01T10:00:00.000Z`),
    });
    expect(result).toMatchObject({
      id: `created-conversion`,
      fromCurrency: $Enums.CurrencyCode.USD,
      toCurrency: $Enums.CurrencyCode.EUR,
      amount: 20,
      status: $Enums.ScheduledFxConversionStatus.PENDING,
    });
  });

  it(`rejects cancelling a missing scheduled conversion`, async () => {
    const { service, automationRepository } = createService();
    automationRepository.findActiveScheduledConversion.mockResolvedValueOnce(null);

    await expect(service.cancelScheduledConversion(`consumer-1`, `conversion-1`)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it(`rejects cancelling a non-pending scheduled conversion`, async () => {
    const { service, automationRepository } = createService();
    automationRepository.findActiveScheduledConversion.mockResolvedValueOnce(
      createScheduledConversion({ status: $Enums.ScheduledFxConversionStatus.EXECUTED }),
    );

    await expect(service.cancelScheduledConversion(`consumer-1`, `conversion-1`)).rejects.toMatchObject({
      response: { message: errorCodes.ONLY_PENDING_CONVERSIONS_CAN_CANCEL },
    });
    expect(automationRepository.cancelScheduledConversion).not.toHaveBeenCalled();
  });

  it(`cancels a pending scheduled conversion`, async () => {
    const { service, automationRepository } = createService();

    await expect(service.cancelScheduledConversion(`consumer-1`, `conversion-1`)).resolves.toEqual({
      conversionId: `conversion-1`,
    });
    expect(automationRepository.cancelScheduledConversion).toHaveBeenCalledWith(`conversion-1`, expect.any(Date));
  });

  it(`claims due conversions before execution and records executed and failed outcomes`, async () => {
    const { service, conversionService, automationRepository } = createService();
    automationRepository.findDueScheduledConversions.mockResolvedValueOnce([
      createScheduledConversion({ id: `skip-me` }),
      createScheduledConversion({ id: `execute-me` }),
      createScheduledConversion({ id: `fail-me` }),
    ]);
    automationRepository.claimDueScheduledConversion
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true);
    conversionService.convertInternal
      .mockResolvedValueOnce({ ledgerId: `ledger-execute` })
      .mockRejectedValueOnce(new Error(`conversion boom`));

    await service.processDueScheduledConversions();

    expect(conversionService.convertInternal).toHaveBeenCalledTimes(2);
    expect(conversionService.convertInternal).toHaveBeenNthCalledWith(
      1,
      `consumer-1`,
      {
        from: $Enums.CurrencyCode.USD,
        to: $Enums.CurrencyCode.EUR,
        amount: 12.34,
      },
      {
        metadata: { source: `scheduled`, scheduledConversionId: `execute-me` },
        idempotencyKeyPrefix: `scheduled:execute-me`,
      },
    );
    expect(automationRepository.markScheduledConversionExecuted).toHaveBeenCalledWith(`execute-me`, `ledger-execute`);
    expect(automationRepository.markScheduledConversionFailed).toHaveBeenCalledWith(`fail-me`, `conversion boom`);
  });

  it.each([
    {
      status: $Enums.ScheduledFxConversionStatus.EXECUTED,
      code: errorCodes.CONVERSION_ALREADY_EXECUTED,
    },
    {
      status: $Enums.ScheduledFxConversionStatus.CANCELLED,
      code: errorCodes.CONVERSION_CANCELLED,
    },
  ])(`rejects forced execution when status is $status`, async ({ status, code }) => {
    const { service, automationRepository, conversionService } = createService();
    automationRepository.findScheduledConversionById.mockResolvedValueOnce(createScheduledConversion({ status }));

    await expect(service.executeScheduledConversionNow(`conversion-1`)).rejects.toMatchObject({
      response: { message: code },
    });
    expect(conversionService.convertInternal).not.toHaveBeenCalled();
  });

  it(`rejects forced execution for missing or already-processing conversions`, async () => {
    const { service, automationRepository, conversionService } = createService();
    automationRepository.findScheduledConversionById.mockResolvedValueOnce(null);
    await expect(service.executeScheduledConversionNow(`missing`)).rejects.toBeInstanceOf(NotFoundException);

    automationRepository.findScheduledConversionById.mockResolvedValueOnce(createScheduledConversion());
    automationRepository.claimScheduledConversionNow.mockResolvedValueOnce(false);
    await expect(service.executeScheduledConversionNow(`conversion-1`)).rejects.toMatchObject({
      response: { message: errorCodes.CONVERSION_ALREADY_PROCESSING },
    });
    expect(conversionService.convertInternal).not.toHaveBeenCalled();
  });

  it(`executes a forced scheduled conversion with unchanged metadata and idempotency prefix`, async () => {
    const { service, conversionService, automationRepository } = createService();

    await expect(
      service.executeScheduledConversionNow(`conversion-1`, {
        source: `admin`,
        actorId: `admin-1`,
      }),
    ).resolves.toEqual({
      conversionId: `conversion-1`,
      ledgerId: `ledger-1`,
    });

    expect(conversionService.convertInternal).toHaveBeenCalledWith(
      `consumer-1`,
      {
        from: $Enums.CurrencyCode.USD,
        to: $Enums.CurrencyCode.EUR,
        amount: 12.34,
      },
      {
        metadata: {
          source: `admin`,
          initiatedBy: `admin-1`,
          scheduledConversionId: `conversion-1`,
        },
        idempotencyKeyPrefix: `scheduled:conversion-1`,
      },
    );
    expect(automationRepository.markScheduledConversionExecuted).toHaveBeenCalledWith(`conversion-1`, `ledger-1`);
  });

  it(`marks forced scheduled conversion failures and rethrows`, async () => {
    const { service, conversionService, automationRepository } = createService();
    conversionService.convertInternal.mockRejectedValueOnce(new BadRequestException(errorCodes.INVALID_AMOUNT_CONVERT));

    await expect(service.executeScheduledConversionNow(`conversion-1`)).rejects.toBeInstanceOf(BadRequestException);
    expect(automationRepository.markScheduledConversionFailed).toHaveBeenCalledWith(
      `conversion-1`,
      errorCodes.INVALID_AMOUNT_CONVERT,
    );
  });
});
