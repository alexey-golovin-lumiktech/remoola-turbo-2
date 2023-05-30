import { ClassConstructor, plainToInstance as classTransformerPlainToInstance } from 'class-transformer'

export const plainToInstance = <T, V>(cls: ClassConstructor<T>, plain: V) => {
  const opts = { excludeExtraneousValues: true, enableImplicitConversion: true, exposeDefaultValues: true, exposeUnsetFields: true }
  return classTransformerPlainToInstance(cls, plain, opts) as T
}
