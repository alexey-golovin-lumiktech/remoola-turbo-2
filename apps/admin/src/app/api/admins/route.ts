import { type NextRequest } from 'next/server';

import { proxyToBackend } from '../../../lib/proxy';

export async function GET(req: NextRequest) {
  // passes through query params like ?includeDeleted=1
  const url = new URL(req.url);
  const qs = url.search ? url.search : ``;
  return proxyToBackend(req, `/admin/admins${qs}`);
}

export async function POST(req: NextRequest) {
  return proxyToBackend(req, `/admin/admins`);
}
