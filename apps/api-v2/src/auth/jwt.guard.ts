import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { isAdminApiPath } from '@remoola/api-types';

import { IDENTITY, type IIdentityContext } from '../common';

const UNAUTHORIZED_MESSAGE = `Invalid or expired token`;

@Injectable()
export class JwtAuthGuard extends AuthGuard(`jwt`) {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const result = await (super.canActivate(context) as Promise<boolean>);
    const request = context.switchToHttp().getRequest<Record<string | symbol, unknown>>();
    if (!request[IDENTITY] && request[`user`]) {
      const user = request[`user`] as { id?: string; email?: string };
      const path = (request[`path`] as string | undefined) ?? ``;
      const type = isAdminApiPath(path) ? `admin` : `consumer`;
      const ctx: IIdentityContext = { id: user.id ?? ``, email: user.email ?? ``, type };
      request[IDENTITY] = ctx;
    }
    return result;
  }

  handleRequest<TUser>(err: unknown, user: TUser): TUser {
    if (err || !user) {
      throw err instanceof UnauthorizedException ? err : new UnauthorizedException(UNAUTHORIZED_MESSAGE);
    }
    return user;
  }
}
