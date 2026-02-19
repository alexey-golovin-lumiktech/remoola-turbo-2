import {
  CallHandler,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  NestInterceptor,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { map } from 'rxjs/operators';

const DTO_CLASS_TO_TRANSFORM_RESPONSE = Symbol(`DTO_CLASS_TO_TRANSFORM_RESPONSE`);
export const TransformResponse = <T>(cls: ClassConstructor<T>) => SetMetadata(DTO_CLASS_TO_TRANSFORM_RESPONSE, cls);

@Injectable()
export class TransformResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler<any>) {
    return next.handle().pipe(
      map((res) => {
        if (res == null) return null;

        const handlerDto = this.reflector.get(DTO_CLASS_TO_TRANSFORM_RESPONSE, context.getHandler());
        const classDto = this.reflector.get(DTO_CLASS_TO_TRANSFORM_RESPONSE, context.getClass());
        const cls = handlerDto ?? classDto;

        if (!cls) return res;

        try {
          const opts = {
            excludeExtraneousValues: true,
            enableImplicitConversion: true,
            exposeDefaultValues: true,
            exposeUnsetFields: true,
          };
          let result;
          if (Array.isArray(res)) result = res.map((item) => plainToInstance(cls, item, opts));
          else result = plainToInstance(cls, res, opts);

          return result;
        } catch {
          throw new InternalServerErrorException(`Response transformation failed`);
        }
      }),
    );
  }
}
