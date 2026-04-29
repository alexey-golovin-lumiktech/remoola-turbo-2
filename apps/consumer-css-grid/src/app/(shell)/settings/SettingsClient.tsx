'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';

import { AUTH_NOTICE_QUERY } from '@remoola/api-types';

import { getSettingsVerificationCardState, normalizeTheme } from './settings-helpers';
import {
  SettingsActionHub,
  SettingsHelpPanel,
  SettingsMessageBanner,
  SettingsPasswordFormPanel,
  SettingsPreferencesPanel,
  SettingsProfileForm,
  SettingsSessionManagementPanel,
  SettingsSignOutAllModal,
  SettingsSummaryCards,
  SettingsVerificationPanel,
} from './settings-panels';
import {
  getInitialPasswordForm,
  getInitialPreferencesForm,
  getInitialProfileForm,
  getPasswordValidity,
  getPreferencesChanges,
  getProfileChanges,
} from './settings-view-model';
import { getPasswordPanelCopy } from '../../../features/auth/recovery';
import { getContextualHelpGuides, HELP_CONTEXT_ROUTE } from '../../../features/help/get-contextual-help-guides';
import { HELP_GUIDE_SLUG } from '../../../features/help/guide-registry';
import { type ProfileResponse, type SettingsResponse } from '../../../lib/consumer-api.server';
import {
  changePasswordMutation,
  updateProfileMutation,
  updateSettingsMutation,
} from '../../../lib/consumer-mutations.server';
import { submitPostNavigation } from '../../../lib/post-navigation';
import { handleSessionExpiredError } from '../../../lib/session-expired';
import { useTheme } from '../../../shared/theme/ThemeProvider';

type Props = {
  profile: ProfileResponse | null;
  settings: SettingsResponse | null;
  logoutAllFailed?: boolean;
};

const LOGOUT_ALL_FAILED_QUERY = `logout_all_failed`;

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
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [signOutAllConfirmOpen, setSignOutAllConfirmOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const savedTheme = normalizeTheme(settings?.theme);

  const [profileForm, setProfileForm] = useState(() => getInitialProfileForm(profile));
  const [preferencesForm, setPreferencesForm] = useState(() => getInitialPreferencesForm(settings, theme));
  const [passwordForm, setPasswordForm] = useState(() => getInitialPasswordForm());

  const profileChanges = useMemo(() => getProfileChanges(profileForm, profile), [profile, profileForm]);
  const preferencesChanges = useMemo(
    () => getPreferencesChanges(preferencesForm, settings, savedTheme),
    [preferencesForm, savedTheme, settings],
  );
  const passwordValidity = useMemo(
    () => getPasswordValidity(passwordForm, profile?.hasPassword),
    [passwordForm, profile?.hasPassword],
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

  const passwordPanelCopy = getPasswordPanelCopy(profile?.hasPassword);
  const fullName = [profile?.personalDetails?.firstName, profile?.personalDetails?.lastName].filter(Boolean).join(` `);
  const verificationCardState = getSettingsVerificationCardState(profile?.verification);
  const settingsHelpGuides = getContextualHelpGuides({
    route: HELP_CONTEXT_ROUTE.SETTINGS,
    preferredSlugs: [HELP_GUIDE_SLUG.SETTINGS_PROFILE_AND_SECURITY, HELP_GUIDE_SLUG.VERIFICATION_HOW_IT_WORKS],
    limit: 3,
  });
  const settingsVerificationHelpGuides = getContextualHelpGuides({
    route: HELP_CONTEXT_ROUTE.SETTINGS,
    preferredSlugs: [HELP_GUIDE_SLUG.VERIFICATION_HOW_IT_WORKS, HELP_GUIDE_SLUG.SETTINGS_PROFILE_AND_SECURITY],
    limit: 2,
  });
  const settingsPasswordHelpGuides = getContextualHelpGuides({
    route: HELP_CONTEXT_ROUTE.SETTINGS,
    preferredSlugs: [HELP_GUIDE_SLUG.SETTINGS_PROFILE_AND_SECURITY, HELP_GUIDE_SLUG.VERIFICATION_HOW_IT_WORKS],
    limit: 2,
  });

  const handleSaveProfile = () => {
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
  };

  const handleSavePreferences = () => {
    setMessage(null);
    setIsSavingPreferences(true);
    startTransition(async () => {
      try {
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
      } finally {
        setIsSavingPreferences(false);
      }
    });
  };

  const handleChangePassword = () => {
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
  };

  return (
    <div className="space-y-5">
      <SettingsMessageBanner message={message} />
      <SettingsHelpPanel guides={settingsHelpGuides} />

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.9fr_1.1fr]" data-testid={`settings-action-hub`}>
        <SettingsActionHub />
        <SettingsVerificationPanel
          profile={profile}
          verificationCardState={verificationCardState}
          helpGuides={settingsVerificationHelpGuides}
        />
      </section>

      <SettingsSummaryCards
        profile={profile}
        settings={settings}
        savedTheme={savedTheme}
        fullName={fullName}
        passwordPanelCopy={passwordPanelCopy}
      />

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <SettingsProfileForm
          profileForm={profileForm}
          setProfileForm={setProfileForm}
          isPending={isPending}
          profileChangeCount={Object.keys(profileChanges).length}
          onSaveProfile={handleSaveProfile}
        />
        <SettingsPreferencesPanel
          preferencesForm={preferencesForm}
          setPreferencesForm={setPreferencesForm}
          isPending={isPending}
          isSavingPreferences={isSavingPreferences}
          preferenceChangeCount={Object.keys(preferencesChanges).length}
          onSavePreferences={handleSavePreferences}
          onThemeChange={(themeOption) => {
            const nextTheme = normalizeTheme(themeOption);
            setPreferencesForm((current) => ({ ...current, theme: nextTheme }));
            setTheme(nextTheme);
          }}
        />
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <SettingsPasswordFormPanel
          profile={profile}
          passwordForm={passwordForm}
          setPasswordForm={setPasswordForm}
          passwordValidity={passwordValidity}
          passwordPanelCopy={passwordPanelCopy}
          isPending={isPending}
          helpGuides={settingsPasswordHelpGuides}
          onChangePassword={handleChangePassword}
        />
        <SettingsSessionManagementPanel
          passwordPanelCopy={passwordPanelCopy}
          isSigningOutAll={isSigningOutAll}
          onOpenSignOutAll={() => setSignOutAllConfirmOpen(true)}
        />
      </section>

      {signOutAllConfirmOpen ? (
        <SettingsSignOutAllModal
          isSigningOutAll={isSigningOutAll}
          onCancel={() => {
            setSignOutAllConfirmOpen(false);
            setMessage(null);
          }}
          onSubmit={() => {
            setIsSigningOutAll(true);
          }}
        />
      ) : null}
    </div>
  );
}
