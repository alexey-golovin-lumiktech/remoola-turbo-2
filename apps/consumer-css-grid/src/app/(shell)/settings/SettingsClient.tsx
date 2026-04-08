'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';

import { AUTH_NOTICE_QUERY, CURRENCY_CODES, THEME, THEMES, type TTheme } from '@remoola/api-types';

import { getPasswordPanelCopy } from '../../../features/auth/recovery';
import { type ProfileResponse, type SettingsResponse } from '../../../lib/consumer-api.server';
import {
  changePasswordMutation,
  updateProfileMutation,
  updateSettingsMutation,
} from '../../../lib/consumer-mutations.server';
import { submitPostNavigation } from '../../../lib/post-navigation';
import { handleSessionExpiredError } from '../../../lib/session-expired';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { THEME_OPTION_LABELS } from '../../../shared/theme/ThemeQuickSwitch';
import { BankIcon } from '../../../shared/ui/icons/BankIcon';
import { DocumentIcon } from '../../../shared/ui/icons/DocumentIcon';
import { Panel } from '../../../shared/ui/shell-primitives';
import { DashboardVerificationAction } from '../dashboard/DashboardVerificationAction';

type Props = {
  profile: ProfileResponse | null;
  settings: SettingsResponse | null;
  logoutAllFailed?: boolean;
};

const LOGOUT_ALL_FAILED_QUERY = `logout_all_failed`;

function normalizeText(value: string) {
  return value.trim();
}

function normalizePhone(value: string) {
  const trimmed = value.trimStart();
  const digits = trimmed.replace(/\D/g, ``).slice(0, 15);
  if (!digits) return ``;
  return trimmed.startsWith(`+`) ? `+${digits}` : digits;
}

function displayValue(value: string | null | undefined, fallback = `Not set`) {
  return value && value.trim() !== `` ? value : fallback;
}

function normalizeTheme(value: string | null | undefined): TTheme {
  return THEMES.includes(value as TTheme) ? (value as TTheme) : THEME.SYSTEM;
}

function themeDescription(theme: TTheme) {
  switch (theme) {
    case THEME.LIGHT:
      return `Bright surfaces for daytime work and clearer contrast on the go.`;
    case THEME.DARK:
      return `Low-glare navy surfaces for late sessions and finance-heavy dashboards.`;
    default:
      return `Match the device appearance automatically and react to OS changes.`;
  }
}

