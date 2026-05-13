import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus } from '@nestjs/common';
import express from 'express';

import { Prisma } from '@remoola/database-2';

import { extractPrismaValidationDetails, mapPrismaKnownError } from './utils';
import { type RequestWithCorrelationId } from '../middleware/correlation-id.middleware';

@Catch(Prisma.PrismaClientKnownRequestError, Prisma.PrismaClientValidationError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError | Prisma.PrismaClientValidationError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<RequestWithCorrelationId>();
    const response = ctx.getResponse<express.Response>();

    let status = HttpStatus.BAD_REQUEST;
    let message = `Database error`;
    let details: string | string[] | undefined;
    let code = `PRISMA_VALIDATION_ERROR`;

    if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      // In production, keep validation errors generic to avoid exposing query/schema internals.
      message =
        process.env.NODE_ENV === `production` ? `Invalid request data` : extractPrismaValidationDetails(exception);
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const known = mapPrismaKnownError(exception);
      status = known.status;
      message = known.message;
      details = known.details;
      code = exception.code;
    }

    response.status(status).json({
      statusCode: status,
      error: message,
      message,
      code,
      details,
      correlationId: request.correlationId,
      path: request.path ?? request.url?.split(`?`)[0] ?? request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
