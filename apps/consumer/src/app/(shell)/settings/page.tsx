import ProfileSettingsClient from './components/ProfileSettingsClient';
import styles from '../../../components/ui/classNames.module.css';

const { pageSubtitle, settingsPageContainer, settingsPageTitle } = styles;

export default async function SettingsPage() {
  return (
    <div className={settingsPageContainer} data-testid="consumer-settings-page">
      <h1 className={settingsPageTitle}>Profile Settings</h1>
      <p className={pageSubtitle}>Manage your personal details, password, and account preferences.</p>
      <ProfileSettingsClient />
    </div>
  );
}
