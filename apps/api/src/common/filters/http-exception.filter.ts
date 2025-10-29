import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

import { parsedEnvs } from '@remoola/env';

import { extractApiVersionFromUrl } from '../utils';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const version = extractApiVersionFromUrl(request);
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorResponse: Record<string, any>;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      // Normalize NestJS error response structure
      if (typeof res === `string`) {
        errorResponse = { message: res };
      } else {
        errorResponse = res as Record<string, any>;
      }
    } else {
      // Handle non-HttpExceptions (e.g., runtime errors)
      errorResponse = {
        message: (exception as any)?.message || `Internal Server Error`,
        stack: parsedEnvs.NODE_ENV !== `production` ? (exception as any)?.stack : undefined,
      };
    }
    const requestId = request.headers[`x-request-id`] ?? crypto.randomUUID();
    response.status(status).json({
      version: version?.toString() ?? `neutral`,
      error: {
        requestId,
        statusCode: status,
        path: request.originalUrl,
        method: request.method,
        timestamp: new Date().toISOString(),
        ...errorResponse,
      },
    });
  }
}
