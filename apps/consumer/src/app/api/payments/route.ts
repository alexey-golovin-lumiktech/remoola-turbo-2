import { type NextRequest } from 'next/server';

import { proxyApiRequest, handleApiError } from '../../../lib/api-utils';

export async function GET(req: NextRequest) {
  try {
    const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/consumer/payments`;

    return await proxyApiRequest(url, req, {
      timeout: 20000, // 20 second timeout for payments list
      retries: 2,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
