import { type NextRequest } from 'next/server';

import { proxyToBackend } from '../../../../lib/proxy';

export async function POST(req: NextRequest) {
  return proxyToBackend(req, `/admin/auth/login`);
}
