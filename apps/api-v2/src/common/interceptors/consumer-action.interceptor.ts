import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { ConsumerActionLogService } from '../../shared/consumer-action-log.service';
import { IDENTITY, type IIdentityContext } from '../decorators/identity.decorator';
import { TRACK_CONSUMER_ACTION, type TrackConsumerActionOptions } from '../decorators/track-consumer-action.decorator';
import { type RequestWithCorrelationId } from '../middleware/correlation-id.middleware';
import { type RequestWithDeviceId } from '../middleware/device-id.middleware';

type RequestWithConsumerContext = RequestWithCorrelationId &
  RequestWithDeviceId & {
    [IDENTITY]?: IIdentityContext;
    route?: { path?: string };
  };

const CONSUMER_API_PATH_PREFIX = `/api/consumer`;
const ALLOWED_CONSUMER_ACTION_LOG_ERROR_CODES = new Set([`P1001`, `P1002`, `P2024`, `P2034`]);

function isConsumerApiPath(path: string | undefined): boolean {
  if (!path) return false;
  return path === CONSUMER_API_PATH_PREFIX || path.startsWith(`${CONSUMER_API_PATH_PREFIX}/`);
}

function normalizePathForMetadata(path: string | undefined): string {
  if (!path) return `/`;
  const withoutQuery = path.split(`?`)[0] ?? ``;
  const withLeadingSlash = withoutQuery.startsWith(`/`) ? withoutQuery : `/${withoutQuery}`;
  const collapsedSlashes = withLeadingSlash.replace(/\/{2,}/g, `/`);
  return collapsedSlashes.length > 0 ? collapsedSlashes : `/`;
}

function getAllowlistedErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== `object` || !(`code` in error)) return undefined;
  const code = (error as { code?: unknown }).code;
  if (typeof code !== `string` || !ALLOWED_CONSUMER_ACTION_LOG_ERROR_CODES.has(code)) return undefined;
  return code;
}

function getErrorName(error: unknown): string {
  return error instanceof Error ? error.name : typeof error;
}

@Injectable()
export class ConsumerActionInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ConsumerActionInterceptor.name);

  constructor(
    private readonly consumerActionLog: ConsumerActionLogService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithConsumerContext>();
    if (!isConsumerApiPath(request.path)) {
      return next.handle();
    }
    const options = this.reflector.get<TrackConsumerActionOptions | undefined>(
      TRACK_CONSUMER_ACTION,
      context.getHandler(),
    );

    if (!options) {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: () => this.recordSuccess(request, options),
        error: () => this.recordFailure(request, options),
      }),
    );
  }

  private getConsumerId(request: RequestWithConsumerContext): string | null {
    const identity = request[IDENTITY];
    if (!identity || identity.type !== `consumer`) return null;
    return identity.id ?? null;
  }

  private recordSuccess(request: RequestWithConsumerContext, options: TrackConsumerActionOptions): void {
    const action = options.result ? `${options.action}_${options.result}` : `${options.action}_success`;
    this.record(request, options, action);
  }

  private recordFailure(request: RequestWithConsumerContext, options: TrackConsumerActionOptions): void {
    const action = `${options.action}_failure`;
    this.record(request, options, action);
  }

  private record(request: RequestWithConsumerContext, options: TrackConsumerActionOptions, action: string): void {
    const deviceId = request.deviceId;
    if (!deviceId) return;

    const ipAddress =
      (typeof request.ip === `string` ? request.ip : null) ??
      (Array.isArray(request.headers[`x-forwarded-for`])
        ? request.headers[`x-forwarded-for`][0]
        : ((request.headers[`x-forwarded-for`] as string) ?? null));
    const userAgent = (request.headers[`user-agent`] as string) ?? null;
    const correlationId = request.correlationId ?? null;
    const method = request.method ?? ``;
    const routePath = typeof request.route?.path === `string` ? request.route.path : undefined;
    const path = routePath ? normalizePathForMetadata(routePath) : `/api/consumer/:unknown`;

    void this.consumerActionLog
      .record({
        deviceId,
        consumerId: this.getConsumerId(request),
        action,
        resource: options.resource ?? null,
        resourceId: null,
        metadata: { method, path },
        ipAddress,
        userAgent,
        correlationId,
      })
      .catch((error: unknown) => {
        this.logger.warn({
          event: `consumer_action_log_record_failed`,
          action,
          path,
          correlationId,
          errorName: getErrorName(error),
          errorCode: getAllowlistedErrorCode(error),
        });
      });
  }
}
