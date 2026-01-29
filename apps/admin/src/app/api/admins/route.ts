import { type NextRequest } from 'next/server';

import { proxyToBackend } from '../../../lib';

export async function GET(req: NextRequest) {
  // passes through query params like ?includeDeleted=1
  const url = new URL(req.url);
  const search = url.search ? url.search : ``;
  return proxyToBackend(req, `/admin/admins${search}`);
}

export async function POST(req: NextRequest) {
  return proxyToBackend(req, `/admin/admins`);
}
