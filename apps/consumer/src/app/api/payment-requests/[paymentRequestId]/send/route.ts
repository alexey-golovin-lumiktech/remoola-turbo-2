import { type NextRequest } from 'next/server';

import { handleApiError, proxyApiRequest } from '../../../../../lib/api-utils';

const APP_SCOPE = `consumer`;

export async function POST(req: NextRequest, { params }: { params: Promise<{ paymentRequestId: string }> }) {
  try {
    const url = new URL(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/consumer/payment-requests/${(await params).paymentRequestId}/send`,
    );
    url.searchParams.set(`appScope`, APP_SCOPE);

    return await proxyApiRequest(url.href, req, {
      timeout: 20000,
      retries: 2,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
