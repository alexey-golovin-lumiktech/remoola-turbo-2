import { type NextRequest, NextResponse } from 'next/server';

import { classifyMiddlewareRequest } from './lib/auth-middleware/request-policy';
import {
  handleAuthPageSession,
  handleProtectedPageSession,
  readMiddlewareSessionState,
} from './lib/auth-middleware/session-refresh.server';
import { applyRefreshTelemetry } from './lib/auth-middleware/telemetry';

export async function middleware(req: NextRequest) {
  const policy = classifyMiddlewareRequest(req);

  if (policy.kind === `callback` || policy.kind === `logout_route`) {
    return NextResponse.next();
  }

  const sessionState = readMiddlewareSessionState(req);
  const result =
    policy.kind === `auth_page`
      ? await handleAuthPageSession(req, sessionState)
      : await handleProtectedPageSession(req, policy, sessionState);

  if (result.telemetry) {
    return applyRefreshTelemetry(result.response, result.telemetry);
  }

  return result.response;
}

export const config = { matcher: [`/((?!_next|favicon.ico|assets|api/.*).*)`] };
