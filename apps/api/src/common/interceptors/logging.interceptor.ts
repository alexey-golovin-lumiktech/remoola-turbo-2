import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { RequestWithCorrelationId } from '../middleware/correlation-id.middleware';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(`HTTP`);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<RequestWithCorrelationId>();
    const response = context.switchToHttp().getResponse();
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
        const contentLength = response.get(`Content-Length`);
        const duration = Date.now() - startTime;

        this.logger.log({
          message: `Request completed`,
          correlationId,
          method,
          url,
          statusCode,
          contentLength,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString(),
        });
      }),
    );
  }
}
