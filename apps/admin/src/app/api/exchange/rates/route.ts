import { type NextRequest } from 'next/server';

import { proxyToBackend } from '../../../../lib';

export async function GET(req: NextRequest) {
  return proxyToBackend(req, `/admin/exchange/rates`);
}

export async function POST(req: NextRequest) {
  return proxyToBackend(req, `/admin/exchange/rates`);
}
