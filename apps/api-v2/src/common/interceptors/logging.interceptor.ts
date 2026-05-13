import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { Prisma } from '@remoola/database-2';
import { adminErrorCodes, errorCodes } from '@remoola/shared-constants';

import { mapPrismaKnownError } from '../filters/utils/mapPrismaKnownError';
import { RequestWithCorrelationId } from '../middleware/correlation-id.middleware';

const SAFE_ERROR_CODES = new Set<string>([...Object.values(errorCodes), ...Object.values(adminErrorCodes)]);

function getErrorStatus(error: unknown): number {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return mapPrismaKnownError(error).status;
  }
  if (error instanceof Prisma.PrismaClientValidationError) {
    return 400;
  }

  if (typeof error === `object` && error !== null && `getStatus` in error) {
    const getStatus = (error as { getStatus?: unknown }).getStatus;
    if (typeof getStatus === `function`) {
      const status = getStatus.call(error);
      if (typeof status === `number`) return status;
    }
  }
  return 500;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === `object` && value !== null;
}

function getExceptionResponse(error: unknown): unknown {
  if (!isRecord(error)) return undefined;

  const getResponse = error.getResponse;
  if (typeof getResponse !== `function`) return undefined;

  return getResponse.call(error);
}

function getSafeErrorCode(error: unknown): string | undefined {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code;
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return `PRISMA_VALIDATION_ERROR`;
  }

  const response = getExceptionResponse(error);
  if (!isRecord(response)) return undefined;

  const code = response.code;
  if (typeof code === `string` && SAFE_ERROR_CODES.has(code)) return code;

  const message = response.message;
  if (typeof message === `string` && SAFE_ERROR_CODES.has(message)) return message;

  return undefined;
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(`HTTP`);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithCorrelationId>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, correlationId } = request;
    const path = request.path ?? request.url?.split(`?`)[0] ?? request.url ?? ``;
    const userAgent = request.get(`User-Agent`) || ``;
    const startTime = Date.now();

    this.logger.log({
      event: `http_request_started`,
      message: `Request started`,
      correlationId,
      method,
      path,
      userAgent,
      timestamp: new Date().toISOString(),
    });

    return next.handle().pipe(
      tap({
        next: () => {
          const { statusCode } = response;
          const duration = Date.now() - startTime;

          this.logger.log({
            event: `http_request_completed`,
            message: `Request completed`,
            correlationId,
            method,
            path,
            statusCode,
            durationMs: duration,
            timestamp: new Date().toISOString(),
          });
        },
        error: (error: unknown) => {
          const statusCode = getErrorStatus(error);
          const duration = Date.now() - startTime;
          const errorCode = getSafeErrorCode(error);
          const payload = {
            event: `http_request_failed`,
            message: `Request failed`,
            correlationId,
            method,
            path,
            statusCode,
            durationMs: duration,
            errorName: error instanceof Error ? error.name : `UnknownError`,
            ...(errorCode ? { errorCode } : {}),
            timestamp: new Date().toISOString(),
          };

          if (statusCode >= 500) {
            this.logger.error(payload);
            return;
          }

          this.logger.warn(payload);
        },
      }),
    );
  }
}
