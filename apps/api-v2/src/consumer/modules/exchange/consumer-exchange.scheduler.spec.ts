import { ConsumerExchangeScheduler } from './consumer-exchange.scheduler';
import { type ConsumerExchangeService } from './consumer-exchange.service';

describe(`ConsumerExchangeScheduler`, () => {
  let scheduler: ConsumerExchangeScheduler;
  let exchangeService: {
    processDueScheduledConversions: jest.Mock;
    processDueAutoConversionRules: jest.Mock;
  };
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    exchangeService = {
      processDueScheduledConversions: jest.fn().mockResolvedValue(undefined),
      processDueAutoConversionRules: jest.fn().mockResolvedValue(undefined),
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
