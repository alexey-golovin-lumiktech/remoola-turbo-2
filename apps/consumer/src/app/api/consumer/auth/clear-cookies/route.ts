import { NextResponse } from 'next/server';

const ACCESS_TOKEN = `access_token`;
const REFRESH_TOKEN = `refresh_token`;
const GOOGLE_OAUTH_STATE = `google_oauth_state`;

const clearOpts = { path: `/`, maxAge: 0 } as const;

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ACCESS_TOKEN, ``, clearOpts);
  res.cookies.set(REFRESH_TOKEN, ``, clearOpts);
  res.cookies.set(GOOGLE_OAUTH_STATE, ``, clearOpts);
  return res;
}
