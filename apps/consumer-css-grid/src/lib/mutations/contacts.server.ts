'use server';

import { revalidatePath } from 'next/cache';

import { encodeApiPathSegment } from '../api-path';
import { findContactByExactEmail } from '../consumer-api.server';
import {
  configuredBaseUrl,
  consumerMutationHeaders,
  fetch,
  invalid,
  parseError,
  type MutationResult,
} from './mutation-runtime.server';

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

  const baseUrl = configuredBaseUrl();
  if (!baseUrl) {
    return {
      ok: false,
      error: { code: `CONFIG_ERROR`, message: `API base URL is not configured` },
    };
  }

  const response = await fetch(`${baseUrl}/consumer/contacts`, {
    method: `POST`,
    headers: {
      'content-type': `application/json`,
      ...(await consumerMutationHeaders()),
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

  const baseUrl = configuredBaseUrl();
  if (!baseUrl) {
    return {
      ok: false,
      error: { code: `CONFIG_ERROR`, message: `API base URL is not configured` },
    };
  }

  const response = await fetch(`${baseUrl}/consumer/contacts/${encodeApiPathSegment(contactId)}`, {
    method: `DELETE`,
    headers: {
      ...(await consumerMutationHeaders()),
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

  const response = await fetch(`${baseUrl}/consumer/contacts/${encodeApiPathSegment(contactId)}`, {
    method: `PATCH`,
    headers: {
      'content-type': `application/json`,
      ...(await consumerMutationHeaders()),
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
