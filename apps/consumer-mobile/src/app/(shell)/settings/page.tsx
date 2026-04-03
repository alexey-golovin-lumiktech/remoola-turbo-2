import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { SESSION_EXPIRED_QUERY } from '@remoola/api-types';

import { getProfile, getSettings, deriveLoadState } from '../../../features/settings/queries';
import { SettingsView } from '../../../features/settings/ui/SettingsView';

interface SettingsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function hasTruthyQueryFlag(value: string | string[] | undefined) {
  return (
    value === `1` || value === `true` || (Array.isArray(value) && value.some((item) => item === `1` || item === `true`))
  );
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const headersList = await headers();
  const cookie = headersList.get(`cookie`);
  const [profileResult, settingsResult] = await Promise.all([getProfile(cookie), getSettings(cookie)]);
  const loadState = deriveLoadState(profileResult, settingsResult);
  const params = searchParams ? await searchParams : {};
  const logoutAllFailed = hasTruthyQueryFlag(params.logout_all_failed);

  if (loadState === `unauthorized`) {
    const next = encodeURIComponent(`/settings`);
    redirect(`/login?${SESSION_EXPIRED_QUERY}=1&next=${next}`);
  }

  const profile = profileResult.kind === `ok` ? profileResult.data : null;
  const settings = settingsResult.kind === `ok` ? settingsResult.data : null;
  return <SettingsView loadState={loadState} profile={profile} settings={settings} logoutAllFailed={logoutAllFailed} />;
}
