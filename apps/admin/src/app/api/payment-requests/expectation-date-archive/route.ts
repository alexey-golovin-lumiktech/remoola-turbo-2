import { type NextRequest } from 'next/server';

import { proxyToBackend } from '../../../../lib';

export async function GET(req: NextRequest) {
  const query = req.nextUrl.search;
  return proxyToBackend(req, `/admin/payment-requests/expectation-date-archive${query}`);
}
