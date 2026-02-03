import { type NextRequest } from 'next/server';

import { proxyToBackend, type RouteHandlerContext } from '../../../../../lib';

export async function POST(req: NextRequest, ctx: RouteHandlerContext<{ paymentRequestId: string }>) {
  const params = await ctx.params;
  return proxyToBackend(req, `/admin/payment-requests/${params.paymentRequestId}/refund`);
}
