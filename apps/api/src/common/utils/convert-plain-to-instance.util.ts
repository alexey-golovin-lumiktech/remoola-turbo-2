import { type ValidationPipeOptions } from '@nestjs/common';
import { plainToInstance, type ClassConstructor } from 'class-transformer';

export const convertPlainToInstance = <ClassDTO>(classDTO: ClassConstructor<ClassDTO>, raw: unknown) => {
  const transformOptions = {
    excludeExtraneousValues: true,
    enableImplicitConversion: true,
    exposeDefaultValues: true,
    exposeUnsetFields: true,
  } satisfies ValidationPipeOptions[`transformOptions`];

  return plainToInstance(classDTO, raw, transformOptions);
};
