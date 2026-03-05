'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

import { createContactSchema, updateContactSchema } from './schemas';
import { getEnv } from '../../lib/env.server';

export async function createContactAction(input: unknown) {
  const parsed = createContactSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: {
        code: `VALIDATION_ERROR`,
        message: `Invalid contact data`,
        fields: parsed.error.flatten().fieldErrors,
      },
    };
  }

  const env = getEnv();
  if (!env.NEXT_PUBLIC_API_BASE_URL) {
    return { ok: false as const, error: { code: `CONFIG_ERROR`, message: `API base URL not configured` } };
  }

  const cookieStore = await cookies();
  const res = await fetch(`${env.NEXT_PUBLIC_API_BASE_URL}/consumer/contacts`, {
    method: `POST`,
    headers: {
      'content-type': `application/json`,
      Cookie: cookieStore.toString(),
    },
    body: JSON.stringify(parsed.data),
    cache: `no-store`,
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => ``);
    let errorMessage = `Failed to create contact`;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.message || errorMessage;
    } catch {
      // Continue with default message
    }
    return { ok: false as const, error: { code: `CONTACT_CREATE_FAILED`, message: errorMessage } };
  }

  revalidatePath(`/contacts`);
  return { ok: true as const };
}

export async function updateContactAction(contactId: string, input: unknown) {
  const parsed = updateContactSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: {
        code: `VALIDATION_ERROR`,
        message: `Invalid contact data`,
        fields: parsed.error.flatten().fieldErrors,
      },
    };
  }

  const env = getEnv();
  if (!env.NEXT_PUBLIC_API_BASE_URL) {
    return { ok: false as const, error: { code: `CONFIG_ERROR`, message: `API base URL not configured` } };
  }

  const cookieStore = await cookies();
  const res = await fetch(`${env.NEXT_PUBLIC_API_BASE_URL}/consumer/contacts/${contactId}`, {
    method: `PATCH`,
    headers: {
      'content-type': `application/json`,
      Cookie: cookieStore.toString(),
    },
    body: JSON.stringify(parsed.data),
    cache: `no-store`,
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => ``);
    let errorMessage = `Failed to update contact`;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.message || errorMessage;
    } catch {
      // Continue with default message
    }
    return { ok: false as const, error: { code: `CONTACT_UPDATE_FAILED`, message: errorMessage } };
  }

  revalidatePath(`/contacts`);
  revalidatePath(`/contacts/${contactId}/details`);
  return { ok: true as const };
}

export async function deleteContactAction(contactId: string) {
  const env = getEnv();
  if (!env.NEXT_PUBLIC_API_BASE_URL) {
    return { ok: false as const, error: { code: `CONFIG_ERROR`, message: `API base URL not configured` } };
  }

  const cookieStore = await cookies();
  const res = await fetch(`${env.NEXT_PUBLIC_API_BASE_URL}/consumer/contacts/${contactId}`, {
    method: `DELETE`,
    headers: {
      'content-type': `application/json`,
      Cookie: cookieStore.toString(),
    },
    cache: `no-store`,
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => ``);
    let errorMessage = `Failed to delete contact`;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.message || errorMessage;
    } catch {
      // Continue with default message
    }
    return { ok: false as const, error: { code: `CONTACT_DELETE_FAILED`, message: errorMessage } };
  }

  revalidatePath(`/contacts`);
  return { ok: true as const };
}
