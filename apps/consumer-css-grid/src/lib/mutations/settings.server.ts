'use server';

import { revalidatePath } from 'next/cache';

import {
  type ConsumerChangePasswordPayload,
  type ConsumerUpdateProfilePayload,
  type ConsumerUpdateSettingsPayload,
} from '@remoola/api-types';

import {
  configuredBaseUrl,
  consumerMutationHeaders,
  fetch,
  invalid,
  normalizePhone,
  parseError,
  type MutationResult,
} from './mutation-runtime.server';

function hasOwn<T extends object>(value: T, key: keyof T) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

export async function updateProfileMutation(input: ConsumerUpdateProfilePayload): Promise<MutationResult> {
  const personalDetailsInput = input.personalDetails;
  const personalDetails = personalDetailsInput
    ? {
        ...(hasOwn(personalDetailsInput, `firstName`)
          ? { firstName: personalDetailsInput.firstName?.trim() ?? `` }
          : {}),
        ...(hasOwn(personalDetailsInput, `lastName`) ? { lastName: personalDetailsInput.lastName?.trim() ?? `` } : {}),
        ...(hasOwn(personalDetailsInput, `phoneNumber`)
          ? { phoneNumber: normalizePhone(personalDetailsInput.phoneNumber ?? ``) }
          : {}),
      }
    : undefined;
  const addressDetailsInput = input.addressDetails;
  const addressDetails = addressDetailsInput
    ? {
        ...(hasOwn(addressDetailsInput, `country`) ? { country: addressDetailsInput.country?.trim() ?? `` } : {}),
        ...(hasOwn(addressDetailsInput, `city`) ? { city: addressDetailsInput.city?.trim() ?? `` } : {}),
        ...(hasOwn(addressDetailsInput, `street`) ? { street: addressDetailsInput.street?.trim() ?? `` } : {}),
        ...(hasOwn(addressDetailsInput, `postalCode`)
          ? { postalCode: addressDetailsInput.postalCode?.trim() ?? `` }
          : {}),
      }
    : undefined;
  const organizationDetailsInput = input.organizationDetails;
  const organizationDetails = organizationDetailsInput
    ? {
        ...(hasOwn(organizationDetailsInput, `name`) ? { name: organizationDetailsInput.name?.trim() ?? `` } : {}),
      }
    : undefined;

  if (!personalDetails || Object.keys(personalDetails).length === 0) {
    if (
      (!addressDetails || Object.keys(addressDetails).length === 0) &&
      (!organizationDetails || Object.keys(organizationDetails).length === 0)
    ) {
      return invalid(`Please change at least one profile field before saving`);
    }
  }

  const baseUrl = configuredBaseUrl();
  if (!baseUrl) {
    return {
      ok: false,
      error: { code: `CONFIG_ERROR`, message: `API base URL is not configured` },
    };
  }

  const body = {
    ...(personalDetails && Object.keys(personalDetails).length > 0 ? { personalDetails } : {}),
    ...(addressDetails && Object.keys(addressDetails).length > 0 ? { addressDetails } : {}),
    ...(organizationDetails && Object.keys(organizationDetails).length > 0 ? { organizationDetails } : {}),
  };

  const response = await fetch(`${baseUrl}/consumer/profile`, {
    method: `PATCH`,
    headers: {
      'content-type': `application/json`,
      ...(await consumerMutationHeaders()),
    },
    body: JSON.stringify(body),
    cache: `no-store`,
  });

  if (!response.ok) {
    const error = await parseError(response, `Failed to update profile`);
    return { ok: false, error };
  }

  revalidatePath(`/settings`);
  return { ok: true, message: `Profile updated` };
}

export async function updateSettingsMutation(input: {
  theme?: ConsumerUpdateSettingsPayload[`theme`];
  preferredCurrency?: string;
}): Promise<MutationResult> {
  const theme = input.theme?.trim().toUpperCase();
  const preferredCurrency = input.preferredCurrency?.trim().toUpperCase();

  if (!theme && !preferredCurrency) {
    return invalid(`Please change at least one preference before saving`);
  }

  const baseUrl = configuredBaseUrl();
  if (!baseUrl) {
    return {
      ok: false,
      error: { code: `CONFIG_ERROR`, message: `API base URL is not configured` },
    };
  }

  const response = await fetch(`${baseUrl}/consumer/settings`, {
    method: `PATCH`,
    headers: {
      'content-type': `application/json`,
      ...(await consumerMutationHeaders()),
    },
    body: JSON.stringify({
      ...(theme ? { theme } : {}),
      ...(preferredCurrency ? { preferredCurrency } : {}),
    }),
    cache: `no-store`,
  });

  if (!response.ok) {
    const error = await parseError(response, `Failed to update settings`);
    return { ok: false, error };
  }

  revalidatePath(`/settings`);
  return { ok: true, message: `Preferences updated` };
}

export async function changePasswordMutation(
  input: ConsumerChangePasswordPayload & { confirmPassword: string },
): Promise<MutationResult> {
  const currentPassword = input.currentPassword?.trim();
  const password = input.password;
  const confirmPassword = input.confirmPassword;

  if (password.length < 8) {
    return invalid(`New password must be at least 8 characters`, {
      password: `Use at least 8 characters`,
    });
  }
  if (password !== confirmPassword) {
    return invalid(`New password and confirmation do not match`, {
      confirmPassword: `Passwords must match`,
    });
  }
  if (currentPassword && currentPassword === password) {
    return invalid(`New password must be different from the current password`, {
      password: `Choose a different password`,
    });
  }

  const baseUrl = configuredBaseUrl();
  if (!baseUrl) {
    return {
      ok: false,
      error: { code: `CONFIG_ERROR`, message: `API base URL is not configured` },
    };
  }

  const response = await fetch(`${baseUrl}/consumer/profile/password`, {
    method: `PATCH`,
    headers: {
      'content-type': `application/json`,
      ...(await consumerMutationHeaders()),
    },
    body: JSON.stringify({
      ...(currentPassword ? { currentPassword } : {}),
      password,
    }),
    cache: `no-store`,
  });

  if (!response.ok) {
    const error = await parseError(response, `Failed to update password`);
    return { ok: false, error };
  }

  return { ok: true, message: `Password updated. Please sign in again.` };
}
