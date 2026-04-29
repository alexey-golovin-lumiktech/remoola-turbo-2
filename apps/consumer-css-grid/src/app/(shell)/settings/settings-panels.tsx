'use client';

import Link from 'next/link';
import { type ComponentProps, type Dispatch, type SetStateAction } from 'react';

import { CURRENCY_CODES, THEMES, type TTheme } from '@remoola/api-types';

import { humanizeStatus, type SettingsVerificationCardState } from './settings-helpers';
import {
  displayValue,
  themeDescription,
  updateProfilePhoneValue,
  type PasswordForm,
  type PasswordValidity,
  type PreferencesForm,
  type ProfileForm,
} from './settings-view-model';
import { HelpContextualGuides, HelpInlineGuides } from '../../../features/help/ui';
import { type ProfileResponse, type SettingsResponse } from '../../../lib/consumer-api.server';
import { THEME_OPTION_LABELS } from '../../../shared/theme/ThemeQuickSwitch';
import { BankIcon } from '../../../shared/ui/icons/BankIcon';
import { DocumentIcon } from '../../../shared/ui/icons/DocumentIcon';
import { Panel } from '../../../shared/ui/shell-primitives';
import { DashboardVerificationAction } from '../dashboard/DashboardVerificationAction';

type SettingsMessage = { type: `error` | `success`; text: string };

type HelpGuides = ComponentProps<typeof HelpInlineGuides>[`guides`];

type PasswordPanelCopy = {
  panelTitle: string;
  securitySummary: string;
  buttonIdle: string;
  buttonReady: string;
  helperText: string;
};

const fieldLabelClass = `mb-2 block text-sm text-[var(--app-text-muted)]`;
const fieldInputClass = `w-full rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-strong)] px-4 py-3 text-[var(--app-text)] shadow-[var(--app-shadow)] outline-none placeholder:text-[var(--app-text-faint)] focus:border-[color:var(--app-primary)] focus:ring-4 focus:ring-[var(--app-focus)]`;
const fieldCardClass = `rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3 text-sm text-[var(--app-text-soft)]`;
const primaryButtonClass = `w-full rounded-2xl bg-[var(--app-primary)] px-4 py-3 font-medium text-[var(--app-primary-contrast)] disabled:cursor-not-allowed disabled:opacity-50`;
const secondaryButtonClass = `flex w-full items-center justify-center rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface)] px-4 py-3 text-sm font-medium text-[var(--app-text)] shadow-[var(--app-shadow)] transition hover:bg-[var(--app-surface-strong)]`;
const dangerButtonClass = `flex w-full items-center justify-center rounded-2xl border border-transparent bg-[var(--app-danger-soft)] px-4 py-3 text-sm font-medium text-[var(--app-danger-text)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60`;

export function SettingsMessageBanner({ message }: { message: SettingsMessage | null }) {
  if (!message) return null;

  return (
    <div
      className={
        message.type === `error`
          ? `rounded-2xl border border-transparent bg-[var(--app-danger-soft)] px-4 py-3 text-sm text-[var(--app-danger-text)]`
          : `rounded-2xl border border-transparent bg-[var(--app-success-soft)] px-4 py-3 text-sm text-[var(--app-success-text)]`
      }
    >
      {message.text}
    </div>
  );
}

export function SettingsHelpPanel({ guides }: { guides: ComponentProps<typeof HelpContextualGuides>[`guides`] }) {
  return (
    <HelpContextualGuides
      guides={guides}
      compact
      title="Need help with profile, preferences, or security?"
      description="These guides explain how settings sections save independently, how verification status affects next steps, and why password changes return you to sign-in."
    />
  );
}

export function SettingsActionHub() {
  return (
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
  );
}

export function SettingsVerificationPanel({
  profile,
  verificationCardState,
  helpGuides,
}: {
  profile: ProfileResponse | null;
  verificationCardState: SettingsVerificationCardState;
  helpGuides: HelpGuides;
}) {
  return (
    <div data-testid={`settings-verification-card`}>
      <Panel title="Account verification" aside={verificationCardState.badge}>
        <div className="space-y-4">
          <div className={`rounded-2xl border px-4 py-4 ${verificationCardState.toneClassName}`}>
            <div className="text-sm font-semibold text-[var(--app-text)]">{verificationCardState.title}</div>
            <p className="mt-2 text-sm leading-6 text-[var(--app-text-muted)]">{verificationCardState.description}</p>
            <div className="mt-3 text-xs text-[var(--app-text-faint)]">
              Current status: {humanizeStatus(profile?.verification?.status, `Unknown`)}
            </div>
          </div>

          {verificationCardState.showAction ? (
            <DashboardVerificationAction verification={profile?.verification} dashboardUnavailable={false} />
          ) : null}
          <HelpInlineGuides guides={helpGuides} title="Need help interpreting this verification state?" />
        </div>
      </Panel>
    </div>
  );
}

