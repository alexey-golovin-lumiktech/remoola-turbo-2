import { type NextRequest } from 'next/server';

import { proxyToBackend } from '../../../../lib/proxy';

export async function GET(req: NextRequest, ctx: { params: Promise<{ consumerId: string }> }) {
  const params = await ctx.params;
  return proxyToBackend(req, `/admin/consumers/${params.consumerId}`);
}
