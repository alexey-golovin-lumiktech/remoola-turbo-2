import { type NextRequest } from 'next/server';

import { handleApiError, proxyApiRequest } from '../../../lib/api-utils';

export async function POST(req: NextRequest) {
  try {
    const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/consumer/payment-requests`);
    console.log(`POST payment-requests`, url.href);

    return await proxyApiRequest(url.href, req, {
      timeout: 20000,
      retries: 2,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
