import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import { type ConsumerModel, type AdminModel } from '@remoola/database-2';

export const IDENTITY = Symbol(`IDENTITY`);

/**
 * The shape stored in request[IDENTITY] by AuthGuard.assignRequestIdentity.
 * Only safe non-sensitive fields are copied from the full Prisma model.
 * Use this type for @Identity() parameters in controllers instead of
 * the raw Prisma model types to avoid silent undefined field access.
 */
export type IIdentityContext = { id: string; email: string; type: string };

export const Identity = createParamDecorator((_, context: ExecutionContext): IIdentityContext => {
  const request = context.switchToHttp().getRequest();
  return request[IDENTITY];
});

/** Full Prisma model — used as the input to assignRequestIdentity, NOT stored in request[IDENTITY]. */
export type IIdentity = ConsumerModel | AdminModel;
