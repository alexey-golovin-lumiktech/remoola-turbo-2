import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { SESSION_EXPIRED_QUERY } from '@remoola/api-types';

import { getProfile, getSettings, deriveLoadState } from '../../../features/settings/queries';
import { SettingsView } from '../../../features/settings/ui/SettingsView';

export default async function SettingsPage() {
  const headersList = await headers();
  const cookie = headersList.get(`cookie`);
  const [profileResult, settingsResult] = await Promise.all([getProfile(cookie), getSettings(cookie)]);
  const loadState = deriveLoadState(profileResult, settingsResult);

  if (loadState === `unauthorized`) {
    const next = encodeURIComponent(`/settings`);
    redirect(`/login?${SESSION_EXPIRED_QUERY}=1&next=${next}`);
  }

  const profile = profileResult.kind === `ok` ? profileResult.data : null;
  const settings = settingsResult.kind === `ok` ? settingsResult.data : null;
  return <SettingsView loadState={loadState} profile={profile} settings={settings} />;
}
