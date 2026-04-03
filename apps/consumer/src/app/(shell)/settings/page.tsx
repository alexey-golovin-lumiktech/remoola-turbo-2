import { type Metadata } from 'next';

import ProfileSettingsClient from './components/ProfileSettingsClient';
import styles from '../../../components/ui/classNames.module.css';

const { pageSubtitle, settingsPageContainer, settingsPageTitle } = styles;

export const metadata: Metadata = {
  title: `Settings - Remoola`,
};

interface SettingsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function hasTruthyQueryFlag(value: string | string[] | undefined) {
  return (
    value === `1` || value === `true` || (Array.isArray(value) && value.some((item) => item === `1` || item === `true`))
  );
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const params = searchParams ? await searchParams : {};
  const logoutAllFailed = hasTruthyQueryFlag(params.logout_all_failed);
  return (
    <div className={settingsPageContainer} data-testid="consumer-settings-page">
      <h1 className={settingsPageTitle}>Profile Settings</h1>
      <p className={pageSubtitle}>Manage your personal details, account security, and preferences.</p>
      <ProfileSettingsClient logoutAllFailed={logoutAllFailed} />
    </div>
  );
}