export function SettingsSummaryCards({
  profile,
  settings,
  savedTheme,
  fullName,
  passwordPanelCopy,
}: {
  profile: ProfileResponse | null;
  settings: SettingsResponse | null;
  savedTheme: TTheme;
  fullName: string;
  passwordPanelCopy: PasswordPanelCopy;
}) {
  return (
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
  );
}

export function SettingsProfileForm({
  profileForm,
  setProfileForm,
  isPending,
  profileChangeCount,
  onSaveProfile,
}: {
  profileForm: ProfileForm;
  setProfileForm: Dispatch<SetStateAction<ProfileForm>>;
  isPending: boolean;
  profileChangeCount: number;
  onSaveProfile: () => void;
}) {
  return (
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
                setProfileForm((current) => ({ ...current, phoneNumber: updateProfilePhoneValue(event.target.value) }))
              }
              placeholder="Phone number"
              className={fieldInputClass}
            />
            <div className="mt-2 text-xs text-[var(--app-text-faint)]">Stored as digits with optional leading +.</div>
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
          disabled={isPending || profileChangeCount === 0}
          onClick={onSaveProfile}
          className={primaryButtonClass}
        >
          {isPending ? `Saving...` : profileChangeCount === 0 ? `No profile changes yet` : `Save profile`}
        </button>
      </div>
    </Panel>
  );
}

