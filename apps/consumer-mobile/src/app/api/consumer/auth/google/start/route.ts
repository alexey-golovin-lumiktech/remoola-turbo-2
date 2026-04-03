import { type NextRequest, NextResponse } from 'next/server';

import { getEnv } from '../../../../../../lib/env.server';

const ALLOWED_QUERY_PARAMS = [`next`, `signupPath`, `accountType`, `contractorKind`] as const;
const APP_SCOPE = `consumer-mobile`;

export async function GET(req: NextRequest) {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    return NextResponse.json({ message: `API base URL not configured`, code: `CONFIG_ERROR` }, { status: 503 });
  }

  const url = new URL(`${baseUrl}/consumer/auth/google/start`);
  url.searchParams.set(`appScope`, APP_SCOPE);
  for (const key of ALLOWED_QUERY_PARAMS) {
    const value = req.nextUrl.searchParams.get(key);
    if (value) url.searchParams.set(key, value);
  }

  return NextResponse.redirect(url);
}
