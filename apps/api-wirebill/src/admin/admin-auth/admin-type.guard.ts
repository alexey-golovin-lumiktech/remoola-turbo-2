import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ADMIN_TYPE_METADATA_KEY } from './admin-type.decorator';

@Injectable()
export class AdminTypeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext) {
    console.log(`\n************************************`);
    console.log(`AdminTypeGuard`);
    console.log(`************************************\n`);
    const targets = [ctx.getHandler(), ctx.getClass()];
    const required = this.reflector.getAllAndOverride<string[]>(ADMIN_TYPE_METADATA_KEY, targets);
    if (!required || required.length == 0) return true;

    const req = ctx.switchToHttp().getRequest<any>();
    console.log(`\n************************************`);
    console.log(`req.user`, req.user);
    console.log(`************************************\n`);

    const admin = req.user as { type?: string };

    return !!admin && required.includes(admin.type!);
  }
}
