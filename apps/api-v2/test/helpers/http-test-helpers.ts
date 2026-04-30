import { randomUUID } from 'crypto';

import { CONSUMER_APP_SCOPE_HEADER, CURRENT_CONSUMER_APP_SCOPE, type ConsumerAppScope } from '@remoola/api-types';

import type request from 'supertest';

const DEFAULT_CONSUMER_ORIGIN = `http://127.0.0.1:3003`;

export function asCookieArray(header: string | string[] | undefined): string[] | undefined {
  if (Array.isArray(header)) return header;
  if (typeof header === `string`) return [header];
  return undefined;
}

export function parseCookieValue(cookies: string[] | undefined, key: string): string | null {
  if (!Array.isArray(cookies)) return null;
  const row = cookies.find((line) => line.startsWith(`${key}=`));
  if (!row) return null;
  const [raw] = row.split(`;`);
  return raw.slice(`${key}=`.length);
}

export function nextIdempotencyKey(prefix: string): string {
  return `${prefix}-${randomUUID()}`;
}

export function withConsumerAppScope<T extends request.Test>(
  req: T,
  scope: ConsumerAppScope = CURRENT_CONSUMER_APP_SCOPE,
  origin = DEFAULT_CONSUMER_ORIGIN,
): T {
  return req.set(`origin`, origin).set(CONSUMER_APP_SCOPE_HEADER, scope);
}

export function extractMessage(body: unknown): string {
  if (typeof body === `string`) return body;
  if (Array.isArray(body)) return body.map((part) => extractMessage(part)).join(` | `);
  if (body && typeof body === `object`) {
    const message = (body as { message?: unknown }).message;
    return message !== undefined ? extractMessage(message) : JSON.stringify(body);
  }
  return String(body);
}
