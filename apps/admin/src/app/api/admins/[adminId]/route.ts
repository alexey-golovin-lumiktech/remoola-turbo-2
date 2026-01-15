import { type NextRequest } from 'next/server';

import { proxyToBackend } from '../../../../lib/proxy';

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ adminId: string }> }) {
  const params = await ctx.params;
  return proxyToBackend(req, `/admin/admins/${params.adminId}`);
}
