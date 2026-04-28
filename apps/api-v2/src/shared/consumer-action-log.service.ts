import { Injectable, Logger } from '@nestjs/common';

import { Prisma } from '@remoola/database-2';

import { envs } from '../envs';
import { PrismaService } from './prisma.service';

type ConsumerActionLogParams = {
  deviceId: string;
  consumerId?: string | null;
  action: string;
  resource?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  correlationId?: string | null;
};

/** Allowed metadata keys for consumer action log (no PII/secrets). */
const METADATA_ALLOWLIST = new Set<string>([
  `result`,
  `reason`,
  `status`,
  `code`,
  `currency`,
  `amountMinor`,
  `paymentRequestId`,
  `conversionId`,
  `ruleId`,
  `method`,
  `path`,
]);

const CRITICAL_ACTION_PREFIXES = [
  `consumer.payments.withdraw`,
  `consumer.payments.transfer`,
  `consumer.exchange.convert`,
] as const;
const CALLBACK_FAILURE_ACTION = `consumer.auth.oauth_callback_failure`;

type BackpressureDecision = `record` | `drop` | `sampled_overflow`;
type BackpressureStats = {
  attempted: number;
  recorded: number;
  dropped: number;
  sampledOverflow: number;
};

function maskIpAddress(ipAddress: string | null | undefined): string | null {
  if (!ipAddress) return null;
  const trimmed = ipAddress.trim();
  if (!trimmed) return null;
  if (trimmed.includes(`:`)) {
    const normalized = trimmed.replace(/^\[|\]$/g, ``);
    const segments = normalized.split(`:`).filter((segment) => segment.length > 0);
    if (segments.length < 4) return `ipv6:/56`;
    return `${segments.slice(0, 4).join(`:`)}::/56`;
  }
  const ipv4Segments = trimmed.split(`.`);
  if (ipv4Segments.length === 4 && ipv4Segments.every((segment) => /^\d{1,3}$/.test(segment))) {
    return `${ipv4Segments[0]}.${ipv4Segments[1]}.${ipv4Segments[2]}.0/24`;
  }
  return null;
}

function normalizeUserAgent(userAgent: string | null | undefined): string | null {
  if (!userAgent) return null;
  const trimmed = userAgent.trim();
  if (!trimmed) return null;
  const matcher = /(Chrome|CriOS|Firefox|FxiOS|Edg|Safari)\/(\d+)/i.exec(trimmed);
  if (!matcher) return `other`;
  const familyRaw = matcher[1];
  const major = matcher[2];
  const family = familyRaw.toLowerCase();
  if (family === `crios`) return `chrome/${major}`;
  if (family === `fxios`) return `firefox/${major}`;
  if (family === `edg`) return `edge/${major}`;
  return `${family}/${major}`;
}

function sanitizeMetadata(metadata: Record<string, unknown> | null | undefined): Prisma.InputJsonValue {
  if (metadata == null || typeof metadata !== `object`) return null;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (METADATA_ALLOWLIST.has(key) && value !== undefined) {
      if (typeof value === `string` || typeof value === `number` || typeof value === `boolean`) {
        out[key] = value;
      } else if (Array.isArray(value) && value.every((v) => typeof v === `string` || typeof v === `number`)) {
        out[key] = value;
      }
    }
  }
  return Object.keys(out).length === 0 ? null : (out as Prisma.InputJsonValue);
}

/**
 * Append-only consumer action logging. Used by ConsumerActionInterceptor for decorated consumer endpoints.
 * Never throws; logs and continues on DB failure.
 */
@Injectable()
export class ConsumerActionLogService {
  private readonly logger = new Logger(ConsumerActionLogService.name);
  private currentWindowSecond = 0;
  private lowPriorityWritesInWindow = 0;
  private callbackFailureWindowSecond = 0;
  private callbackFailuresRecordedInWindow = 0;
  private callbackFailuresDroppedInWindow = 0;
  private summaryWindowStartedAtMs = Date.now();
  private stats: BackpressureStats = {
    attempted: 0,
    recorded: 0,
    dropped: 0,
    sampledOverflow: 0,
  };

