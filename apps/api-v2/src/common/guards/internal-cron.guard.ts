import { timingSafeEqual } from 'node:crypto';

import { type CanActivate, type ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { type Request } from 'express';

import { envs } from '../../envs';

const BEARER_PREFIX = `Bearer `;

function constantTimeEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function isValidInternalCronAuthorization(authorization: string | undefined): boolean {
  if (!authorization?.startsWith(BEARER_PREFIX)) {
    return false;
  }

  return constantTimeEquals(authorization.slice(BEARER_PREFIX.length), envs.CRON_SECRET);
}

export function assertInternalCronAuthorization(authorization: string | undefined): void {
  if (!isValidInternalCronAuthorization(authorization)) {
    throw new ForbiddenException(`Invalid job authorization`);
  }
}

@Injectable()
export class InternalCronGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const authorizationHeader = request.headers.authorization;
    const authorization = Array.isArray(authorizationHeader) ? authorizationHeader[0] : authorizationHeader;

    assertInternalCronAuthorization(authorization);
    return true;
  }
}
