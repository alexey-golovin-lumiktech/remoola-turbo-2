'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

import { SESSION_EXPIRED_ERROR_CODE } from '../auth-failure';
import { findContactByExactEmail } from '../consumer-api.server';
import { buildConsumerMutationHeaders } from '../consumer-auth-headers.server';
import { getEnv } from '../env.server';

type MutationResult =
  | { ok: true; message?: string }
  | { ok: false; error: { code: string; message: string; fields?: Record<string, string> } };

const NETWORK_ERROR_MESSAGE = `The request could not be completed because the network request failed. Please try again.`;

async function fetch(input: string | URL, init?: RequestInit): Promise<Response> {
  try {
    return await globalThis.fetch(input, init);
  } catch {
    return new Response(JSON.stringify({ code: `NETWORK_ERROR`, message: NETWORK_ERROR_MESSAGE }), {
      status: 503,
      headers: { 'content-type': `application/json` },
    });
  }
}

function invalid(message: string, fields?: Record<string, string>): MutationResult {
  return {
    ok: false,
    error: {
      code: `VALIDATION_ERROR`,
      message,
      ...(fields ? { fields } : {}),
    },
  };
}

async function parseError(res: Response, fallbackMessage: string) {
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

function configuredBaseUrl(): string | null {
  const env = getEnv();
  return env.NEXT_PUBLIC_API_BASE_URL || null;
}

export async function createContactMutation(input: {
  email: string;
  name?: string;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}): Promise<MutationResult> {
  const email = input.email.trim().toLowerCase();
  const name = input.name?.trim() || null;
  const address = {
    street: input.street?.trim() || ``,
    city: input.city?.trim() || ``,
    state: input.state?.trim() || ``,
    postalCode: input.postalCode?.trim() || ``,
    country: input.country?.trim() || ``,
  };
  const hasAddress = Object.values(address).some(Boolean);

  if (!email || !email.includes(`@`)) {
    return invalid(`Please enter a valid email address`, { email: `Valid email is required` });
  }

  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    return {
      ok: false,
      error: { code: `CONFIG_ERROR`, message: `API base URL is not configured` },
    };
  }

  const cookieStore = await cookies();
  const response = await fetch(`${baseUrl}/consumer/contacts`, {
    method: `POST`,
    headers: {
      'content-type': `application/json`,
      ...buildConsumerMutationHeaders(cookieStore.toString()),
    },
    body: JSON.stringify({
      email,
      ...(name ? { name } : {}),
      ...(hasAddress ? { address } : {}),
    }),
    cache: `no-store`,
  });

  if (!response.ok) {
    const error = await parseError(response, `Failed to create contact`);
    return { ok: false, error };
  }

  revalidatePath(`/contacts`);
  revalidatePath(`/contracts`);
  return { ok: true, message: `Contact created` };
}

export async function hasSavedContactByEmailQuery(
  email: string,
): Promise<{ ok: true; found: boolean } | { ok: false; error: { code: string; message: string } }> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes(`@`)) {
    return {
      ok: false,
      error: {
        code: `VALIDATION_ERROR`,
        message: `Please enter a valid email address`,
      },
    };
  }

  try {
    const match = await findContactByExactEmail(normalizedEmail);
    return {
      ok: true,
      found: match?.email?.trim().toLowerCase() === normalizedEmail,
    };
  } catch {
    return {
      ok: false,
      error: {
        code: `NETWORK_ERROR`,
        message: `Could not verify saved contacts right now`,
      },
    };
  }
}

export async function deleteContactMutation(contactId: string): Promise<MutationResult> {
  if (!contactId.trim()) {
    return invalid(`Invalid contact id`);
  }

  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    return {
      ok: false,
      error: { code: `CONFIG_ERROR`, message: `API base URL is not configured` },
    };
  }

  const cookieStore = await cookies();
  const response = await fetch(`${baseUrl}/consumer/contacts/${contactId}`, {
    method: `DELETE`,
    headers: {
      ...buildConsumerMutationHeaders(cookieStore.toString()),
    },
    cache: `no-store`,
  });

  if (!response.ok) {
    const error = await parseError(response, `Failed to delete contact`);
    return { ok: false, error };
  }

  revalidatePath(`/contacts`);
  revalidatePath(`/contracts`);
  return { ok: true, message: `Contact deleted` };
}

export async function updateContactMutation(
  contactId: string,
  input: {
    email: string;
    name?: string;
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  },
): Promise<MutationResult> {
  if (!contactId.trim()) {
    return invalid(`Invalid contact id`);
  }

  const email = input.email.trim().toLowerCase();
  const name = input.name?.trim() || null;
  const address = {
    street: input.street?.trim() || ``,
    city: input.city?.trim() || ``,
    state: input.state?.trim() || ``,
    postalCode: input.postalCode?.trim() || ``,
    country: input.country?.trim() || ``,
  };
  const hasAddress = Object.values(address).some(Boolean);

  if (!email || !email.includes(`@`)) {
    return invalid(`Please enter a valid email address`, { email: `Valid email is required` });
  }

  const baseUrl = configuredBaseUrl();
  if (!baseUrl) {
    return {
      ok: false,
      error: { code: `CONFIG_ERROR`, message: `API base URL is not configured` },
    };
  }

  const cookieStore = await cookies();
  const response = await fetch(`${baseUrl}/consumer/contacts/${contactId}`, {
    method: `PATCH`,
    headers: {
      'content-type': `application/json`,
      ...buildConsumerMutationHeaders(cookieStore.toString()),
    },
    body: JSON.stringify({
      email,
      ...(name ? { name } : {}),
      address: hasAddress ? address : null,
    }),
    cache: `no-store`,
  });

  if (!response.ok) {
    const error = await parseError(response, `Failed to update contact`);
    return { ok: false, error };
  }

  revalidatePath(`/contacts`);
  revalidatePath(`/contracts`);
  return { ok: true, message: `Contact updated` };
}
