import { type NextRequest, NextResponse } from 'next/server';

import { encodeApiPathSegment } from '../../../../../lib/api-path';
import { buildForwardHeaders } from '../../../../../lib/api-utils';
import {
  buildConsumerUpstreamUrl,
  getConsumerApiBaseUrlResponse,
  proxyBinaryRoute,
} from '../../../../../lib/bff-proxy.server';

const RESPONSE_HEADER_ALLOWLIST = new Set([`cache-control`, `content-disposition`, `content-length`, `content-type`]);

type RouteContext = {
  params: Promise<{ documentId: string }>;
};

async function readDocumentId(context: RouteContext): Promise<string> {
  const params = await context.params;
  return params.documentId?.trim() ?? ``;
}

export async function GET(req: NextRequest, context: RouteContext) {
  const baseUrlResult = getConsumerApiBaseUrlResponse();
  if (!baseUrlResult.ok) return baseUrlResult.response;

  const documentId = await readDocumentId(context);
  if (!documentId) {
    return NextResponse.json({ message: `Document id is required`, code: `VALIDATION_ERROR` }, { status: 400 });
  }

  const forwardHeaders = buildForwardHeaders(req.headers);
  forwardHeaders.delete(`host`);

  return proxyBinaryRoute({
    url: buildConsumerUpstreamUrl(
      baseUrlResult.baseUrl,
      `/api/consumer/documents/${encodeApiPathSegment(documentId)}/download`,
    ),
    method: `GET`,
    init: {
      headers: forwardHeaders,
      cache: `no-store`,
    },
    appendUpstreamSetCookies: true,
    responseHeaderAllowlist: RESPONSE_HEADER_ALLOWLIST,
  });
}
