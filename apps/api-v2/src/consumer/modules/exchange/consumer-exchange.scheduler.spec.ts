import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { ConsumerExchangeScheduler } from './consumer-exchange.scheduler';
import { type ConsumerExchangeService } from './consumer-exchange.service';

describe(`ConsumerExchangeScheduler`, () => {
  let scheduler: ConsumerExchangeScheduler;
  let exchangeService: {
    processDueScheduledConversions: jest.Mock<(...a: any[]) => any>;
    processDueAutoConversionRules: jest.Mock<(...a: any[]) => any>;
  };
  let logSpy: jest.SpiedFunction<(...a: any[]) => any>;
  let warnSpy: jest.SpiedFunction<(...a: any[]) => any>;
  let errorSpy: jest.SpiedFunction<(...a: any[]) => any>;

  beforeEach(() => {
    exchangeService = {
      processDueScheduledConversions: jest.fn<(...a: any[]) => any>().mockResolvedValue(undefined),
      processDueAutoConversionRules: jest.fn<(...a: any[]) => any>().mockResolvedValue(undefined),
    };
    scheduler = new ConsumerExchangeScheduler(exchangeService as unknown as ConsumerExchangeService);
    logSpy = jest
      .spyOn((scheduler as unknown as { logger: { log: (...args: unknown[]) => void } }).logger, `log`)
      .mockImplementation(() => undefined);
    warnSpy = jest
      .spyOn((scheduler as unknown as { logger: { warn: (...args: unknown[]) => void } }).logger, `warn`)
      .mockImplementation(() => undefined);
    errorSpy = jest
      .spyOn((scheduler as unknown as { logger: { error: (...args: unknown[]) => void } }).logger, `error`)
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it(`emits complete event for scheduled conversions`, async () => {
    await expect(scheduler.processScheduledConversions()).resolves.toBeUndefined();
    expect(exchangeService.processDueScheduledConversions).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith({ event: `exchange_scheduled_conversions_complete` });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it(`swallows and logs errors for scheduled conversions`, async () => {
    exchangeService.processDueScheduledConversions.mockRejectedValue(new Error(`boom`));
    await expect(scheduler.processScheduledConversions()).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: `exchange_scheduled_conversions_failed`,
      }),
    );
  });

  it(`emits degraded event after repeated scheduled conversion failures`, async () => {
    exchangeService.processDueScheduledConversions.mockRejectedValue(new Error(`boom`));
    await scheduler.processScheduledConversions();
    await scheduler.processScheduledConversions();
    await scheduler.processScheduledConversions();

    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: `exchange_scheduled_conversions_degraded`,
      }),
    );
  });

  it(`emits complete event for auto conversion rules`, async () => {
    await expect(scheduler.processAutoConversionRules()).resolves.toBeUndefined();
    expect(exchangeService.processDueAutoConversionRules).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith({ event: `exchange_auto_conversion_rules_complete` });
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
