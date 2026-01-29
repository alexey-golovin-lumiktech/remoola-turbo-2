import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { RequestWithCorrelationId } from '../middleware/correlation-id.middleware';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(`HTTP`);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<RequestWithCorrelationId>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url, correlationId } = request;
    const userAgent = request.get(`User-Agent`) || ``;
    const startTime = Date.now();

    this.logger.log({
      message: `Request started`,
      correlationId,
      method,
      url,
      userAgent,
      timestamp: new Date().toISOString(),
    });

    return next.handle().pipe(
      tap(() => {
        const { statusCode } = response;
        const duration = Date.now() - startTime;

        this.logger.log({
          message: `Request completed`,
          correlationId,
          method,
          url,
          statusCode,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString(),
        });
      }),
    );
  }
}
