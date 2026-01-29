import { type NextRequest } from 'next/server';

import { proxyToBackend } from '../../../../lib';

export async function GET(req: NextRequest) {
  return proxyToBackend(req, `/admin/auth/me`);
}
