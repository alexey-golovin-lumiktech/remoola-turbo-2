import { headers } from 'next/headers';

import { getProfile, getSettings } from '../../../features/settings/queries';
import { SettingsView } from '../../../features/settings/ui/SettingsView';

export default async function SettingsPage() {
  const headersList = await headers();
  const cookie = headersList.get(`cookie`);
  const [profile, settings] = await Promise.all([getProfile(cookie), getSettings(cookie)]);
  return <SettingsView profile={profile} settings={settings} />;
}
