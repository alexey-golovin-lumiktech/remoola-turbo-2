import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import {
  DEFAULT_CONSUMER_ACTION_LOG_CRITICAL_ACTION_PREFIXES,
  ConsumerActionLogPolicyService,
} from './consumer-action-log-policy.service';
import { type ConsumerActionLogQuery } from './consumer-action-log.query';
import { type ConsumerActionLogRepository } from './consumer-action-log.repository';
import { ConsumerActionLogService } from './consumer-action-log.service';
import { envs } from '../envs';

describe(`ConsumerActionLogService`, () => {
  let service: ConsumerActionLogService;
  let repository: { createActionLog: jest.Mock<(...a: any[]) => any> };
  let query: {
    findTimelineByDeviceId: jest.Mock<(...a: any[]) => any>;
    findTimelineByConsumerId: jest.Mock<(...a: any[]) => any>;
    findDistinctDeviceIdsByConsumerId: jest.Mock<(...a: any[]) => any>;
    findTimelineByDeviceIds: jest.Mock<(...a: any[]) => any>;
  };
  let dateNowSpy: jest.SpiedFunction<() => number>;
  let warnSpy: jest.SpiedFunction<(...a: any[]) => any>;
  let logSpy: jest.SpiedFunction<(...a: any[]) => any>;
  let nowMs: number;
  let initialStoreIpAddress: boolean;
  let initialStoreUserAgent: boolean;

  beforeEach(async () => {
    nowMs = 1700000000000;
    repository = {
      createActionLog: jest.fn<(...a: any[]) => any>().mockResolvedValue({}),
    };
    query = {
      findTimelineByDeviceId: jest.fn<(...a: any[]) => any>().mockResolvedValue([]),
      findTimelineByConsumerId: jest.fn<(...a: any[]) => any>().mockResolvedValue([]),
      findDistinctDeviceIdsByConsumerId: jest.fn<(...a: any[]) => any>().mockResolvedValue([]),
      findTimelineByDeviceIds: jest.fn<(...a: any[]) => any>().mockResolvedValue([]),
    };
    service = new ConsumerActionLogService(
      query as unknown as ConsumerActionLogQuery,
      repository as unknown as ConsumerActionLogRepository,
      new ConsumerActionLogPolicyService(DEFAULT_CONSUMER_ACTION_LOG_CRITICAL_ACTION_PREFIXES),
    );
    warnSpy = jest
      .spyOn((service as unknown as { logger: { warn: (...args: unknown[]) => void } }).logger, `warn`)
      .mockImplementation(() => undefined);
    logSpy = jest
      .spyOn((service as unknown as { logger: { log: (...args: unknown[]) => void } }).logger, `log`)
      .mockImplementation(() => undefined);
    dateNowSpy = jest.spyOn(Date, `now`).mockImplementation(() => nowMs);
    initialStoreIpAddress = envs.CONSUMER_ACTION_LOG_STORE_IP_ADDRESS;
    initialStoreUserAgent = envs.CONSUMER_ACTION_LOG_STORE_USER_AGENT;
    envs.CONSUMER_ACTION_LOG_STORE_IP_ADDRESS = false;
    envs.CONSUMER_ACTION_LOG_STORE_USER_AGENT = false;
  });

  afterEach(() => {
    envs.CONSUMER_ACTION_LOG_STORE_IP_ADDRESS = initialStoreIpAddress;
    envs.CONSUMER_ACTION_LOG_STORE_USER_AGENT = initialStoreUserAgent;
    dateNowSpy.mockRestore();
    jest.restoreAllMocks();
  });

  it(`records action on create success`, async () => {
    await service.record({
      deviceId: `device-uuid`,
      action: `consumer.auth.login_success`,
      resource: `auth`,
    });
    expect(repository.createActionLog).toHaveBeenCalledWith(
      expect.objectContaining({
        deviceId: `device-uuid`,
        action: `consumer.auth.login_success`,
        resource: `auth`,
        consumerId: null,
        resourceId: null,
        ipAddress: null,
        userAgent: null,
        correlationId: null,
      }),
    );
  });

  it(`does not throw when create fails`, async () => {
    repository.createActionLog.mockRejectedValue(new Error(`DB error`));
    await expect(service.record({ deviceId: `d`, action: `test`, resource: `r` })).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: `consumer_action_log_write_failed`,
      }),
    );
    expect(warnSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({
        event: `consumer_action_log_db_pool_saturation_signal`,
      }),
    );
  });

  it(`sanitizes metadata via allowlist`, async () => {
    await service.record({
      deviceId: `d`,
      action: `a`,
      metadata: { result: `ok`, password: `secret`, token: `x` },
    });
    expect(repository.createActionLog).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { result: `ok` },
      }),
    );
  });

  it(`stores minimized network metadata only when explicitly enabled`, async () => {
    envs.CONSUMER_ACTION_LOG_STORE_IP_ADDRESS = true;
    envs.CONSUMER_ACTION_LOG_STORE_USER_AGENT = true;

    await service.record({
      deviceId: `d`,
      action: `a`,
      ipAddress: `203.0.113.27`,
      userAgent: `Mozilla/5.0 Chrome/124.0.0.0`,
    });

    expect(repository.createActionLog).toHaveBeenCalledWith(
      expect.objectContaining({
        ipAddress: `203.0.113.0/24`,
        userAgent: `chrome/124`,
      }),
    );
  });

  it(`skips low-priority writes when per-second cap is exceeded and sample misses`, async () => {
    const randomSpy = jest.spyOn(Math, `random`).mockReturnValue(0.99);
    for (let i = 0; i < 300; i += 1) {
      await service.record({
        deviceId: `d`,
        action: `consumer.payments.start_success`,
        resource: `payments`,
      });
    }
    expect(repository.createActionLog.mock.calls.length).toBeLessThan(300);
    randomSpy.mockRestore();
  });

  it(`always records critical actions even when cap is exceeded`, async () => {
    const randomSpy = jest.spyOn(Math, `random`).mockReturnValue(0.99);
    for (let i = 0; i < 300; i += 1) {
      await service.record({
        deviceId: `d`,
        action: `consumer.payments.withdraw_success`,
        resource: `payments`,
      });
    }
    expect(repository.createActionLog).toHaveBeenCalledTimes(300);
    randomSpy.mockRestore();
  });

  it(`uses injected policy prefixes for critical action classification`, async () => {
    const policyService = new ConsumerActionLogPolicyService([`consumer.custom.critical`]);
    service = new ConsumerActionLogService(
      query as unknown as ConsumerActionLogQuery,
      repository as unknown as ConsumerActionLogRepository,
      policyService,
    );
    const randomSpy = jest.spyOn(Math, `random`).mockReturnValue(0.99);

    for (let i = 0; i < 300; i += 1) {
      await service.record({
        deviceId: `d`,
        action: `consumer.custom.critical_success`,
        resource: `custom`,
      });
    }

    expect(repository.createActionLog).toHaveBeenCalledTimes(300);
    randomSpy.mockRestore();
  });

  it(`always records failure actions even when cap is exceeded`, async () => {
    const randomSpy = jest.spyOn(Math, `random`).mockReturnValue(0.99);
    for (let i = 0; i < 300; i += 1) {
      await service.record({
        deviceId: `d`,
        action: `consumer.payments.start_failure`,
        resource: `payments`,
      });
    }
    expect(repository.createActionLog).toHaveBeenCalledTimes(300);
    randomSpy.mockRestore();
  });

  it(`rate-limits oauth callback failure actions per configured window`, async () => {
    const initialEnabled = envs.CONSUMER_ACTION_LOG_CALLBACK_FAILURE_RATE_LIMIT_ENABLED;
    const initialMax = envs.CONSUMER_ACTION_LOG_CALLBACK_FAILURE_MAX_PER_WINDOW;
    const initialWindow = envs.CONSUMER_ACTION_LOG_CALLBACK_FAILURE_WINDOW_SECONDS;
    envs.CONSUMER_ACTION_LOG_CALLBACK_FAILURE_RATE_LIMIT_ENABLED = true;
    envs.CONSUMER_ACTION_LOG_CALLBACK_FAILURE_MAX_PER_WINDOW = 3;
    envs.CONSUMER_ACTION_LOG_CALLBACK_FAILURE_WINDOW_SECONDS = 60;

    for (let i = 0; i < 10; i += 1) {
      await service.record({
        deviceId: `d`,
        action: `consumer.auth.oauth_callback_failure`,
        resource: `auth`,
      });
    }

    expect(repository.createActionLog).toHaveBeenCalledTimes(3);

    envs.CONSUMER_ACTION_LOG_CALLBACK_FAILURE_RATE_LIMIT_ENABLED = initialEnabled;
    envs.CONSUMER_ACTION_LOG_CALLBACK_FAILURE_MAX_PER_WINDOW = initialMax;
    envs.CONSUMER_ACTION_LOG_CALLBACK_FAILURE_WINDOW_SECONDS = initialWindow;
  });

  it(`emits periodic backpressure summary when drop threshold is reached`, async () => {
    (
      service as unknown as {
        summaryWindowStartedAtMs: number;
        stats: { attempted: number; recorded: number; dropped: number; sampledOverflow: number };
        maybeEmitBackpressureSummary: (nowMs: number) => void;
      }
    ).summaryWindowStartedAtMs = nowMs - (envs.CONSUMER_ACTION_LOG_BACKPRESSURE_SUMMARY_INTERVAL_SECONDS + 1) * 1000;
    (
      service as unknown as {
        stats: { attempted: number; recorded: number; dropped: number; sampledOverflow: number };
      }
    ).stats = {
      attempted: 20,
      recorded: 5,
      dropped: envs.CONSUMER_ACTION_LOG_BACKPRESSURE_SUMMARY_MIN_DROPPED,
      sampledOverflow: 0,
    };
    (
      service as unknown as {
        maybeEmitBackpressureSummary: (nowMs: number) => void;
      }
    ).maybeEmitBackpressureSummary(nowMs);

    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: `consumer_action_log_backpressure_summary`,
      }),
    );
  });

  it(`emits DB pool saturation signal on Prisma timeout code`, async () => {
    repository.createActionLog.mockRejectedValue({
      code: `P2024`,
      name: `PrismaClientKnownRequestError`,
      message: `Operation timed out`,
    });

    await expect(service.record({ deviceId: `d`, action: `consumer.payments.start_success` })).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: `consumer_action_log_db_pool_saturation_signal`,
        errorCode: `P2024`,
      }),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: `consumer_action_log_write_failed`,
      }),
    );
  });

  it(`delegates timeline by device lookups to the query collaborator`, async () => {
    query.findTimelineByDeviceId.mockResolvedValueOnce([{ id: `row-1` }]);

    await expect(service.getTimelineByDeviceId(`device-1`, 25)).resolves.toEqual([{ id: `row-1` }]);

    expect(query.findTimelineByDeviceId).toHaveBeenCalledWith(`device-1`, 25);
  });

  it(`delegates timeline by consumer lookups to the query collaborator`, async () => {
    query.findTimelineByConsumerId.mockResolvedValueOnce([{ id: `row-2` }]);

    await expect(service.getTimelineByConsumerId(`consumer-1`, 50)).resolves.toEqual([{ id: `row-2` }]);

    expect(query.findTimelineByConsumerId).toHaveBeenCalledWith(`consumer-1`, 50);
  });

  it(`returns an empty stitched timeline when no device ids are found`, async () => {
    query.findDistinctDeviceIdsByConsumerId.mockResolvedValueOnce([]);

    await expect(service.getStitchedTimelineByConsumerId(`consumer-1`, 10)).resolves.toEqual([]);

    expect(query.findDistinctDeviceIdsByConsumerId).toHaveBeenCalledWith(`consumer-1`);
    expect(query.findTimelineByDeviceIds).not.toHaveBeenCalled();
  });

  it(`delegates stitched timeline lookups through distinct device ids`, async () => {
    query.findDistinctDeviceIdsByConsumerId.mockResolvedValueOnce([`device-1`, `device-2`]);
    query.findTimelineByDeviceIds.mockResolvedValueOnce([{ id: `row-3` }]);

    await expect(service.getStitchedTimelineByConsumerId(`consumer-1`, 10)).resolves.toEqual([{ id: `row-3` }]);

    expect(query.findDistinctDeviceIdsByConsumerId).toHaveBeenCalledWith(`consumer-1`);
    expect(query.findTimelineByDeviceIds).toHaveBeenCalledWith([`device-1`, `device-2`], 10);
  });
});
