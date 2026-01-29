import { type NextRequest } from 'next/server';

import { proxyToBackend, type RouteHandlerContext } from '../../../../../lib';

export async function PATCH(req: NextRequest, ctx: RouteHandlerContext<{ consumerId: string }>) {
  const params = await ctx.params;
  return proxyToBackend(req, `/admin/consumers/${params.consumerId}/verification`);
}
