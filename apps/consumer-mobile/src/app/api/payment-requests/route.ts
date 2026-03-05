import { type NextRequest, NextResponse } from 'next/server';

import { handleApiError, proxyApiRequest } from '../../../lib/api-utils';
import { getEnv } from '../../../lib/env.server';

export async function POST(req: NextRequest) {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    return NextResponse.json({ message: `API base URL not configured`, code: `CONFIG_ERROR` }, { status: 503 });
  }
  try {
    const url = new URL(`${baseUrl}/consumer/payment-requests`);
    return await proxyApiRequest(url.href, req, { timeout: 20000, retries: 2 });
  } catch (error) {
    return handleApiError(error);
  }
}
