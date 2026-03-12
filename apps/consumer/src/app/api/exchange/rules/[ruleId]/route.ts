import { type NextRequest, NextResponse } from 'next/server';

import { appendSetCookies, buildForwardHeaders, requireJsonBody } from '../../../../../lib/api-utils';

function getValidRuleId(params: { ruleId: string }): string | null {
  const ruleId = params.ruleId?.trim();
  return ruleId.length > 0 ? ruleId : null;
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ ruleId: string }> }) {
  const bodyResult = await requireJsonBody(req);
  if (!bodyResult.ok) return bodyResult.response;
  const ruleId = getValidRuleId(await context.params);
  if (!ruleId) {
    return NextResponse.json({ code: `VALIDATION_ERROR`, message: `Invalid route params` }, { status: 400 });
  }
  const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/consumer/exchange/rules/${ruleId}`);

  const res = await fetch(url, {
    method: `PATCH`,
    headers: buildForwardHeaders(req.headers),
    credentials: `include`,
    cache: `no-store`,
    body: bodyResult.body,
  });

  const data = await res.text();
  const responseHeaders = new Headers();
  appendSetCookies(responseHeaders, res.headers);
  return new NextResponse(data, { status: res.status, headers: responseHeaders });
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ ruleId: string }> }) {
  const ruleId = getValidRuleId(await context.params);
  if (!ruleId) {
    return NextResponse.json({ code: `VALIDATION_ERROR`, message: `Invalid route params` }, { status: 400 });
  }
  const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/consumer/exchange/rules/${ruleId}`);

  const res = await fetch(url, {
    method: `DELETE`,
    headers: buildForwardHeaders(req.headers),
    credentials: `include`,
    cache: `no-store`,
  });

  const data = await res.text();
  const responseHeaders = new Headers();
  appendSetCookies(responseHeaders, res.headers);
  return new NextResponse(data, { status: res.status, headers: responseHeaders });
}
