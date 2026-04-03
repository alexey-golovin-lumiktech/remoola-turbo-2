'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  type ConsumerSettingsResponse,
  type TCurrencyCode,
  ACCOUNT_TYPE,
  isUnauthorizedError,
} from '@remoola/api-types';

import { AddressDetailsForm } from './AddressDetailsForm';
import { OrganizationDetailsForm } from './OrganizationDetailsForm';
import { PasswordChangeForm } from './PasswordChangeForm';
import { PersonalDetailsForm } from './PersonalDetailsForm';
import { PreferredCurrencySettingsForm } from './PreferredCurrencySettingsForm';
import localStyles from './ProfileSettingsClient.module.css';
import { ThemeSettingsForm } from './ThemeSettingsForm';
import styles from '../../../../components/ui/classNames.module.css';
import { apiClient } from '../../../../lib/api';
import { handleSessionExpired, isRedirectInProgress } from '../../../../lib/session-expired';
import { type ConsumerProfile } from '../../../../types';

const { textSecondary, primaryButtonClass, themeCard, themeDescription, themeTitle } = styles;

export type LoadState = `loading` | `ready` | `unauthorized` | `error`;

const PROFILE_ME_URL = `/api/profile/me`;
const SETTINGS_URL = `/api/settings`;

/** Map profile API response to load state. Used by component and tests. */
export function mapProfileResponseToLoadState(
  response: { ok: true; data: ConsumerProfile } | { ok: false; status: number; error?: { message?: string } },
): { state: LoadState; profile?: ConsumerProfile; errorMessage?: string } {
  if (response.ok) {
    return { state: `ready`, profile: response.data };
  }
  if (isUnauthorizedError({ status: response.status })) {
    return { state: `unauthorized` };
  }
  const message =
    response.error?.message && typeof response.error.message === `string`
      ? response.error.message
      : `Failed to load profile`;
  return { state: `error`, errorMessage: message };
}

/** Map settings endpoint response to load state semantics. */
export function mapSettingsResponseToLoadState(response: {
  ok: boolean;
  status: number;
}): Exclude<LoadState, `loading` | `ready`> | `ready` {
  if (isUnauthorizedError({ status: response.status })) return `unauthorized`;
  if (!response.ok) return `error`;
  return `ready`;
}

/** Terminal states should be rendered only when auth/load truth is resolved. */
export function isTerminalSettingsState(state: LoadState): boolean {
  return state === `unauthorized` || state === `error`;
}

export default function ProfileSettingsClient({ logoutAllFailed = false }: { logoutAllFailed?: boolean }) {
  const [loadState, setLoadState] = useState<LoadState>(`loading`);
  const [profile, setProfile] = useState<ConsumerProfile | null>(null);
  const [settings, setSettings] = useState<ConsumerSettingsResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [logoutAllErrorVisible, setLogoutAllErrorVisible] = useState(logoutAllFailed);

  const loadProfile = useCallback(async () => {
    setLoadState(`loading`);
    setErrorMessage(null);

    const response = await apiClient.get<ConsumerProfile>(PROFILE_ME_URL, { skipCache: true });
    const mapped = mapProfileResponseToLoadState(response);

    if (mapped.state === `unauthorized` && response.ok === false && response.status === 401) {
      if (!isRedirectInProgress()) handleSessionExpired();
    }
    setLoadState(mapped.state);
    if (mapped.profile) setProfile(mapped.profile);
    if (mapped.errorMessage) setErrorMessage(mapped.errorMessage);
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const response = await fetch(SETTINGS_URL, {
        method: `GET`,
        headers: { 'content-type': `application/json` },
        credentials: `include`,
        cache: `no-store`,
      });
      const mapped = mapSettingsResponseToLoadState({ ok: response.ok, status: response.status });
      if (mapped === `unauthorized`) {
        if (!isRedirectInProgress()) handleSessionExpired();
        setLoadState(`unauthorized`);
        return;
      }
      if (mapped === `error`) {
        setErrorMessage(`Failed to load settings`);
        setLoadState(`error`);
        return;
      }
      const data = (await response.json()) as ConsumerSettingsResponse;
      setSettings(data);
    } catch {
      setErrorMessage(`Failed to load settings`);
      setLoadState(`error`);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (loadState === `ready` && profile) void loadSettings();
  }, [loadState, profile, loadSettings]);

  useEffect(() => {
    setLogoutAllErrorVisible(logoutAllFailed);
    if (!logoutAllFailed || typeof window === `undefined`) return;

    const url = new URL(window.location.href);
    if (!url.searchParams.has(`logout_all_failed`)) return;
    url.searchParams.delete(`logout_all_failed`);
    window.history.replaceState(null, ``, url.pathname + (url.search || ``));
  }, [logoutAllFailed]);

  const handlePreferredCurrencyUpdated = useCallback((preferredCurrency: TCurrencyCode | null) => {
    setSettings((prev) => (prev ? { ...prev, preferredCurrency } : { theme: null, preferredCurrency }));
  }, []);

  if (loadState === `unauthorized`) {
    return (
      <p className={textSecondary} data-testid="settings-unauthorized" role="status" aria-live="polite">
        Session expired. Redirecting…
      </p>
    );
  }

  if (loadState === `error`) {
    return (
      <div className={textSecondary} data-testid="settings-error" role="alert">
        <p>{errorMessage ?? `Failed to load profile`}</p>
        <button type="button" onClick={() => void loadProfile()} className={primaryButtonClass}>
          Retry
        </button>
      </div>
    );
  }

  if (loadState === `loading` || loadState !== `ready` || !profile) {
    return (
      <p className={textSecondary} role="status" aria-live="polite">
        Loading profile...
      </p>
    );
  }

  return (
    <div className={localStyles.settingsReady} data-testid="settings-ready">
      {logoutAllErrorVisible ? (
        <div
          className={
            `rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 ` +
            `dark:border-red-800 dark:bg-red-900/20 dark:text-red-300`
          }
          role="alert"
          data-testid="consumer-settings-logout-all-error"
        >
          <div className="flex items-center justify-between gap-3">
            <span>We couldn&apos;t sign out all devices right now. Your current session is still active.</span>
            <button
              type="button"
              className="shrink-0 text-xs font-medium underline dark:text-red-200"
              onClick={() => setLogoutAllErrorVisible(false)}
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}
      {settings && <ThemeSettingsForm initialTheme={settings.theme} />}
      <PreferredCurrencySettingsForm
        preferredCurrency={settings?.preferredCurrency ?? null}
        onUpdated={handlePreferredCurrencyUpdated}
      />
      <PersonalDetailsForm profile={profile} reload={loadProfile} />
      <AddressDetailsForm profile={profile} reload={loadProfile} />
      {profile.accountType === ACCOUNT_TYPE.BUSINESS && (
        <OrganizationDetailsForm profile={profile} reload={loadProfile} />
      )}

      <PasswordChangeForm reload={loadProfile} hasPassword={profile.hasPassword !== false} />

      <section className={`${themeCard} space-y-3`}>
        <h2 className={themeTitle}>Session Management</h2>
        <p className={themeDescription}>
          Sign out this browser only, or revoke every active consumer session across devices.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <form method="post" action="/logout">
            <button type="submit" className={primaryButtonClass}>
              Sign Out This Device
            </button>
          </form>
          <form method="post" action="/logout-all">
            <button
              type="submit"
              className={primaryButtonClass}
              onClick={(event) => {
                if (!window.confirm(`Sign out all devices? You will need to sign in again everywhere.`)) {
                  event.preventDefault();
                }
              }}
            >
              Sign Out All Devices
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
