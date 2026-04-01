import { SettingsClient } from './SettingsClient';
import { getProfile, getSettings } from '../../../lib/consumer-api.server';
import { SettingsIcon } from '../../../shared/ui/icons/SettingsIcon';
import { PageHeader } from '../../../shared/ui/shell-primitives';

interface SettingsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function hasTruthyQueryFlag(value: string | string[] | undefined) {
  return (
    value === `1` || value === `true` || (Array.isArray(value) && value.some((item) => item === `1` || item === `true`))
  );
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const [profile, settings] = await Promise.all([
    getProfile({ redirectTo: `/settings` }),
    getSettings({ redirectTo: `/settings` }),
  ]);
  const params = searchParams ? await searchParams : {};
  const logoutAllFailed = hasTruthyQueryFlag(params.logout_all_failed);

  return (
    <div>
      <PageHeader title="Settings" icon={<SettingsIcon className="h-10 w-10 text-white" />} />
      <SettingsClient profile={profile} settings={settings} logoutAllFailed={logoutAllFailed} />
    </div>
  );
}
