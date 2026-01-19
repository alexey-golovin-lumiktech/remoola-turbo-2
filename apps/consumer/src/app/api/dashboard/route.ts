import { type NextRequest } from 'next/server';

import { proxyApiRequest, handleApiError } from '../../../lib/api-utils';

export async function GET(req: NextRequest) {
  try {
    const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/consumer/dashboard`;
    console.log(`GET`, url);

    return await proxyApiRequest(url, req, {
      timeout: 15000, // 15 second timeout for dashboard
      retries: 2,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
