import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { CONSUMER_ROLES_KEY } from './consumer-roles.decorator';

@Injectable()
export class ConsumerRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<string[]>(CONSUMER_ROLES_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (!required || required.length == 0) return true;

    const req = ctx.switchToHttp().getRequest<any>();
    const user = req.user as { role?: string };

    return !!user && required.includes(user.role!);
  }
}
