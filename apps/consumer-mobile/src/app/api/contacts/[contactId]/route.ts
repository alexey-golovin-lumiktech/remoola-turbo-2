import { type NextRequest } from 'next/server';

import { contactParamsSchema } from '../../../../features/contacts';
import { getEnv } from '../../../../lib/env.server';

async function proxyContact(contactId: string, req: NextRequest, method: string) {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    return Response.json({ message: `API base URL not configured`, code: `CONFIG_ERROR` }, { status: 503 });
  }
  const url = new URL(`${baseUrl}/consumer/contacts/${contactId}`);
  const res = await fetch(url, {
    method,
    headers: new Headers(req.headers),
    credentials: `include`,
    ...(method !== `GET` && method !== `DELETE` && { body: await req.clone().text() }),
  });
  const cookie = res.headers.get(`set-cookie`);
  const data = await res.text();
  const headers: HeadersInit = {};
  if (cookie) headers[`set-cookie`] = cookie;
  return new Response(data, { status: res.status, headers });
}

function parseContactParams(params: { contactId: string }) {
  const parsed = contactParamsSchema.safeParse(params);
  if (!parsed.success) {
    return null;
  }
  return parsed.data;
}

export async function GET(req: NextRequest, context: { params: Promise<{ contactId: string }> }) {
  const params = parseContactParams(await context.params);
  if (!params) return Response.json({ code: `VALIDATION_ERROR`, message: `Invalid route params` }, { status: 400 });
  return proxyContact(params.contactId, req, `GET`);
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ contactId: string }> }) {
  const params = parseContactParams(await context.params);
  if (!params) return Response.json({ code: `VALIDATION_ERROR`, message: `Invalid route params` }, { status: 400 });
  return proxyContact(params.contactId, req, `PATCH`);
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ contactId: string }> }) {
  const params = parseContactParams(await context.params);
  if (!params) return Response.json({ code: `VALIDATION_ERROR`, message: `Invalid route params` }, { status: 400 });
  return proxyContact(params.contactId, req, `DELETE`);
}
