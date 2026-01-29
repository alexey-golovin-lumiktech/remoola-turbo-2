import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import { type ConsumerModel, type AdminModel } from '@remoola/database-2';

export const IDENTITY = Symbol(`IDENTITY`);
export const Identity = createParamDecorator((_, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest();
  return request[IDENTITY];
});
export type IIdentity = ConsumerModel | AdminModel;