  constructor(private readonly prisma: PrismaService) {}

  private isCriticalAction(action: string): boolean {
    return CRITICAL_ACTION_PREFIXES.some((prefix) => action.startsWith(prefix));
  }

  private isFailureAction(action: string): boolean {
    return action.endsWith(`_failure`);
  }

  private resetSummaryWindow(nowMs: number): void {
    this.summaryWindowStartedAtMs = nowMs;
    this.stats = {
      attempted: 0,
      recorded: 0,
      dropped: 0,
      sampledOverflow: 0,
    };
  }

  private maybeEmitBackpressureSummary(nowMs: number): void {
    const summaryWindowMs = envs.CONSUMER_ACTION_LOG_BACKPRESSURE_SUMMARY_INTERVAL_SECONDS * 1000;
    if (nowMs - this.summaryWindowStartedAtMs < summaryWindowMs) {
      return;
    }
    if (
      this.stats.dropped >= envs.CONSUMER_ACTION_LOG_BACKPRESSURE_SUMMARY_MIN_DROPPED ||
      this.stats.sampledOverflow > 0
    ) {
      this.logger.log({
        event: `consumer_action_log_backpressure_summary`,
        attempted: this.stats.attempted,
        recorded: this.stats.recorded,
        dropped: this.stats.dropped,
        sampledOverflow: this.stats.sampledOverflow,
        lowPriorityMaxPerSecond: envs.CONSUMER_ACTION_LOG_LOW_PRIORITY_MAX_PER_SECOND,
        overflowSampleRate: envs.CONSUMER_ACTION_LOG_OVERFLOW_SAMPLE_RATE,
        summaryIntervalSeconds: envs.CONSUMER_ACTION_LOG_BACKPRESSURE_SUMMARY_INTERVAL_SECONDS,
      });
    }
    this.resetSummaryWindow(nowMs);
  }

  private shouldRecordAction(action: string): BackpressureDecision {
    if (action === CALLBACK_FAILURE_ACTION && envs.CONSUMER_ACTION_LOG_CALLBACK_FAILURE_RATE_LIMIT_ENABLED) {
      const callbackWindowSecond =
        Math.floor(Date.now() / envs.CONSUMER_ACTION_LOG_CALLBACK_FAILURE_WINDOW_SECONDS) *
        envs.CONSUMER_ACTION_LOG_CALLBACK_FAILURE_WINDOW_SECONDS;
      if (callbackWindowSecond !== this.callbackFailureWindowSecond) {
        if (this.callbackFailuresDroppedInWindow > 0) {
          this.logger.warn({
            event: `consumer_action_log_callback_failure_rate_limited`,
            dropped: this.callbackFailuresDroppedInWindow,
            recorded: this.callbackFailuresRecordedInWindow,
            maxPerWindow: envs.CONSUMER_ACTION_LOG_CALLBACK_FAILURE_MAX_PER_WINDOW,
            windowSeconds: envs.CONSUMER_ACTION_LOG_CALLBACK_FAILURE_WINDOW_SECONDS,
          });
        }
        this.callbackFailureWindowSecond = callbackWindowSecond;
        this.callbackFailuresRecordedInWindow = 0;
        this.callbackFailuresDroppedInWindow = 0;
      }
      if (this.callbackFailuresRecordedInWindow >= envs.CONSUMER_ACTION_LOG_CALLBACK_FAILURE_MAX_PER_WINDOW) {
        this.callbackFailuresDroppedInWindow += 1;
        return `drop`;
      }
      this.callbackFailuresRecordedInWindow += 1;
    }

    if (!envs.CONSUMER_ACTION_LOG_BACKPRESSURE_ENABLED) return `record`;
    if (this.isFailureAction(action) || this.isCriticalAction(action)) {
      return `record`;
    }

    const currentSecond = Math.floor(Date.now() / 1000);
    if (currentSecond !== this.currentWindowSecond) {
      this.currentWindowSecond = currentSecond;
      this.lowPriorityWritesInWindow = 0;
    }

    if (this.lowPriorityWritesInWindow < envs.CONSUMER_ACTION_LOG_LOW_PRIORITY_MAX_PER_SECOND) {
      this.lowPriorityWritesInWindow += 1;
      return `record`;
    }

    if (Math.random() < envs.CONSUMER_ACTION_LOG_OVERFLOW_SAMPLE_RATE) {
      this.lowPriorityWritesInWindow += 1;
      return `sampled_overflow`;
    }

    return `drop`;
  }

