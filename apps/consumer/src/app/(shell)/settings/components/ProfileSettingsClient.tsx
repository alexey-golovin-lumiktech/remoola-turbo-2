'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import type { ConsumerSettingsResponse, TPreferredCurrency } from '@remoola/api-types';

import { AddressDetailsForm } from './AddressDetailsForm';
import { OrganizationDetailsForm } from './OrganizationDetailsForm';
import { PasswordChangeForm } from './PasswordChangeForm';
import { PersonalDetailsForm } from './PersonalDetailsForm';
import { PreferredCurrencySettingsForm } from './PreferredCurrencySettingsForm';
import { ThemeSettingsForm } from './ThemeSettingsForm';
import styles from '../../../../components/ui/classNames.module.css';

const { spaceY10, textSecondary } = styles;

export default function ProfileSettingsClient() {
  const [profile, setProfile] = useState<any>(null);
  const [settings, setSettings] = useState<ConsumerSettingsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);

    const response = await fetch(`/api/profile/me`, {
      method: `GET`,
      headers: { 'content-type': `application/json` },
      credentials: `include`,
    });

    if (!response.ok) {
      toast.error(`Failed to load profile`);
      setError(`Failed to load profile`);
      return;
    }

    setProfile(await response.json());
  }, []);

  const loadSettings = useCallback(async () => {
    const response = await fetch(`/api/settings`, {
      method: `GET`,
      headers: { 'content-type': `application/json` },
      credentials: `include`,
      cache: `no-store`,
    });
    if (!response.ok) return;
    const data = (await response.json()) as ConsumerSettingsResponse;
    setSettings(data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handlePreferredCurrencyUpdated = useCallback((preferredCurrency: TPreferredCurrency | null) => {
    setSettings((prev) => (prev ? { ...prev, preferredCurrency } : { theme: null, preferredCurrency }));
  }, []);

  if (error) {
    return <p className={textSecondary}>{error}</p>;
  }

  if (!profile) {
    return <p className={textSecondary}>Loading profile...</p>;
  }

  return (
    <div className={spaceY10}>
      <ThemeSettingsForm initialTheme={settings?.theme ?? undefined} />
      <PreferredCurrencySettingsForm
        preferredCurrency={settings?.preferredCurrency ?? null}
        onUpdated={handlePreferredCurrencyUpdated}
      />
      <PersonalDetailsForm profile={profile} reload={load} />
      <AddressDetailsForm profile={profile} reload={load} />
      {profile.accountType === `BUSINESS` && <OrganizationDetailsForm profile={profile} reload={load} />}

      <PasswordChangeForm reload={load} />
    </div>
  );
}
