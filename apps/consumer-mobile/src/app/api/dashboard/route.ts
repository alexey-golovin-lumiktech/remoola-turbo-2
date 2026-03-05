import { type NextRequest } from 'next/server';

import { handleApiError, proxyApiRequest } from '../../../lib/api-utils';
import { getEnv } from '../../../lib/env.server';

export async function GET(req: NextRequest) {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    return Response.json({ message: `API base URL not configured`, code: `CONFIG_ERROR` }, { status: 503 });
  }
  try {
    return await proxyApiRequest(`${baseUrl}/consumer/dashboard`, req, {
      timeout: 15000,
      retries: 2,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
