import { type NextRequest } from 'next/server';

import { proxyToBackend, type RouteHandlerContext } from '../../../../../../lib';

export async function POST(req: NextRequest, ctx: RouteHandlerContext<{ conversionId: string }>) {
  const { conversionId } = await ctx.params;
  return proxyToBackend(req, `/admin/exchange/scheduled/${conversionId}/execute`);
}