  private extractErrorCode(err: unknown): string | null {
    if (typeof err !== `object` || err === null) return null;
    const maybeCode = (err as { code?: unknown }).code;
    return typeof maybeCode === `string` ? maybeCode : null;
  }

  async record(params: ConsumerActionLogParams): Promise<void> {
    const { deviceId, consumerId, action, resource, resourceId, metadata, ipAddress, userAgent, correlationId } =
      params;
    const nowMs = Date.now();
    this.stats.attempted += 1;
    const decision = this.shouldRecordAction(action);
    if (decision === `drop`) {
      this.stats.dropped += 1;
      this.maybeEmitBackpressureSummary(nowMs);
      return;
    }
    if (decision === `sampled_overflow`) {
      this.stats.sampledOverflow += 1;
    }

    try {
      await this.prisma.consumerActionLogModel.create({
        data: {
          deviceId,
          consumerId: consumerId ?? null,
          action,
          resource: resource ?? null,
          resourceId: resourceId ?? null,
          metadata: sanitizeMetadata(metadata ?? null),
          ipAddress: envs.CONSUMER_ACTION_LOG_STORE_IP_ADDRESS ? maskIpAddress(ipAddress) : null,
          userAgent: envs.CONSUMER_ACTION_LOG_STORE_USER_AGENT ? normalizeUserAgent(userAgent) : null,
          correlationId: correlationId ?? null,
        },
      });
      this.stats.recorded += 1;
    } catch (err) {
      const errorCode = this.extractErrorCode(err);
      if (errorCode === `P2024`) {
        this.logger.warn({
          event: `consumer_action_log_db_pool_saturation_signal`,
          action,
          resource: resource ?? undefined,
          errorClass: err instanceof Error ? err.name : `UnknownError`,
          errorCode,
          message: err instanceof Error ? err.message : `Unknown`,
        });
      }
      this.logger.warn({
        event: `consumer_action_log_write_failed`,
        action,
        resource: resource ?? undefined,
        errorClass: err instanceof Error ? err.name : `UnknownError`,
        message: err instanceof Error ? err.message : `Unknown`,
      });
    } finally {
      this.maybeEmitBackpressureSummary(nowMs);
    }
  }

  /** Timeline by deviceId (internal/observability). */
  async getTimelineByDeviceId(deviceId: string, limit = 100) {
    return this.prisma.consumerActionLogModel.findMany({
      where: { deviceId },
      orderBy: { createdAt: `desc` },
      take: limit,
    });
  }

  /** Timeline by consumerId (internal/observability). */
  async getTimelineByConsumerId(consumerId: string, limit = 100) {
    return this.prisma.consumerActionLogModel.findMany({
      where: { consumerId },
      orderBy: { createdAt: `desc` },
      take: limit,
    });
  }

  /** Stitched timeline: all logs for deviceIds ever seen for this consumer (internal/observability). */
  async getStitchedTimelineByConsumerId(consumerId: string, limit = 100) {
    const deviceIds = await this.prisma.consumerActionLogModel
      .findMany({
        where: { consumerId },
        select: { deviceId: true },
        distinct: [`deviceId`],
      })
      .then((rows) => rows.map((r) => r.deviceId));
    if (deviceIds.length === 0) return [];
    return this.prisma.consumerActionLogModel.findMany({
      where: { deviceId: { in: deviceIds } },
      orderBy: { createdAt: `desc` },
      take: limit,
    });
  }
}
