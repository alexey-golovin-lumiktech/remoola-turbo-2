import { NextResponse } from 'next/server';

import { clearConsumerAuthCookies } from '../../../../../lib/auth-cookie-policy';

export async function POST(request: Request) {
  const res = NextResponse.json({ ok: true });
  clearConsumerAuthCookies(res, request);
  return res;
}
