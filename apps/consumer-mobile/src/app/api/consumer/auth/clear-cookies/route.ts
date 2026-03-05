import { NextResponse } from 'next/server';

import { COOKIE_KEYS } from '@remoola/api-types';

const clearOpts = { path: `/`, maxAge: 0 } as const;

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_KEYS.CONSUMER_ACCESS_TOKEN, ``, clearOpts);
  res.cookies.set(COOKIE_KEYS.CONSUMER_REFRESH_TOKEN, ``, clearOpts);
  res.cookies.set(COOKIE_KEYS.GOOGLE_OAUTH_STATE, ``, clearOpts);
  return res;
}
