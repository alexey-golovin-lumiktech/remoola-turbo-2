import { type NextRequest } from 'next/server';

import { paymentParamsSchema } from '../../../../../features/payments/schemas';
import { appendSetCookies, buildForwardHeaders } from '../../../../../lib/api-utils';
import { getEnv } from '../../../../../lib/env.server';
import { serverLogger } from '../../../../../lib/logger.server';

/**
 * POST /api/payments/[paymentRequestId]/generate-invoice
 * Generates an invoice PDF for a specific payment request.
 * This endpoint proxies the request to the backend API.
 */
export async function POST(req: NextRequest, context: { params: Promise<{ paymentRequestId: string }> }) {
  const params = await context.params;
  const parsed = paymentParamsSchema.safeParse(params);

  if (!parsed.success) {
    return Response.json(
      {
        code: `VALIDATION_ERROR`,
        message: `Invalid payment request ID`,
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    return Response.json({ message: `API base URL not configured`, code: `CONFIG_ERROR` }, { status: 503 });
  }

  try {
    const url = new URL(`${baseUrl}/consumer/payments/${parsed.data.paymentRequestId}/generate-invoice`);
    const res = await fetch(url, {
      method: `POST`,
      headers: buildForwardHeaders(req.headers),
      credentials: `include`,
      cache: `no-store`,
    });

    const contentType = res.headers.get(`content-type`);
    const responseHeaders = new Headers();
    appendSetCookies(responseHeaders, res.headers);
    if (contentType) responseHeaders.set(`content-type`, contentType);

    if (contentType?.includes(`application/pdf`)) {
      const blob = await res.blob();
      const disp = res.headers.get(`content-disposition`) || `attachment; filename=invoice.pdf`;
      responseHeaders.set(`content-disposition`, disp);
      return new Response(blob, { status: res.status, headers: responseHeaders });
    }

    const data = await res.text();
    return new Response(data, { status: res.status, headers: responseHeaders });
  } catch (error) {
    serverLogger.error(`Invoice generation failed`, {
      paymentRequestId: parsed.data.paymentRequestId,
      error: error instanceof Error ? error : String(error),
    });
    return Response.json(
      {
        code: `INVOICE_GENERATION_FAILED`,
        message: `Failed to generate invoice`,
      },
      { status: 500 },
    );
  }
}
