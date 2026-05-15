import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import express from 'express';

import { SqlValidationError } from '../../shared/prisma-raw.utils';
import { type RequestWithCorrelationId } from '../middleware/correlation-id.middleware';

@Catch(SqlValidationError)
export class SqlValidationExceptionFilter implements ExceptionFilter {
  catch(exception: SqlValidationError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<RequestWithCorrelationId>();
    const response = ctx.getResponse<express.Response>();
    const status = HttpStatus.BAD_REQUEST;

    response.status(status).json({
      statusCode: status,
      error: exception.message,
      message: exception.message,
      code: exception.code,
      details: { label: exception.label },
      correlationId: request.correlationId,
      path: request.path ?? request.url?.split(`?`)[0] ?? request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