export function SettingsPreferencesPanel({
  preferencesForm,
  setPreferencesForm,
  isPending,
  isSavingPreferences,
  preferenceChangeCount,
  onSavePreferences,
  onThemeChange,
}: {
  preferencesForm: PreferencesForm;
  setPreferencesForm: Dispatch<SetStateAction<PreferencesForm>>;
  isPending: boolean;
  isSavingPreferences: boolean;
  preferenceChangeCount: number;
  onSavePreferences: () => void;
  onThemeChange: (theme: TTheme) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-5">
      <Panel title="Edit preferences">
        <div className="space-y-4" aria-busy={isSavingPreferences}>
          <div>
            <div className={fieldLabelClass}>Theme</div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {THEMES.map((themeOption) => {
                const active = preferencesForm.theme === themeOption;
                return (
                  <button
                    key={themeOption}
                    type="button"
                    disabled={isSavingPreferences}
                    onClick={() => onThemeChange(themeOption)}
                    className={`rounded-[24px] border px-4 py-4 text-left transition ${
                      active
                        ? `border-[color:var(--app-primary)] bg-[var(--app-primary-soft)] shadow-[var(--app-shadow)]`
                        : `border-[color:var(--app-border)] bg-[var(--app-surface)] hover:bg-[var(--app-surface-strong)]`
                    } disabled:cursor-not-allowed disabled:opacity-70`}
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
              disabled={isSavingPreferences}
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
            disabled={isPending || isSavingPreferences || preferenceChangeCount === 0}
            onClick={onSavePreferences}
            className={primaryButtonClass}
          >
            {isSavingPreferences
              ? `Saving preferences...`
              : preferenceChangeCount === 0
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
              <div className="mt-2 text-sm leading-6 text-[var(--app-text-muted)]">{themeDescription(themeOption)}</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

export function SettingsPasswordFormPanel({
  profile,
  passwordForm,
  setPasswordForm,
  passwordValidity,
  passwordPanelCopy,
  isPending,
  helpGuides,
  onChangePassword,
}: {
  profile: ProfileResponse | null;
  passwordForm: PasswordForm;
  setPasswordForm: Dispatch<SetStateAction<PasswordForm>>;
  passwordValidity: PasswordValidity;
  passwordPanelCopy: PasswordPanelCopy;
  isPending: boolean;
  helpGuides: HelpGuides;
  onChangePassword: () => void;
}) {
  return (
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
              onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))}
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
              aria-invalid={!passwordValidity.minLengthValid || !passwordValidity.differsFromCurrent}
              className={fieldInputClass}
            />
            {passwordForm.password.length > 0 ? (
              <div
                className={`mt-2 text-xs ${
                  passwordValidity.minLengthValid && passwordValidity.differsFromCurrent
                    ? `text-[var(--app-text-faint)]`
                    : `text-[var(--app-danger-text)]`
                }`}
              >
                {!passwordValidity.minLengthValid
                  ? `Use at least 8 characters.`
                  : !passwordValidity.differsFromCurrent
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
              onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))}
              placeholder="Confirm password"
              aria-invalid={!passwordValidity.matches}
              className={fieldInputClass}
            />
            {passwordForm.confirmPassword.length > 0 ? (
              <div
                className={`mt-2 text-xs ${
                  passwordValidity.matches ? `text-[var(--app-text-faint)]` : `text-[var(--app-danger-text)]`
                }`}
              >
                {passwordValidity.matches ? `Passwords match.` : `Passwords must match exactly.`}
              </div>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          disabled={isPending || !passwordValidity.formValid}
          onClick={onChangePassword}
          className={primaryButtonClass}
        >
          {isPending
            ? `Saving...`
            : !passwordValidity.hasChanges
              ? passwordPanelCopy.buttonIdle
              : passwordValidity.formValid
                ? passwordPanelCopy.buttonReady
                : `Complete password requirements`}
        </button>
        <HelpInlineGuides guides={helpGuides} title="Need help with password rules or what happens after save?" />
      </div>
    </Panel>
  );
}

export function SettingsSessionManagementPanel({
  passwordPanelCopy,
  isSigningOutAll,
  onOpenSignOutAll,
}: {
  passwordPanelCopy: PasswordPanelCopy;
  isSigningOutAll: boolean;
  onOpenSignOutAll: () => void;
}) {
  return (
    <Panel title="Session management">
      <div className="space-y-3">
        <div className={fieldCardClass}>
          `Sign out this device` keeps the existing current-session logout behavior and only ends this browser session.
        </div>
        <div className={fieldCardClass}>
          `Sign out all devices` revokes every active consumer session, including this one, then returns to login with a
          notice.
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <form method="post" action="/logout">
            <button type="submit" className={secondaryButtonClass}>
              Sign out this device
            </button>
          </form>
          <button type="button" disabled={isSigningOutAll} onClick={onOpenSignOutAll} className={dangerButtonClass}>
            {isSigningOutAll ? `Signing out all devices...` : `Sign out all devices`}
          </button>
        </div>
        <div className="rounded-2xl border border-transparent bg-[var(--app-warning-soft)] px-4 py-3 text-sm text-[var(--app-warning-text)]">
          Password changes already revoke all sessions and redirect through the existing logout notice flow.
        </div>
        <div className={fieldCardClass}>{passwordPanelCopy.helperText}</div>
        <div className={fieldCardClass}>
          After a successful password change the app redirects through logout, clears cookies, and shows a login notice.
        </div>
        <div className={fieldCardClass}>Password updates use `PATCH /consumer/profile/password` in `api-v2`.</div>
      </div>
    </Panel>
  );
}

export function SettingsSignOutAllModal({
  isSigningOutAll,
  onCancel,
  onSubmit,
}: {
  isSigningOutAll: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
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
          This will revoke every active consumer session across phones, tablets, and browsers, including this device.
          You will need to sign in again everywhere.
        </p>

        <div className="mt-4 space-y-3">
          <div className={fieldCardClass}>
            Use this if you think another device is still signed in or you want to reset all active sessions at once.
          </div>
          <div className="rounded-2xl border border-transparent bg-[var(--app-warning-soft)] px-4 py-3 text-sm text-[var(--app-warning-text)]">
            Your current session will end immediately after confirmation.
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button type="button" disabled={isSigningOutAll} onClick={onCancel} className={secondaryButtonClass}>
            Keep me signed in
          </button>
          <form method="post" action="/logout-all" onSubmit={onSubmit}>
            <button type="submit" disabled={isSigningOutAll} className={dangerButtonClass}>
              {isSigningOutAll ? `Signing out all devices...` : `Yes, sign out all devices`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
