'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';

import { getBypassHeaders, getRequestOrigin } from '../../lib/request-origin';

type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; fields?: Record<string, string> } };

const personalDetailsSchema = z.object({
  firstName: z.string().min(1, `First name is required`),
  lastName: z.string().min(1, `Last name is required`),
  citizenOf: z.string().min(1, `Country of citizenship is required`),
  countryOfTaxResidence: z.string().min(1, `Country of tax residence is required`),
  legalStatus: z.string().optional(),
  taxId: z.string().optional(),
  dateOfBirth: z.string().optional(),
  passportOrIdNumber: z.string().optional(),
  phoneNumber: z.string().optional(),
});

const addressDetailsSchema = z.object({
  postalCode: z.string().min(1, `Postal code is required`),
  country: z.string().min(1, `Country is required`),
  state: z.string().optional(),
  city: z.string().min(1, `City is required`),
  street: z.string().min(1, `Street is required`),
});

const organizationDetailsSchema = z.object({
  name: z.string().optional(),
  consumerRole: z.string().optional(),
  consumerRoleOther: z.string().optional(),
  size: z.string().optional(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, `Current password is required`),
    password: z.string().min(8, `Password must be at least 8 characters`),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: `Passwords do not match`,
    path: [`confirmPassword`],
  });

const preferredCurrencySchema = z.object({
  preferredCurrency: z.string(),
});

function parseErrorResponseBody(body: string): Record<string, unknown> | null {
  if (!body) return null;
  try {
    const parsed: unknown = JSON.parse(body);
    return parsed !== null && typeof parsed === `object` ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export async function readErrorResponse(response: Response): Promise<{
  errorText: string;
  errorData: Record<string, unknown> | null;
}> {
  const errorText = await response.text().catch(() => `Failed to read error response as text`);
  return {
    errorText,
    errorData: parseErrorResponseBody(errorText),
  };
}

export async function updatePersonalDetailsAction(formData: FormData): Promise<ActionResult<{ success: boolean }>> {
  const rawData = {
    firstName: formData.get(`firstName`)?.toString() ?? ``,
    lastName: formData.get(`lastName`)?.toString() ?? ``,
    citizenOf: formData.get(`citizenOf`)?.toString() ?? ``,
    countryOfTaxResidence: formData.get(`countryOfTaxResidence`)?.toString() ?? ``,
    legalStatus: formData.get(`legalStatus`)?.toString() || undefined,
    taxId: formData.get(`taxId`)?.toString() || undefined,
    dateOfBirth: formData.get(`dateOfBirth`)?.toString() || undefined,
    passportOrIdNumber: formData.get(`passportOrIdNumber`)?.toString() || undefined,
    phoneNumber: formData.get(`phoneNumber`)?.toString() || undefined,
  };

  const parsed = personalDetailsSchema.safeParse(rawData);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    parsed.error.issues.forEach((issue) => {
      if (issue.path[0]) fields[issue.path[0].toString()] = issue.message;
    });
    return { ok: false, error: { code: `VALIDATION_ERROR`, message: `Invalid input`, fields } };
  }

  try {
    const headersList = await headers();
    const baseUrl = getRequestOrigin();
    const cookie = headersList.get(`cookie`);

    const response = await fetch(`${baseUrl}/api/profile/update`, {
      method: `PATCH`,
      headers: {
        'content-type': `application/json`,
        cookie: cookie ?? ``,
        ...getBypassHeaders(),
      },
      body: JSON.stringify({ personalDetails: parsed.data }),
      cache: `no-store`,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        ok: false,
        error: {
          code: `UPDATE_FAILED`,
          message: errorText ?? `Failed to update personal details`,
        },
      };
    }

    revalidatePath(`/settings`);
    return { ok: true, data: { success: true } };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: `NETWORK_ERROR`,
        message: error instanceof Error ? error.message : `Network error occurred`,
      },
    };
  }
}

export async function updateAddressDetailsAction(formData: FormData): Promise<ActionResult<{ success: boolean }>> {
  const rawData = {
    postalCode: formData.get(`postalCode`)?.toString() ?? ``,
    country: formData.get(`country`)?.toString() ?? ``,
    state: formData.get(`state`)?.toString() || undefined,
    city: formData.get(`city`)?.toString() ?? ``,
    street: formData.get(`street`)?.toString() ?? ``,
  };

  const parsed = addressDetailsSchema.safeParse(rawData);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    parsed.error.issues.forEach((issue) => {
      if (issue.path[0]) fields[issue.path[0].toString()] = issue.message;
    });
    return { ok: false, error: { code: `VALIDATION_ERROR`, message: `Invalid input`, fields } };
  }

  try {
    const headersList = await headers();
    const baseUrl = getRequestOrigin();
    const cookie = headersList.get(`cookie`);

    const response = await fetch(`${baseUrl}/api/profile/update`, {
      method: `PATCH`,
      headers: {
        'content-type': `application/json`,
        cookie: cookie ?? ``,
        ...getBypassHeaders(),
      },
      body: JSON.stringify({ addressDetails: parsed.data }),
      cache: `no-store`,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        ok: false,
        error: {
          code: `UPDATE_FAILED`,
          message: errorData.message ?? errorData.error ?? `Failed to update address details`,
        },
      };
    }

    revalidatePath(`/settings`);
    return { ok: true, data: { success: true } };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: `NETWORK_ERROR`,
        message: error instanceof Error ? error.message : `Network error occurred`,
      },
    };
  }
}

