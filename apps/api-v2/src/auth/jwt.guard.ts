import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { isAdminApiPath } from '@remoola/api-types';

import { IDENTITY, type IIdentityContext } from '../common';

const UNAUTHORIZED_MESSAGE = `Invalid or expired token`;

@Injectable()
export class JwtAuthGuard extends AuthGuard(`jwt`) {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const result = await (super.canActivate(context) as Promise<boolean>);
    // The global AuthGuard sets request[IDENTITY] with the full DB-backed context.
    // Only fall back to the minimal JWT payload (request.user) if the global guard
    // did not run (e.g. route is @PublicEndpoint but still carries @UseGuards(JwtAuthGuard)).
    // We must include `type` so that admin.type authorization checks never see undefined.
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