function humanizeStatus(value: string | null | undefined, fallback = `Unknown`) {
  if (!value) {
    return fallback;
  }

  const normalized = value.replaceAll(`_`, ` `).toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

type SettingsVerificationCardState = {
  badge: string;
  title: string;
  description: string;
  toneClassName: string;
  showAction: boolean;
};

function getSettingsVerificationCardState(
  verification: ProfileResponse[`verification`] | null | undefined,
): SettingsVerificationCardState {
  if (!verification) {
    return {
      badge: `Unavailable`,
      title: `Verification status unavailable`,
      description: `We couldn't load your verification state right now. Refresh the page to try again.`,
      toneClassName: `border-[color:var(--app-border)] bg-[var(--app-surface-muted)]`,
      showAction: false,
    };
  }

  const reviewStatus = verification.reviewStatus?.toLowerCase();

  if (verification.effectiveVerified) {
    return {
      badge: `Verified`,
      title: `Account verified`,
      description: `Your identity check is complete and full account functionality is available.`,
      toneClassName: `border-transparent bg-[var(--app-success-soft)]`,
      showAction: false,
    };
  }

  if (reviewStatus === `pending`) {
    return {
      badge: `In review`,
      title: `Verification in review`,
      description: `Your submitted details are being reviewed. We'll update your status as soon as processing finishes.`,
      toneClassName: `border-transparent bg-[var(--app-warning-soft)]`,
      showAction: false,
    };
  }

  if (!verification.profileComplete && verification.canStart === false) {
    return {
      badge: `Profile incomplete`,
      title: `Complete your profile first`,
      description: `Add the missing profile details below before starting identity verification.`,
      toneClassName: `border-transparent bg-[var(--app-warning-soft)]`,
      showAction: false,
    };
  }

  if (verification.canStart) {
    switch (verification.status) {
      case `requires_input`:
      case `more_info`:
        return {
          badge: `Action required`,
          title: `Verification needs attention`,
          description:
            verification.lastErrorReason ??
            `Additional verification details are required before higher account access can be enabled.`,
          toneClassName: `border-transparent bg-[var(--app-danger-soft)]`,
          showAction: true,
        };
      case `pending_submission`:
        return {
          badge: `In progress`,
          title: `Continue your verification`,
          description: `Your profile is ready. Resume the verification flow and submit the remaining details.`,
          toneClassName: `border-transparent bg-[var(--app-warning-soft)]`,
          showAction: true,
        };
      case `rejected`:
      case `flagged`:
        return {
          badge: `Needs retry`,
          title: `Verification needs to be retried`,
          description:
            verification.lastErrorReason ?? `Review the requested details and retry verification to continue.`,
          toneClassName: `border-transparent bg-[var(--app-danger-soft)]`,
          showAction: true,
        };
      default:
        return {
          badge: humanizeStatus(verification.status, `Not started`),
          title: `Start account verification`,
          description: `Verify your identity to unlock the full set of payment and account capabilities.`,
          toneClassName: `border-transparent bg-[var(--app-warning-soft)]`,
          showAction: true,
        };
    }
  }

  return {
    badge: humanizeStatus(verification.status, `Unknown`),
    title: `Verification status: ${humanizeStatus(verification.status, `Unknown`)}`,
    description: `We'll show your next verification step here as soon as it becomes available.`,
    toneClassName: `border-[color:var(--app-border)] bg-[var(--app-surface-muted)]`,
    showAction: false,
  };
}

function getChangedTextField(current: string, initial: string) {
  const normalizedCurrent = normalizeText(current);
  const normalizedInitial = normalizeText(initial);
  if (normalizedCurrent === normalizedInitial) {
    return undefined;
  }
  return normalizedCurrent;
}

function getChangedPhoneField(current: string, initial: string) {
  const normalizedCurrent = normalizePhone(current);
  const normalizedInitial = normalizePhone(initial);
  if (normalizedCurrent === normalizedInitial) {
    return undefined;
  }
  return normalizedCurrent;
}

export function SettingsClient({ profile, settings, logoutAllFailed = false }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: `error` | `success`; text: string } | null>(
    logoutAllFailed
      ? {
          type: `error`,
          text: `We couldn't sign out all devices right now. Your current session is still active.`,
        }
      : null,
  );
  const [isSigningOutAll, setIsSigningOutAll] = useState(false);
  const [signOutAllConfirmOpen, setSignOutAllConfirmOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const savedTheme = normalizeTheme(settings?.theme);

  const [profileForm, setProfileForm] = useState({
    firstName: profile?.personalDetails?.firstName ?? ``,
    lastName: profile?.personalDetails?.lastName ?? ``,
    phoneNumber: profile?.personalDetails?.phoneNumber ?? ``,
    companyName: profile?.organizationDetails?.name ?? ``,
    country: profile?.addressDetails?.country ?? ``,
    city: profile?.addressDetails?.city ?? ``,
    street: profile?.addressDetails?.street ?? ``,
    postalCode: profile?.addressDetails?.postalCode ?? ``,
  });
  const [preferencesForm, setPreferencesForm] = useState({
    theme,
    preferredCurrency: settings?.preferredCurrency ?? `USD`,
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: ``,
    password: ``,
    confirmPassword: ``,
  });

  const profileChanges = useMemo(() => {
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
  }, [profile, profileForm]);

  const preferencesChanges = useMemo(
    () => ({
      ...(preferencesForm.theme !== savedTheme ? { theme: preferencesForm.theme } : {}),
      ...(preferencesForm.preferredCurrency !== (settings?.preferredCurrency ?? `USD`)
        ? { preferredCurrency: preferencesForm.preferredCurrency }
        : {}),
    }),
    [preferencesForm, savedTheme, settings],
  );

  useEffect(() => {
    setPreferencesForm((current) => (current.theme === theme ? current : { ...current, theme }));
  }, [theme]);

  useEffect(() => {
    if (!logoutAllFailed || typeof window === `undefined`) return;

    const url = new URL(window.location.href);
    if (!url.searchParams.has(LOGOUT_ALL_FAILED_QUERY)) return;
    url.searchParams.delete(LOGOUT_ALL_FAILED_QUERY);
    window.history.replaceState(null, ``, url.pathname + (url.search || ``));
  }, [logoutAllFailed]);

  useEffect(() => {
    if (!signOutAllConfirmOpen || typeof window === `undefined`) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === `Escape` && !isSigningOutAll) {
        setSignOutAllConfirmOpen(false);
      }
    };

    window.addEventListener(`keydown`, handleKeyDown);
    return () => window.removeEventListener(`keydown`, handleKeyDown);
  }, [isSigningOutAll, signOutAllConfirmOpen]);

  const passwordMinLengthValid = passwordForm.password.length === 0 || passwordForm.password.length >= 8;
  const passwordMatches =
    passwordForm.confirmPassword.length === 0 || passwordForm.password === passwordForm.confirmPassword;
  const passwordDiffersFromCurrent =
    passwordForm.currentPassword.length === 0 || passwordForm.currentPassword !== passwordForm.password;
  const passwordHasChanges =
    passwordForm.password.length > 0 ||
    passwordForm.confirmPassword.length > 0 ||
    passwordForm.currentPassword.length > 0;
  const passwordFormValid =
    passwordForm.password.length >= 8 &&
    passwordForm.confirmPassword.length > 0 &&
    passwordForm.password === passwordForm.confirmPassword &&
    (!profile?.hasPassword || passwordForm.currentPassword.length > 0) &&
    passwordDiffersFromCurrent;
  const passwordPanelCopy = getPasswordPanelCopy(profile?.hasPassword);

  const fullName = [profile?.personalDetails?.firstName, profile?.personalDetails?.lastName].filter(Boolean).join(` `);
  const fieldLabelClass = `mb-2 block text-sm text-[var(--app-text-muted)]`;
  const fieldInputClass = `w-full rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-strong)] px-4 py-3 text-[var(--app-text)] shadow-[var(--app-shadow)] outline-none placeholder:text-[var(--app-text-faint)] focus:border-[color:var(--app-primary)] focus:ring-4 focus:ring-[var(--app-focus)]`;
  const fieldCardClass = `rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3 text-sm text-[var(--app-text-soft)]`;
  const primaryButtonClass = `w-full rounded-2xl bg-[var(--app-primary)] px-4 py-3 font-medium text-[var(--app-primary-contrast)] disabled:cursor-not-allowed disabled:opacity-50`;
  const secondaryButtonClass = `flex w-full items-center justify-center rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface)] px-4 py-3 text-sm font-medium text-[var(--app-text)] shadow-[var(--app-shadow)] transition hover:bg-[var(--app-surface-strong)]`;
  const dangerButtonClass = `flex w-full items-center justify-center rounded-2xl border border-transparent bg-[var(--app-danger-soft)] px-4 py-3 text-sm font-medium text-[var(--app-danger-text)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60`;
  const verificationCardState = getSettingsVerificationCardState(profile?.verification);

  return (
    <div className="space-y-5">
      {message ? (
        <div
          className={
            message.type === `error`
              ? `rounded-2xl border border-transparent bg-[var(--app-danger-soft)] px-4 py-3 text-sm text-[var(--app-danger-text)]`
              : `rounded-2xl border border-transparent bg-[var(--app-success-soft)] px-4 py-3 text-sm text-[var(--app-success-text)]`
          }
        >
          {message.text}
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.9fr_1.1fr]" data-testid={`settings-action-hub`}>
        <Panel title="Quick links" aside="Action hub">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              href="/banking"
              aria-label={`Payment methods — manage cards and bank accounts`}
              className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-4 transition hover:border-[color:var(--app-border-strong)] hover:bg-[var(--app-surface)]"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--app-primary-soft)] text-[var(--app-primary)]">
                  <BankIcon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-[var(--app-text)]">Payment methods</div>
                  <div className="mt-1 text-sm leading-6 text-[var(--app-text-muted)]">
                    Manage cards and bank accounts used across payouts and payment flows.
                  </div>
                </div>
              </div>
            </Link>

            <Link
              href="/documents"
              aria-label={`Documents — view and manage uploaded files`}
              className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-4 transition hover:border-[color:var(--app-border-strong)] hover:bg-[var(--app-surface)]"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--app-primary-soft)] text-[var(--app-primary)]">
                  <DocumentIcon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-[var(--app-text)]">Documents</div>
                  <div className="mt-1 text-sm leading-6 text-[var(--app-text-muted)]">
                    Open uploaded files, review generated docs, and keep compliance items moving.
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </Panel>

        <div data-testid={`settings-verification-card`}>
          <Panel title="Account verification" aside={verificationCardState.badge}>
            <div className="space-y-4">
              <div className={`rounded-2xl border px-4 py-4 ${verificationCardState.toneClassName}`}>
                <div className="text-sm font-semibold text-[var(--app-text)]">{verificationCardState.title}</div>
                <p className="mt-2 text-sm leading-6 text-[var(--app-text-muted)]">
                  {verificationCardState.description}
                </p>
                <div className="mt-3 text-xs text-[var(--app-text-faint)]">
                  Current status: {humanizeStatus(profile?.verification?.status, `Unknown`)}
                </div>
              </div>

              {verificationCardState.showAction ? (
                <DashboardVerificationAction verification={profile?.verification} dashboardUnavailable={false} />
              ) : null}
            </div>
          </Panel>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Panel title="Profile">
          <div className="space-y-3">
            <div className={fieldCardClass}>{displayValue(fullName, `Name not completed`)}</div>
            <div className={fieldCardClass}>
              {displayValue(profile?.organizationDetails?.name, `Company details not completed`)}
            </div>
            <div className={fieldCardClass}>
              {displayValue(profile?.addressDetails?.country, `Address details not completed`)}
            </div>
          </div>
        </Panel>

        <Panel title="Security">
          <div className="space-y-3">
            <div className={fieldCardClass}>Password: {passwordPanelCopy.securitySummary}</div>
            <div className={fieldCardClass}>Verification: {displayValue(profile?.verification?.status, `Unknown`)}</div>
            <div className={fieldCardClass}>
              Profile completeness: {profile?.verification?.profileComplete ? `Complete` : `Incomplete`}
            </div>
            <div className="rounded-2xl border border-transparent bg-[var(--app-warning-soft)] px-4 py-3 text-sm text-[var(--app-warning-text)]">
              Changing the password signs out the current session and requires a fresh login.
            </div>
          </div>
        </Panel>

        <Panel title="Preferences">
          <div className="space-y-3">
            <div className={fieldCardClass}>Theme: {THEME_OPTION_LABELS[savedTheme]}</div>
            <div className={fieldCardClass}>Preferred currency: {displayValue(settings?.preferredCurrency, `USD`)}</div>
            <div className={fieldCardClass}>Account type: {displayValue(profile?.accountType, `Unknown`)}</div>
          </div>
        </Panel>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel title="Edit profile">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className={fieldLabelClass} htmlFor="settings-first-name">
                  First name
                </label>
                <input
                  id="settings-first-name"
                  value={profileForm.firstName}
                  onChange={(event) => setProfileForm((current) => ({ ...current, firstName: event.target.value }))}
                  placeholder="First name"
                  className={fieldInputClass}
                />
              </div>
              <div>
                <label className={fieldLabelClass} htmlFor="settings-last-name">
                  Last name
                </label>
                <input
                  id="settings-last-name"
                  value={profileForm.lastName}
                  onChange={(event) => setProfileForm((current) => ({ ...current, lastName: event.target.value }))}
                  placeholder="Last name"
                  className={fieldInputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className={fieldLabelClass} htmlFor="settings-phone-number">
                  Phone number
                </label>
                <input
                  id="settings-phone-number"
                  value={profileForm.phoneNumber}
                  inputMode="tel"
                  onChange={(event) =>
                    setProfileForm((current) => ({ ...current, phoneNumber: normalizePhone(event.target.value) }))
                  }
                  placeholder="Phone number"
                  className={fieldInputClass}
                />
                <div className="mt-2 text-xs text-[var(--app-text-faint)]">
                  Stored as digits with optional leading +.
                </div>
              </div>
              <div>
                <label className={fieldLabelClass} htmlFor="settings-company-name">
                  Company name
                </label>
                <input
                  id="settings-company-name"
                  value={profileForm.companyName}
                  onChange={(event) => setProfileForm((current) => ({ ...current, companyName: event.target.value }))}
                  placeholder="Company name"
                  className={fieldInputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className={fieldLabelClass} htmlFor="settings-country">
                  Country
                </label>
                <input
                  id="settings-country"
                  value={profileForm.country}
                  onChange={(event) => setProfileForm((current) => ({ ...current, country: event.target.value }))}
                  placeholder="Country"
                  className={fieldInputClass}
                />
              </div>
              <div>
                <label className={fieldLabelClass} htmlFor="settings-city">
                  City
                </label>
                <input
                  id="settings-city"
                  value={profileForm.city}
                  onChange={(event) => setProfileForm((current) => ({ ...current, city: event.target.value }))}
                  placeholder="City"
                  className={fieldInputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_0.4fr]">
              <div>
                <label className={fieldLabelClass} htmlFor="settings-street">
                  Street
                </label>
                <input
                  id="settings-street"
                  value={profileForm.street}
                  onChange={(event) => setProfileForm((current) => ({ ...current, street: event.target.value }))}
                  placeholder="Street"
                  className={fieldInputClass}
                />
              </div>
              <div>
                <label className={fieldLabelClass} htmlFor="settings-postal-code">
                  Postal code
                </label>
                <input
                  id="settings-postal-code"
                  value={profileForm.postalCode}
                  onChange={(event) => setProfileForm((current) => ({ ...current, postalCode: event.target.value }))}
                  placeholder="Postal code"
                  className={fieldInputClass}
                />
              </div>
            </div>

            <button
              type="button"
              disabled={isPending || Object.keys(profileChanges).length === 0}
              onClick={() => {
                setMessage(null);
                startTransition(async () => {
                  const result = await updateProfileMutation(profileChanges);
                  if (!result.ok) {
                    if (handleSessionExpiredError(result.error)) return;
                    setMessage({ type: `error`, text: result.error.message });
                    return;
                  }
                  setMessage({ type: `success`, text: result.message ?? `Profile updated` });
                  router.refresh();
                });
              }}
              className={primaryButtonClass}
            >
              {isPending
                ? `Saving...`
                : Object.keys(profileChanges).length === 0
                  ? `No profile changes yet`
                  : `Save profile`}
            </button>
          </div>
        </Panel>

        <div className="grid grid-cols-1 gap-5">
          <Panel title="Edit preferences">
            <div className="space-y-4">
              <div>
                <div className={fieldLabelClass}>Theme</div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {THEMES.map((themeOption) => {
                    const active = preferencesForm.theme === themeOption;
                    return (
                      <button
                        key={themeOption}
                        type="button"
                        onClick={() => {
                          const nextTheme = normalizeTheme(themeOption);
                          setPreferencesForm((current) => ({ ...current, theme: nextTheme }));
                          setTheme(nextTheme);
                        }}
                        className={`rounded-[24px] border px-4 py-4 text-left transition ${
                          active
                            ? `border-[color:var(--app-primary)] bg-[var(--app-primary-soft)] shadow-[var(--app-shadow)]`
                            : `border-[color:var(--app-border)] bg-[var(--app-surface)] hover:bg-[var(--app-surface-strong)]`
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-[var(--app-text)]">
                            {THEME_OPTION_LABELS[themeOption]}
                          </div>
                          <div
                            className={`h-3 w-3 rounded-full ${
                              active
                                ? `bg-[var(--app-primary)]`
                                : `border border-[color:var(--app-border-strong)] bg-transparent`
                            }`}
                          />
                        </div>
                        <div className="mt-2 text-sm leading-6 text-[var(--app-text-muted)]">
                          {themeDescription(themeOption)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.15fr_0.85fr]">
                <div className={fieldCardClass}>
                  Current shell preview follows{` `}
                  <strong className="text-[var(--app-text)]">{THEME_OPTION_LABELS[preferencesForm.theme]}</strong>.
                </div>
                <div className={fieldCardClass}>
                  `System` stays in sync with your device appearance and still persists as your account default.
                </div>
              </div>

              <div>
                <label className={fieldLabelClass} htmlFor="settings-preferred-currency">
                  Preferred currency
                </label>
                <select
                  id="settings-preferred-currency"
                  value={preferencesForm.preferredCurrency}
                  onChange={(event) =>
                    setPreferencesForm((current) => ({ ...current, preferredCurrency: event.target.value }))
                  }
                  className={fieldInputClass}
                >
                  {CURRENCY_CODES.map((currencyCode) => (
                    <option key={currencyCode} value={currencyCode}>
                      {currencyCode}
                    </option>
                  ))}
                </select>
              </div>

              <div className={fieldCardClass}>
                Theme and preferred currency map directly to `consumer/settings` in `api-v2`.
              </div>

              <button
                type="button"
                disabled={isPending || Object.keys(preferencesChanges).length === 0}
                onClick={() => {
                  setMessage(null);
                  startTransition(async () => {
                    const result = await updateSettingsMutation(preferencesChanges);
                    if (!result.ok) {
                      if (handleSessionExpiredError(result.error)) return;
                      setTheme(savedTheme);
                      setPreferencesForm((current) => ({ ...current, theme: savedTheme }));
                      setMessage({ type: `error`, text: result.error.message });
                      return;
                    }
                    setMessage({ type: `success`, text: result.message ?? `Preferences updated` });
                    router.refresh();
                  });
                }}
                className={primaryButtonClass}
              >
                {isPending
                  ? `Saving...`
                  : Object.keys(preferencesChanges).length === 0
                    ? `No preference changes yet`
                    : `Save preferences`}
              </button>
            </div>
          </Panel>

          <Panel title="Theme guide" aside="Applies instantly">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {THEMES.map((themeOption) => (
                <div key={themeOption} className={fieldCardClass}>
                  <div className="font-medium text-[var(--app-text)]">{THEME_OPTION_LABELS[themeOption]}</div>
                  <div className="mt-2 text-sm leading-6 text-[var(--app-text-muted)]">
                    {themeDescription(themeOption)}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel title={passwordPanelCopy.panelTitle}>
          <div className="space-y-4">
            {profile?.hasPassword ? (
              <div>
                <label className={fieldLabelClass} htmlFor="settings-current-password">
                  Current password
                </label>
                <input
                  id="settings-current-password"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(event) =>
                    setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))
                  }
                  placeholder="Current password"
                  className={fieldInputClass}
                />
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className={fieldLabelClass} htmlFor="settings-new-password">
                  {profile?.hasPassword ? `New password` : `Create password`}
                </label>
                <input
                  id="settings-new-password"
                  type="password"
                  value={passwordForm.password}
                  onChange={(event) => setPasswordForm((current) => ({ ...current, password: event.target.value }))}
                  placeholder={profile?.hasPassword ? `New password` : `Create password`}
                  aria-invalid={!passwordMinLengthValid || !passwordDiffersFromCurrent}
                  className={fieldInputClass}
                />
                {passwordForm.password.length > 0 ? (
                  <div
                    className={`mt-2 text-xs ${
                      passwordMinLengthValid && passwordDiffersFromCurrent
                        ? `text-[var(--app-text-faint)]`
                        : `text-[var(--app-danger-text)]`
                    }`}
                  >
                    {!passwordMinLengthValid
                      ? `Use at least 8 characters.`
                      : !passwordDiffersFromCurrent
                        ? `New password must differ from the current password.`
                        : `Password length looks good.`}
                  </div>
                ) : null}
              </div>

              <div>
                <label className={fieldLabelClass} htmlFor="settings-confirm-password">
                  Confirm password
                </label>
                <input
                  id="settings-confirm-password"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(event) =>
                    setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))
                  }
                  placeholder="Confirm password"
                  aria-invalid={!passwordMatches}
                  className={fieldInputClass}
                />
                {passwordForm.confirmPassword.length > 0 ? (
                  <div
                    className={`mt-2 text-xs ${
                      passwordMatches ? `text-[var(--app-text-faint)]` : `text-[var(--app-danger-text)]`
                    }`}
                  >
                    {passwordMatches ? `Passwords match.` : `Passwords must match exactly.`}
                  </div>
                ) : null}
              </div>
            </div>

            <button
              type="button"
              disabled={isPending || !passwordFormValid}
              onClick={() => {
                setMessage(null);
                startTransition(async () => {
                  const result = await changePasswordMutation(passwordForm);
                  if (!result.ok) {
                    if (handleSessionExpiredError(result.error)) return;
                    setMessage({ type: `error`, text: result.error.message });
                    return;
                  }
                  submitPostNavigation(`/logout?${AUTH_NOTICE_QUERY}=password_changed`);
                });
              }}
              className={primaryButtonClass}
            >
              {isPending
                ? `Saving...`
                : !passwordHasChanges
                  ? passwordPanelCopy.buttonIdle
                  : passwordFormValid
                    ? passwordPanelCopy.buttonReady
                    : `Complete password requirements`}
            </button>
          </div>
        </Panel>

        <Panel title="Session management">
          <div className="space-y-3">
            <div className={fieldCardClass}>
              `Sign out this device` keeps the existing current-session logout behavior and only ends this browser
              session.
            </div>
            <div className={fieldCardClass}>
              `Sign out all devices` revokes every active consumer session, including this one, then returns to login
              with a notice.
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <form method="post" action="/logout">
                <button type="submit" className={secondaryButtonClass}>
                  Sign out this device
                </button>
              </form>
              <button
                type="button"
                disabled={isSigningOutAll}
                onClick={() => setSignOutAllConfirmOpen(true)}
                className={dangerButtonClass}
              >
                {isSigningOutAll ? `Signing out all devices...` : `Sign out all devices`}
              </button>
            </div>
            <div className="rounded-2xl border border-transparent bg-[var(--app-warning-soft)] px-4 py-3 text-sm text-[var(--app-warning-text)]">
              Password changes already revoke all sessions and redirect through the existing logout notice flow.
            </div>
            <div className={fieldCardClass}>{passwordPanelCopy.helperText}</div>
            <div className={fieldCardClass}>
              After a successful password change the app redirects through logout, clears cookies, and shows a login
              notice.
            </div>
            <div className={fieldCardClass}>Password updates use `PATCH /consumer/profile/password` in `api-v2`.</div>
          </div>
        </Panel>
      </section>

      {signOutAllConfirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/75 p-3 sm:items-center sm:p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-sign-out-all-title"
            aria-describedby="settings-sign-out-all-description"
            className="w-full max-w-xl rounded-[28px] border border-[color:var(--app-border)] bg-[var(--app-shell)] p-5 shadow-2xl"
          >
            <div className="inline-flex rounded-full border border-transparent bg-[var(--app-danger-soft)] px-3 py-1 text-xs font-medium text-[var(--app-danger-text)]">
              Session security
            </div>
            <h2
              id="settings-sign-out-all-title"
              className="mt-4 text-2xl font-semibold tracking-tight text-[var(--app-text)]"
            >
              Sign out all devices?
            </h2>
            <p id="settings-sign-out-all-description" className="mt-3 text-sm leading-7 text-[var(--app-text-muted)]">
              This will revoke every active consumer session across phones, tablets, and browsers, including this
              device. You will need to sign in again everywhere.
            </p>

            <div className="mt-4 space-y-3">
              <div className={fieldCardClass}>
                Use this if you think another device is still signed in or you want to reset all active sessions at
                once.
              </div>
              <div className="rounded-2xl border border-transparent bg-[var(--app-warning-soft)] px-4 py-3 text-sm text-[var(--app-warning-text)]">
                Your current session will end immediately after confirmation.
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled={isSigningOutAll}
                onClick={() => {
                  setSignOutAllConfirmOpen(false);
                  setMessage(null);
                }}
                className={secondaryButtonClass}
              >
                Keep me signed in
              </button>
              <form
                method="post"
                action="/logout-all"
                onSubmit={() => {
                  setIsSigningOutAll(true);
                }}
              >
                <button type="submit" disabled={isSigningOutAll} className={dangerButtonClass}>
                  {isSigningOutAll ? `Signing out all devices...` : `Yes, sign out all devices`}
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
