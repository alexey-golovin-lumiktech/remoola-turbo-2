import { THEME, type TTheme } from '@remoola/api-types';

import { getChangedPhoneField, getChangedTextField, normalizePhone } from './settings-helpers';
import { type ProfileResponse, type SettingsResponse } from '../../../lib/consumer-api.server';

export type ProfileForm = {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  companyName: string;
  country: string;
  city: string;
  street: string;
  postalCode: string;
};

export type PreferencesForm = {
  theme: TTheme;
  preferredCurrency: string;
};

export type PasswordForm = {
  currentPassword: string;
  password: string;
  confirmPassword: string;
};

export type PasswordValidity = {
  minLengthValid: boolean;
  matches: boolean;
  differsFromCurrent: boolean;
  hasChanges: boolean;
  formValid: boolean;
};

export function getInitialProfileForm(profile: ProfileResponse | null): ProfileForm {
  return {
    firstName: profile?.personalDetails?.firstName ?? ``,
    lastName: profile?.personalDetails?.lastName ?? ``,
    phoneNumber: profile?.personalDetails?.phoneNumber ?? ``,
    companyName: profile?.organizationDetails?.name ?? ``,
    country: profile?.addressDetails?.country ?? ``,
    city: profile?.addressDetails?.city ?? ``,
    street: profile?.addressDetails?.street ?? ``,
    postalCode: profile?.addressDetails?.postalCode ?? ``,
  };
}

export function getInitialPreferencesForm(settings: SettingsResponse | null, theme: TTheme): PreferencesForm {
  return {
    theme,
    preferredCurrency: settings?.preferredCurrency ?? `USD`,
  };
}

export function getInitialPasswordForm(): PasswordForm {
  return {
    currentPassword: ``,
    password: ``,
    confirmPassword: ``,
  };
}

export function getProfileChanges(profileForm: ProfileForm, profile: ProfileResponse | null) {
  const firstName = getChangedTextField(profileForm.firstName, profile?.personalDetails?.firstName ?? ``);
  const lastName = getChangedTextField(profileForm.lastName, profile?.personalDetails?.lastName ?? ``);
  const phoneNumber = getChangedPhoneField(profileForm.phoneNumber, profile?.personalDetails?.phoneNumber ?? ``);
  const companyName = getChangedTextField(profileForm.companyName, profile?.organizationDetails?.name ?? ``);
  const country = getChangedTextField(profileForm.country, profile?.addressDetails?.country ?? ``);
  const city = getChangedTextField(profileForm.city, profile?.addressDetails?.city ?? ``);
  const street = getChangedTextField(profileForm.street, profile?.addressDetails?.street ?? ``);
  const postalCode = getChangedTextField(profileForm.postalCode, profile?.addressDetails?.postalCode ?? ``);
  const personalDetails = {
    ...(firstName !== undefined ? { firstName } : {}),
    ...(lastName !== undefined ? { lastName } : {}),
    ...(phoneNumber !== undefined ? { phoneNumber } : {}),
  };
  const organizationDetails = {
    ...(companyName !== undefined ? { name: companyName } : {}),
  };
  const addressDetails = {
    ...(country !== undefined ? { country } : {}),
    ...(city !== undefined ? { city } : {}),
    ...(street !== undefined ? { street } : {}),
    ...(postalCode !== undefined ? { postalCode } : {}),
  };

  return {
    ...(Object.keys(personalDetails).length > 0 ? { personalDetails } : {}),
    ...(Object.keys(organizationDetails).length > 0 ? { organizationDetails } : {}),
    ...(Object.keys(addressDetails).length > 0 ? { addressDetails } : {}),
  };
}

export function getPreferencesChanges(
  preferencesForm: PreferencesForm,
  settings: SettingsResponse | null,
  savedTheme: TTheme,
) {
  return {
    ...(preferencesForm.theme !== savedTheme ? { theme: preferencesForm.theme } : {}),
    ...(preferencesForm.preferredCurrency !== (settings?.preferredCurrency ?? `USD`)
      ? { preferredCurrency: preferencesForm.preferredCurrency }
      : {}),
  };
}

export function getPasswordValidity(passwordForm: PasswordForm, hasPassword: boolean | undefined): PasswordValidity {
  const minLengthValid = passwordForm.password.length === 0 || passwordForm.password.length >= 8;
  const matches = passwordForm.confirmPassword.length === 0 || passwordForm.password === passwordForm.confirmPassword;
  const differsFromCurrent =
    passwordForm.currentPassword.length === 0 || passwordForm.currentPassword !== passwordForm.password;
  const hasChanges =
    passwordForm.password.length > 0 ||
    passwordForm.confirmPassword.length > 0 ||
    passwordForm.currentPassword.length > 0;
  const formValid =
    passwordForm.password.length >= 8 &&
    passwordForm.confirmPassword.length > 0 &&
    passwordForm.password === passwordForm.confirmPassword &&
    (!hasPassword || passwordForm.currentPassword.length > 0) &&
    differsFromCurrent;

  return {
    minLengthValid,
    matches,
    differsFromCurrent,
    hasChanges,
    formValid,
  };
}

export function displayValue(value: string | null | undefined, fallback = `Not set`) {
  return value && value.trim() !== `` ? value : fallback;
}

export function themeDescription(theme: TTheme) {
  switch (theme) {
    case THEME.LIGHT:
      return `Bright surfaces for daytime work and clearer contrast on the go.`;
    case THEME.DARK:
      return `Low-glare navy surfaces for late sessions and finance-heavy dashboards.`;
    default:
      return `Match the device appearance automatically and react to OS changes.`;
  }
}

export function updateProfilePhoneValue(value: string) {
  return normalizePhone(value);
}
