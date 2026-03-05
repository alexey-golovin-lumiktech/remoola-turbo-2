import { type NextRequest } from 'next/server';

import { parsePaymentRequestParams } from '../../../../../features/payment-requests/schemas';
import { handleApiError, proxyApiRequest } from '../../../../../lib/api-utils';
import { getEnv } from '../../../../../lib/env.server';

export async function POST(req: NextRequest, context: { params: Promise<{ paymentRequestId: string }> }) {
  const rawParams = await context.params;
  const parsed = parsePaymentRequestParams(rawParams);
  if (`error` in parsed) {
    return Response.json({ code: `VALIDATION_ERROR`, message: parsed.error }, { status: 400 });
  }
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    return Response.json({ message: `API base URL not configured`, code: `CONFIG_ERROR` }, { status: 503 });
  }
  try {
    const url = new URL(`${baseUrl}/consumer/payment-requests/${parsed.paymentRequestId}/send`);
    return await proxyApiRequest(url.href, req, { timeout: 20000, retries: 2 });
  } catch (error) {
    return handleApiError(error);
  }
}
