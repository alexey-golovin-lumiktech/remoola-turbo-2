import { type NextRequest } from 'next/server';

import { contactParamsSchema } from '../../../../../features/contacts/schemas';
import { appendSetCookies, buildForwardHeaders } from '../../../../../lib/api-utils';
import { getEnv } from '../../../../../lib/env.server';

export async function GET(req: NextRequest, context: { params: Promise<{ contactId: string }> }) {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  const parsed = contactParamsSchema.safeParse(await context.params);
  if (!parsed.success) {
    return Response.json({ code: `VALIDATION_ERROR`, message: `Invalid route params` }, { status: 400 });
  }
  const { contactId } = parsed.data;
  if (!baseUrl) {
    return Response.json({ message: `API base URL not configured`, code: `CONFIG_ERROR` }, { status: 503 });
  }
  const url = new URL(`${baseUrl}/consumer/contacts/${contactId}/details`);
  const res = await fetch(url, {
    method: `GET`,
    headers: buildForwardHeaders(req.headers),
    credentials: `include`,
    cache: `no-store`,
  });
  const data = await res.text();
  const responseHeaders = new Headers();
  appendSetCookies(responseHeaders, res.headers);
  return new Response(data, { status: res.status, headers: responseHeaders });
}
