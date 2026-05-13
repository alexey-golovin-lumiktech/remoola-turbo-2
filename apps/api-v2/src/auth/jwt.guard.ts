import { type CanActivate, type ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

import { IDENTITY } from '../common';

const UNAUTHORIZED_MESSAGE = `Invalid or expired token`;

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Record<string | symbol, unknown>>();
    if (!request[IDENTITY]) {
      throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
    }
    return true;
  }
}
