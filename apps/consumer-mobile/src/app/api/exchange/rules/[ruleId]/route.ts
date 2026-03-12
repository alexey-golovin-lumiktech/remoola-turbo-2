import { type NextRequest, NextResponse } from 'next/server';

import { parseRuleIdParams } from '../../../../../features/exchange/schemas';
import { appendSetCookies, requireJsonBody, buildForwardHeaders } from '../../../../../lib/api-utils';
import { getEnv } from '../../../../../lib/env.server';

async function proxyRule(ruleId: string, req: NextRequest, method: string, body?: string) {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    return NextResponse.json({ message: `API base URL not configured`, code: `CONFIG_ERROR` }, { status: 503 });
  }
  const url = new URL(`${baseUrl}/consumer/exchange/rules/${ruleId}`);
  const res = await fetch(url, {
    method,
    headers: buildForwardHeaders(req.headers),
    credentials: `include`,
    cache: `no-store`,
    ...(body !== undefined && { body }),
  });
  const data = await res.text();
  const responseHeaders = new Headers();
  appendSetCookies(responseHeaders, res.headers);
  return new NextResponse(data, { status: res.status, headers: responseHeaders });
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ ruleId: string }> }) {
  const raw = await context.params;
  const parsed = parseRuleIdParams(raw);
  if (`error` in parsed) {
    return NextResponse.json({ code: `VALIDATION_ERROR`, message: parsed.error }, { status: 400 });
  }
  const bodyResult = await requireJsonBody(req);
  if (!bodyResult.ok) return bodyResult.response;
  return proxyRule(parsed.ruleId, req, `PATCH`, bodyResult.body);
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ ruleId: string }> }) {
  const raw = await context.params;
  const parsed = parseRuleIdParams(raw);
  if (`error` in parsed) {
    return NextResponse.json({ code: `VALIDATION_ERROR`, message: parsed.error }, { status: 400 });
  }
  return proxyRule(parsed.ruleId, req, `DELETE`);
}
