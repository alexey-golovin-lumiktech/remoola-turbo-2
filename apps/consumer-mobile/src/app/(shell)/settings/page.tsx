import { headers } from 'next/headers';

import { getProfile, getSettings, SettingsView } from '../../../features/settings';

export default async function SettingsPage() {
  const headersList = await headers();
  const cookie = headersList.get(`cookie`);
  const [profile, settings] = await Promise.all([getProfile(cookie), getSettings(cookie)]);
  return <SettingsView profile={profile} settings={settings} />;
}
