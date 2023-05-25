import {
  CallHandler,
  CustomDecorator,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  NestInterceptor,
  SetMetadata,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ClassConstructor, plainToInstance } from 'class-transformer'
import { Observable, throwError } from 'rxjs'
import { catchError, map } from 'rxjs/operators'

const DTO_CLASS_TO_TRANSFORM_RESPONSE = Symbol(`DTO_CLASS_TO_TRANSFORM_RESPONSE`)
export const TransformResponse = <T>(cls: ClassConstructor<T>): CustomDecorator<symbol> => SetMetadata(DTO_CLASS_TO_TRANSFORM_RESPONSE, cls)

@Injectable()
export class TransformResponseInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler<any>): Observable<any> | Promise<Observable<any>> {
    return next.handle().pipe(
      map(res => {
        const handlerDto = this.reflector.get(DTO_CLASS_TO_TRANSFORM_RESPONSE, context.getHandler())
        const classDto = this.reflector.get(DTO_CLASS_TO_TRANSFORM_RESPONSE, context.getClass())
        if (!handlerDto && !classDto) return res

        const cls = handlerDto ?? classDto
        const opts = { excludeExtraneousValues: true, enableImplicitConversion: true, exposeDefaultValues: true, exposeUnsetFields: true }
        return plainToInstance(cls, res, opts)
      }),
      catchError(err => {
        console.log(`err`, err)
        return throwError(() => new InternalServerErrorException(err.message ?? `[TransformResponseInterceptor] Internal server error`))
      }),
    )
  }
}
