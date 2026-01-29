import { type NextRequest } from 'next/server';

import { proxyToBackend, type RouteHandlerContext } from '../../../../../lib';

export async function PATCH(req: NextRequest, ctx: RouteHandlerContext<{ ruleId: string }>) {
  const { ruleId } = await ctx.params;
  return proxyToBackend(req, `/admin/exchange/rules/${ruleId}`);
}
