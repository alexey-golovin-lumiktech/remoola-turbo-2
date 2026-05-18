import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';

export const RESPONSE_CONTRACT_METADATA = Symbol(`RESPONSE_CONTRACT_METADATA`);

export type ResponseContractMetadata =
  | { kind: `dto`; description?: string }
  | { kind: `plain-object`; description: string };

export function PlainObjectResponseContract(description: string): ClassDecorator & MethodDecorator {
  return applyDecorators(
    SetMetadata(RESPONSE_CONTRACT_METADATA, { kind: `plain-object`, description } satisfies ResponseContractMetadata),
    ApiOkResponse({ description }),
  );
}
