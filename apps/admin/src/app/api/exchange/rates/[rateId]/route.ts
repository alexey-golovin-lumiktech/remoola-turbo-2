import { type NextRequest } from 'next/server';

import { proxyToBackend, type RouteHandlerContext } from '../../../../../lib';

export async function GET(req: NextRequest, ctx: RouteHandlerContext<{ rateId: string }>) {
  const { rateId } = await ctx.params;
  return proxyToBackend(req, `/admin/exchange/rates/${rateId}`);
}

export async function PATCH(req: NextRequest, ctx: RouteHandlerContext<{ rateId: string }>) {
  const { rateId } = await ctx.params;
  return proxyToBackend(req, `/admin/exchange/rates/${rateId}`);
}

export async function DELETE(req: NextRequest, ctx: RouteHandlerContext<{ rateId: string }>) {
  const { rateId } = await ctx.params;
  return proxyToBackend(req, `/admin/exchange/rates/${rateId}`);
}
