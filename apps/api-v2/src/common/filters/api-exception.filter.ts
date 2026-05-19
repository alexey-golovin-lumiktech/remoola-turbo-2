import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import express from 'express';

import { Prisma } from '@remoola/database-2';

import { extractPrismaValidationDetails, mapPrismaKnownError } from './utils';
import { envs } from '../../envs';
import { SqlValidationError } from '../../shared/prisma-raw.utils';
import { type RequestWithCorrelationId } from '../middleware/correlation-id.middleware';

type ApiErrorPayload = {
  statusCode: number;
  error: string;
  message: string | string[];
  code?: string;
  details?: unknown;
  correlationId?: string;
  path?: string;
  timestamp: string;
};

type ClassifiedApiError = {
  payload: ApiErrorPayload;
  unhandled: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === `object` && value !== null;
}

function responsePath(request: RequestWithCorrelationId): string | undefined {
  return request.path ?? request.url?.split(`?`)[0] ?? request.url;
}

function buildHttpExceptionPayload(exception: HttpException, request: RequestWithCorrelationId): ApiErrorPayload {
  const status = exception.getStatus();
  const response = exception.getResponse();

  if (isRecord(response)) {
    const message = response.message;
    const error = response.error;
    const code = response.code;
    const details = response.details;

    return {
      statusCode: status,
      error: typeof error === `string` ? error : exception.name,
      message: typeof message === `string` || Array.isArray(message) ? message : exception.message,
      ...(typeof code === `string` ? { code } : {}),
      ...(details !== undefined ? { details } : {}),
      correlationId: request.correlationId,
      path: responsePath(request),
      timestamp: new Date().toISOString(),
    };
  }

  const message = typeof response === `string` ? response : exception.message;
  return {
    statusCode: status,
    error: exception.name,
    message,
    correlationId: request.correlationId,
    path: responsePath(request),
    timestamp: new Date().toISOString(),
  };
}

function buildPrismaValidationPayload(
  exception: Prisma.PrismaClientValidationError,
  request: RequestWithCorrelationId,
): ApiErrorPayload {
  const message =
    envs.NODE_ENV === envs.ENVIRONMENT.PRODUCTION ? `Invalid request data` : extractPrismaValidationDetails(exception);

  return {
    statusCode: HttpStatus.BAD_REQUEST,
    error: message,
    message,
    code: `PRISMA_VALIDATION_ERROR`,
    correlationId: request.correlationId,
    path: responsePath(request),
    timestamp: new Date().toISOString(),
  };
}

function buildPrismaKnownPayload(
  exception: Prisma.PrismaClientKnownRequestError,
  request: RequestWithCorrelationId,
): ApiErrorPayload {
  const known = mapPrismaKnownError(exception);

  return {
    statusCode: known.status,
    error: known.message,
    message: known.message,
    code: exception.code,
    ...(known.details !== undefined ? { details: known.details } : {}),
    correlationId: request.correlationId,
    path: responsePath(request),
    timestamp: new Date().toISOString(),
  };
}

function buildSqlValidationPayload(exception: SqlValidationError, request: RequestWithCorrelationId): ApiErrorPayload {
  return {
    statusCode: HttpStatus.BAD_REQUEST,
    error: exception.message,
    message: exception.message,
    code: exception.code,
    details: { label: exception.label },
    correlationId: request.correlationId,
    path: responsePath(request),
    timestamp: new Date().toISOString(),
  };
}

function buildUnhandledPayload(request: RequestWithCorrelationId): ApiErrorPayload {
  return {
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    error: `InternalServerError`,
    message: `Internal server error`,
    correlationId: request.correlationId,
    path: responsePath(request),
    timestamp: new Date().toISOString(),
  };
}

function classifyException(exception: unknown, request: RequestWithCorrelationId): ClassifiedApiError {
  if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    return { payload: buildPrismaKnownPayload(exception, request), unhandled: false };
  }
  if (exception instanceof Prisma.PrismaClientValidationError) {
    return { payload: buildPrismaValidationPayload(exception, request), unhandled: false };
  }
  if (exception instanceof SqlValidationError) {
    return { payload: buildSqlValidationPayload(exception, request), unhandled: false };
  }
  if (exception instanceof HttpException) {
    return { payload: buildHttpExceptionPayload(exception, request), unhandled: false };
  }

  return { payload: buildUnhandledPayload(request), unhandled: true };
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<RequestWithCorrelationId>();
    const response = ctx.getResponse<express.Response>();

    const { payload, unhandled } = classifyException(exception, request);
    if (unhandled) {
      this.logger.error({
        event: `api_unhandled_exception`,
        correlationId: request.correlationId,
        path: responsePath(request),
        errorName: exception instanceof Error ? exception.name : typeof exception,
        errorMessage: exception instanceof Error ? exception.message : String(exception),
        ...(exception instanceof Error && exception.stack ? { stack: exception.stack } : {}),
      });
    }

    response.status(payload.statusCode).json(payload);
  }
}
