import { type NextRequest } from 'next/server';

import { paymentParamsSchema } from '../../../../../features/payments/schemas';
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
      headers: new Headers(req.headers),
      credentials: `include`,
      cache: `no-store`,
    });

    const cookie = res.headers.get(`set-cookie`);
    const contentType = res.headers.get(`content-type`);

    const headers: HeadersInit = {};
    if (cookie) {
      headers[`set-cookie`] = cookie;
    }
    if (contentType) {
      headers[`content-type`] = contentType;
    }

    if (contentType?.includes(`application/pdf`)) {
      const blob = await res.blob();
      return new Response(blob, {
        status: res.status,
        headers: {
          ...headers,
          'content-disposition': res.headers.get(`content-disposition`) || `attachment; filename=invoice.pdf`,
        },
      });
    }

    const data = await res.text();
    return new Response(data, { status: res.status, headers });
  } catch (error) {
    serverLogger.error(`Invoice generation failed`, {
      paymentRequestId: parsed.data.paymentRequestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
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
