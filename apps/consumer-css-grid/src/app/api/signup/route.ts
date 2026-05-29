import { type NextRequest, NextResponse } from 'next/server';

import { CURRENT_CONSUMER_APP_SCOPE } from '@remoola/api-types';

import { encodeApiPathSegment } from '../../../lib/api-path';
import { buildAuthMutationForwardHeaders, getSetCookieValues, requireJsonBody } from '../../../lib/api-utils';
import { buildConsumerUpstreamUrl, getConsumerApiBaseUrlResponse, proxyTextRoute } from '../../../lib/bff-proxy.server';

export async function POST(req: NextRequest) {
  const bodyResult = await requireJsonBody(req);
  if (!bodyResult.ok) return bodyResult.response;

  const baseUrlResult = getConsumerApiBaseUrlResponse();
  if (!baseUrlResult.ok) return baseUrlResult.response;

  const forwardHeaders = buildAuthMutationForwardHeaders(req.headers);
  forwardHeaders.set(`content-type`, `application/json`);

  return proxyTextRoute({
    url: buildConsumerUpstreamUrl(baseUrlResult.baseUrl, `/api/consumer/auth/signup`, [
      [`appScope`, CURRENT_CONSUMER_APP_SCOPE],
    ]),
    method: `POST`,
    init: {
      headers: forwardHeaders,
      body: bodyResult.body,
      cache: `no-store`,
    },
    appendUpstreamSetCookies: true,
    buildResponse: async (signupResponse, data, responseHeaders) => {
      if (signupResponse.ok) {
        try {
          const parsed = JSON.parse(data) as { consumer?: { id?: string }; next?: string };
          const consumerId = parsed.consumer?.id?.trim();
          // Google signup already completes the handoff when `next` is returned.
          const needsEmailVerificationFollowUp = consumerId && typeof parsed.next !== `string`;
          if (needsEmailVerificationFollowUp) {
            const completionResponse = await proxyTextRoute({
              url: buildConsumerUpstreamUrl(
                baseUrlResult.baseUrl,
                `/api/consumer/auth/signup/${encodeApiPathSegment(consumerId)}/complete-profile-creation`,
                [[`appScope`, CURRENT_CONSUMER_APP_SCOPE]],
              ),
              method: `GET`,
              init: {
                headers: forwardHeaders,
                cache: `no-store`,
              },
              appendUpstreamSetCookies: true,
            }).catch((err: unknown) => {
              console.error(`[signup] complete-profile-creation network error`, err);
              return null;
            });

            if (completionResponse) {
              if (!completionResponse.ok) {
                console.error(`[signup] complete-profile-creation returned ${completionResponse.status}`);
              }
              for (const cookie of getSetCookieValues(completionResponse.headers)) {
                responseHeaders.append(`set-cookie`, cookie);
              }
            }
          }
        } catch (err) {
          console.error(`[signup] profile completion follow-up failed`, err);
        }
      }

      return new NextResponse(data, { status: signupResponse.status, headers: responseHeaders });
    },
  });
}
