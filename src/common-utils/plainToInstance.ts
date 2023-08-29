import { ClassConstructor, plainToInstance as libPlainToInstance } from 'class-transformer'

export const convertPlainToClassInstance = <T, V>(cls: ClassConstructor<T>, plain: V) => {
  const opts = { excludeExtraneousValues: true, enableImplicitConversion: true, exposeDefaultValues: true, exposeUnsetFields: true }
  return libPlainToInstance(cls, plain, opts) as T
}
