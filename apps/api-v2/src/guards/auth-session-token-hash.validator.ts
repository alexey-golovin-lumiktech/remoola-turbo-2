import { type Logger, UnauthorizedException } from '@nestjs/common';

import { oauthCrypto } from '@remoola/security-utils';

import { GuardMessage } from './auth-guard-boundary';
import { secureCompare } from '../shared-common';

type SessionTokenHashCandidate = {
  accessTokenHash: string;
  expiresAt: Date;
};

export function validateSessionTokenHash<TSession extends SessionTokenHashCandidate>(params: {
  logger: Logger;
  session: TSession | null;
  accessToken: string;
  logPrefix: string;
}): TSession {
  const { logger, session, accessToken, logPrefix } = params;
  if (session == null || session.expiresAt < new Date()) {
    logger.warn(`AuthGuard: ${logPrefix} session not found or expired`);
    throw new UnauthorizedException(GuardMessage.NO_IDENTITY_RECORD);
  }
  if (!secureCompare(session.accessTokenHash, oauthCrypto.hashOAuthState(accessToken))) {
    logger.warn(`AuthGuard: ${logPrefix} access token mismatch with stored value`);
    throw new UnauthorizedException(GuardMessage.INVALID_TOKEN);
  }
  return session;
}
