import { Injectable, NestInterceptor, ExecutionContext, CallHandler, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClassConstructor } from 'class-transformer';
import { Request } from 'express';
import { Observable, map } from 'rxjs';

import { convertPlainToInstance, extractApiVersionFromUrl } from '../utils';

const DTO_CLASS_TO_TRANSFORM_RESPONSE = Symbol(`DTO_CLASS_TO_TRANSFORM_RESPONSE`);
export const TransformResponse = <T>(cls: ClassConstructor<T>) => {
  return SetMetadata(DTO_CLASS_TO_TRANSFORM_RESPONSE, cls);
};

@Injectable()
export class ResponseTransformInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const version = extractApiVersionFromUrl(request);
    const requestId = request.headers[`x-request-id`] ?? crypto.randomUUID();
    return next.handle().pipe(
      map((data) => {
        const response: Record<string, unknown> = {
          requestId,
          timestamp: new Date().toISOString(),
          path: request.originalUrl,
          data,
        };

        if (version) response.version = version;

        const handlerDto = this.reflector.get(DTO_CLASS_TO_TRANSFORM_RESPONSE, context.getHandler());
        const classDto = this.reflector.get(DTO_CLASS_TO_TRANSFORM_RESPONSE, context.getClass());
        if (handlerDto || classDto) {
          const cls = handlerDto ?? classDto;
          if (Array.isArray(data)) response.data = data.map((x) => convertPlainToInstance(cls, x));
          else response.data = convertPlainToInstance(cls, data);
        }

        return response;
      }),
    );
  }
}
