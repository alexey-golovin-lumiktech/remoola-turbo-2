import { Injectable, UnauthorizedException } from '@nestjs/common';
import { type Request as TExpressRequest } from 'express';

import { CONSUMER_APP_SCOPE_HEADER, type ConsumerAppScope } from '@remoola/api-types';

import {
  CONSUMER_API_PATH_PREFIX,
  getAccessTokenCookieKeysForPath,
  getRequestPath,
  GuardMessage,
} from './auth-guard-boundary';
import { OriginResolverService } from '../shared/origin-resolver.service';

type AuthRequestContext = {
  path: string;
  isConsumerPath: boolean;
  consumerScope?: ConsumerAppScope;
  accessToken: string;
};

@Injectable()
export class AuthRequestContextService {
  constructor(private readonly originResolver: OriginResolverService) {}

  getContext(request: TExpressRequest): AuthRequestContext {
    const path = getRequestPath(request);
    const isConsumerPath = path.startsWith(CONSUMER_API_PATH_PREFIX);
    const consumerScope = isConsumerPath
      ? this.originResolver.validateConsumerAppScopeHeader(request.headers?.[CONSUMER_APP_SCOPE_HEADER])
      : undefined;
    if (isConsumerPath && !consumerScope) {
      throw new UnauthorizedException(`Invalid app scope`);
    }
    const accessToken = getAccessTokenCookieKeysForPath(path, consumerScope)
      .map((key) => request.cookies[key])
      .find((value): value is string => typeof value === `string` && value.length > 0);
    if (!accessToken) {
      throw new UnauthorizedException(GuardMessage.INVALID_TOKEN);
    }
    return { path, isConsumerPath, consumerScope, accessToken };
  }
}
