import 'server-only';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

import { sanitizeNextForRedirect } from '@remoola/api-types';

import { SESSION_EXPIRED_ERROR_CODE } from '../auth-failure';
import { buildConsumerMutationHeaders } from '../consumer-auth-headers.server';
import { getEnv } from '../env.server';

export type MutationResult =
  | { ok: true; message?: string }
  | { ok: false; error: { code: string; message: string; fields?: Record<string, string> } };

export type PaymentFlowMutationContext = {
  contractId?: string | null;
  returnTo?: string | null;
};

const NETWORK_ERROR_MESSAGE = `The request could not be completed because the network request failed. Please try again.`;

export async function fetch(input: string | URL, init?: RequestInit): Promise<Response> {
  try {
    return await globalThis.fetch(input, init);
  } catch {
    return new Response(JSON.stringify({ code: `NETWORK_ERROR`, message: NETWORK_ERROR_MESSAGE }), {
      status: 503,
      headers: { 'content-type': `application/json` },
    });
  }
}

export function invalid(message: string, fields?: Record<string, string>): MutationResult {
  return {
    ok: false,
    error: {
      code: `VALIDATION_ERROR`,
      message,
      ...(fields ? { fields } : {}),
    },
  };
}

export async function parseError(res: Response, fallbackMessage: string) {
  if (res.status === 401) {
    return {
      code: SESSION_EXPIRED_ERROR_CODE,
      message: `Your session has expired. Please sign in again.`,
    };
  }

  const payload = (await res.json().catch(() => null)) as { code?: string; message?: string } | null;
  return {
    code: payload?.code ?? `API_ERROR`,
    message: payload?.message ?? fallbackMessage,
  };
}

export function configuredBaseUrl(): string | null {
  const env = getEnv();
  return env.NEXT_PUBLIC_API_BASE_URL || null;
}

export async function consumerMutationHeaders() {
  const cookieStore = await cookies();
  return buildConsumerMutationHeaders(cookieStore.toString());
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function parseMajorAmountInput(value: string): number {
  const trimmed = value.trim();
  if (!/^\d+(?:\.\d+)?$/.test(trimmed)) return Number.NaN;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function normalizePaymentFlowMutationContext(input?: PaymentFlowMutationContext | null) {
  const contractId = input?.contractId?.trim() ?? ``;
  const returnTo = sanitizeNextForRedirect(input?.returnTo, ``);

  if (!contractId && !returnTo) {
    return null;
  }

  return {
    ...(contractId ? { contractId } : {}),
    ...(returnTo ? { returnTo } : contractId ? { returnTo: `/contracts/${contractId}` } : {}),
  };
}

export function revalidateContractPaths(context?: PaymentFlowMutationContext | null) {
  const normalized = normalizePaymentFlowMutationContext(context);
  if (!normalized?.contractId) return;
  revalidatePath(`/contracts`);
  revalidatePath(`/contracts/${normalized.contractId}`);
}
