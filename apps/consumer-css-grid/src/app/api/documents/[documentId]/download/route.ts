import { type NextRequest, NextResponse } from 'next/server';

import { appendSetCookies, buildForwardHeaders } from '../../../../../lib/api-utils';
import { getEnv } from '../../../../../lib/env.server';

const RESPONSE_HEADER_ALLOWLIST = new Set([`cache-control`, `content-disposition`, `content-length`, `content-type`]);

async function readDocumentId(context: {
  params: Promise<{ documentId: string }> | { documentId: string };
}): Promise<string> {
  const params = await context.params;
  return params.documentId?.trim() ?? ``;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ documentId: string }> | { documentId: string } },
) {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    return NextResponse.json({ message: `API base URL not configured`, code: `CONFIG_ERROR` }, { status: 503 });
  }

  const documentId = await readDocumentId(context);
  if (!documentId) {
    return NextResponse.json({ message: `Document id is required`, code: `VALIDATION_ERROR` }, { status: 400 });
  }

  const forwardHeaders = buildForwardHeaders(req.headers);
  forwardHeaders.delete(`host`);

  const url = new URL(`${baseUrl}/consumer/documents/${encodeURIComponent(documentId)}/download`);
  const res = await fetch(url, {
    method: `GET`,
    headers: forwardHeaders,
    cache: `no-store`,
  });

  const responseHeaders = new Headers();
  appendSetCookies(responseHeaders, res.headers);
  for (const [name, value] of res.headers.entries()) {
    if (RESPONSE_HEADER_ALLOWLIST.has(name.toLowerCase())) {
      responseHeaders.set(name, value);
    }
  }

  return new NextResponse(res.body, {
    status: res.status,
    headers: responseHeaders,
  });
}
