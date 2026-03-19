import { NextResponse } from 'next/server';

import { clearConsumerAuthCookies } from '../../../../../lib/auth-cookie-policy';

/**
 * Clears consumer auth cookies locally. No CSRF: BFF-only, no backend session revocation.
 * Called on session-expired (no valid CSRF) and login/signup (best-effort cleanup).
 */
export async function POST(request: Request) {
  const res = NextResponse.json({ ok: true });
  clearConsumerAuthCookies(res, request);
  return res;
}
