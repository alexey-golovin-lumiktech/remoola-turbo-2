import { type NextRequest, NextResponse } from 'next/server';

import { appendSetCookies, buildForwardHeaders } from '../../../../../../lib/api-utils';
import { getEnv } from '../../../../../../lib/env.server';

const PASSTHROUGH_HEADERS = [
  `cache-control`,
  `content-disposition`,
  `content-length`,
  `content-type`,
  `etag`,
  `last-modified`,
] as const;

export async function GET(req: NextRequest, { params }: { params: Promise<{ documentId: string }> }) {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    return NextResponse.json({ message: `API base URL not configured`, code: `CONFIG_ERROR` }, { status: 503 });
  }

  const { documentId } = await params;
  const forwardHeaders = buildForwardHeaders(new Headers(req.headers));
  forwardHeaders.delete(`host`);

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/admin-v2/documents/${encodeURIComponent(documentId)}/download`, {
      method: `GET`,
      headers: forwardHeaders,
      cache: `no-store`,
    });
  } catch {
    return NextResponse.json(
      { message: `Document download is unavailable`, code: `UPSTREAM_UNAVAILABLE` },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers();
  appendSetCookies(responseHeaders, res.headers);

  for (const headerName of PASSTHROUGH_HEADERS) {
    const value = res.headers.get(headerName);
    if (value) {
      responseHeaders.set(headerName, value);
    }
  }

  return new NextResponse(res.body, { status: res.status, headers: responseHeaders });
}
