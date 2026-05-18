import { Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiParam } from '@nestjs/swagger';

export function UuidParam(name = `id`): ParameterDecorator {
  return Param(name, new ParseUUIDPipe({ version: `4` }));
}

export function ApiUuidParam(name = `id`, description?: string): MethodDecorator & ClassDecorator {
  return ApiParam({
    name,
    format: `uuid`,
    description: description ?? `${name} id`,
  });
}
