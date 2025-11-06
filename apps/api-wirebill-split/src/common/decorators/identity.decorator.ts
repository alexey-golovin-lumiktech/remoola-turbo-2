import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import { type IConsumerModel, type IAdminModel } from '@remoola/database';

export const IDENTITY = Symbol(`IDENTITY`);
export const Identity = createParamDecorator((_, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest();
  return request[IDENTITY];
});
export type IIdentity = IConsumerModel | IAdminModel;
