import { CallHandler, CustomDecorator, ExecutionContext, Injectable, NestInterceptor, SetMetadata } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ClassConstructor, plainToInstance } from 'class-transformer'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'

const DTO_CLASS_TO_TRANSFORM_RESPONSE = Symbol(`DTO_CLASS_TO_TRANSFORM_RESPONSE`)
export const TransformResponse = <T>(cls: ClassConstructor<T>): CustomDecorator<symbol> => SetMetadata(DTO_CLASS_TO_TRANSFORM_RESPONSE, cls)

@Injectable()
export class TransformResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler<any>): Observable<any> {
    return next.handle().pipe(
      map(res => {
        if (res == null) return null

        const handlerDto = this.reflector.get(DTO_CLASS_TO_TRANSFORM_RESPONSE, context.getHandler())
        const classDto = this.reflector.get(DTO_CLASS_TO_TRANSFORM_RESPONSE, context.getClass())
        const cls = handlerDto ?? classDto

        if (!cls) return res

        try {
          const opts = {
            excludeExtraneousValues: true,
            enableImplicitConversion: true,
            exposeDefaultValues: true,
            exposeUnsetFields: true,
          }
          return plainToInstance(cls, res, opts)
        } catch (error: any) {
          // Handle the transformation error (optional logging or custom error handling)
          throw new Error(`Response transformation failed: ${error.message}`)
        }
      }),
    )
  }
}
