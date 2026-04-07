import { type NextRequest, NextResponse } from 'next/server';

import { appendSetCookies, buildAuthMutationForwardHeaders, requireJsonBody } from '../../../lib/api-utils';
import { getEnv } from '../../../lib/env.server';

const APP_SCOPE = `consumer-css-grid`;

export async function POST(req: NextRequest) {
  const bodyResult = await requireJsonBody(req);
  if (!bodyResult.ok) return bodyResult.response;

  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    return NextResponse.json({ message: `API base URL not configured`, code: `CONFIG_ERROR` }, { status: 503 });
  }

  const url = new URL(`${baseUrl}/consumer/auth/signup`);
  url.searchParams.set(`appScope`, APP_SCOPE);
  const forwardHeaders = buildAuthMutationForwardHeaders(req.headers);
  forwardHeaders.set(`content-type`, `application/json`);

  const res = await fetch(url, {
    method: `POST`,
    headers: forwardHeaders,
    body: bodyResult.body,
    cache: `no-store`,
  });

  const data = await res.text();
  const responseHeaders = new Headers();
  appendSetCookies(responseHeaders, res.headers);

  if (res.ok) {
    try {
      const parsed = JSON.parse(data) as { consumer?: { id?: string }; next?: string };
      const consumerId = parsed.consumer?.id?.trim();
      // Google signup establishes a session in api-v2 and returns `next`; only classic signup needs
      // complete-profile-creation (verification email). Calling it for Google would duplicate follow-up email.
      const needsEmailVerificationFollowUp = consumerId && typeof parsed.next !== `string`;
      if (needsEmailVerificationFollowUp) {
        const completionRes = await fetch(
          `${baseUrl}/consumer/auth/signup/${consumerId}/complete-profile-creation?appScope=${encodeURIComponent(APP_SCOPE)}`,
          {
            method: `GET`,
            headers: forwardHeaders,
            cache: `no-store`,
          },
        ).catch(() => null);

        if (completionRes) {
          appendSetCookies(responseHeaders, completionRes.headers);
        }
      }
    } catch {
      // Best-effort follow-up: signup already succeeded, so cookie passthrough remains the only required behavior.
    }
  }

  return new NextResponse(data, { status: res.status, headers: responseHeaders });
}
