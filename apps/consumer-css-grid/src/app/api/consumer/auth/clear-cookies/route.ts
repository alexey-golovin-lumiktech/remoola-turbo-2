import { NextResponse } from 'next/server';

import { clearConsumerAuthCookies } from '../../../../../lib/auth-cookie-policy';

export async function POST(request: Request) {
  const response = NextResponse.json({ ok: true });
  clearConsumerAuthCookies(response, request);
  return response;
}