export async function updateOrganizationDetailsAction(formData: FormData): Promise<ActionResult<{ success: boolean }>> {
  const rawData = {
    name: formData.get(`name`)?.toString() || undefined,
    consumerRole: formData.get(`consumerRole`)?.toString() || undefined,
    consumerRoleOther: formData.get(`consumerRoleOther`)?.toString() || undefined,
    size: formData.get(`size`)?.toString() || undefined,
  };

  const parsed = organizationDetailsSchema.safeParse(rawData);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    parsed.error.issues.forEach((issue) => {
      if (issue.path[0]) fields[issue.path[0].toString()] = issue.message;
    });
    return { ok: false, error: { code: `VALIDATION_ERROR`, message: `Invalid input`, fields } };
  }

  try {
    const headersList = await headers();
    const baseUrl = getRequestOrigin();
    const cookie = headersList.get(`cookie`);

    const response = await fetch(`${baseUrl}/api/profile/update`, {
      method: `PATCH`,
      headers: {
        'content-type': `application/json`,
        cookie: cookie ?? ``,
        ...getBypassHeaders(),
      },
      body: JSON.stringify({ organizationDetails: parsed.data }),
      cache: `no-store`,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        ok: false,
        error: {
          code: `UPDATE_FAILED`,
          message: errorData.message ?? errorData.error ?? `Failed to update organization details`,
        },
      };
    }

    revalidatePath(`/settings`);
    return { ok: true, data: { success: true } };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: `NETWORK_ERROR`,
        message: error instanceof Error ? error.message : `Network error occurred`,
      },
    };
  }
}

export async function updatePasswordAction(formData: FormData): Promise<ActionResult<{ success: boolean }>> {
  const rawData = {
    currentPassword: formData.get(`currentPassword`)?.toString() ?? ``,
    password: formData.get(`password`)?.toString() ?? ``,
    confirmPassword: formData.get(`confirmPassword`)?.toString() ?? ``,
  };

  const parsed = passwordSchema.safeParse(rawData);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    parsed.error.issues.forEach((issue) => {
      if (issue.path[0]) fields[issue.path[0].toString()] = issue.message;
    });
    return { ok: false, error: { code: `VALIDATION_ERROR`, message: `Invalid input`, fields } };
  }

  try {
    const headersList = await headers();
    const baseUrl = getRequestOrigin();
    const cookie = headersList.get(`cookie`);

    const response = await fetch(`${baseUrl}/api/profile/password`, {
      method: `PATCH`,
      headers: {
        'content-type': `application/json`,
        cookie: cookie ?? ``,
        ...getBypassHeaders(),
      },
      body: JSON.stringify({
        currentPassword: parsed.data.currentPassword,
        password: parsed.data.password,
      }),
      cache: `no-store`,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const code = (errorData.message ?? errorData.error ?? `UPDATE_FAILED`) as string;
      return {
        ok: false,
        error: {
          code,
          message: typeof errorData.message === `string` ? errorData.message : `Failed to change password`,
        },
      };
    }

    revalidatePath(`/settings`);
    return { ok: true, data: { success: true } };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: `NETWORK_ERROR`,
        message: error instanceof Error ? error.message : `Network error occurred`,
      },
    };
  }
}

export async function updatePreferredCurrencyAction(
  formData: FormData,
): Promise<ActionResult<{ preferredCurrency: string | null }>> {
  const rawData = {
    preferredCurrency: formData.get(`preferredCurrency`)?.toString() ?? ``,
  };

  const parsed = preferredCurrencySchema.safeParse(rawData);
  if (!parsed.success) {
    return { ok: false, error: { code: `VALIDATION_ERROR`, message: `Invalid currency` } };
  }

  try {
    const headersList = await headers();
    const baseUrl = getRequestOrigin();
    const cookie = headersList.get(`cookie`);

    const response = await fetch(`${baseUrl}/api/settings`, {
      method: `PATCH`,
      headers: {
        'content-type': `application/json`,
        cookie: cookie ?? ``,
        ...getBypassHeaders(),
      },
      body: JSON.stringify({ preferredCurrency: parsed.data.preferredCurrency }),
      cache: `no-store`,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        ok: false,
        error: {
          code: `UPDATE_FAILED`,
          message: errorData.message ?? errorData.error ?? `Failed to update preferred currency`,
        },
      };
    }

    const result = await response.json();
    revalidatePath(`/settings`);
    return { ok: true, data: { preferredCurrency: result.preferredCurrency } };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: `NETWORK_ERROR`,
        message: error instanceof Error ? error.message : `Network error occurred`,
      },
    };
  }
}
