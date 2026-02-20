import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

const UNAUTHORIZED_MESSAGE = `Invalid or expired token`;

@Injectable()
export class JwtAuthGuard extends AuthGuard(`jwt`) {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest<TUser>(_err: unknown, user: TUser): TUser {
    if (!user) {
      throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
    }
    return user;
  }
}
