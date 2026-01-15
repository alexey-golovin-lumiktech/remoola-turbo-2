import { type NextRequest } from 'next/server';

import { proxyToBackend } from '../../../../lib/proxy';

export async function GET(req: NextRequest, ctx: { params: Promise<{ paymentRequestId: string }> }) {
  const params = await ctx.params;
  return proxyToBackend(req, `/admin/payment-requests/${params.paymentRequestId}`);
}
