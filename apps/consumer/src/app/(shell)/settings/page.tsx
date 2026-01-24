import ProfileSettingsClient from './components/ProfileSettingsClient';
import { settingsPageContainer, settingsPageTitle } from '../../../components/ui/classNames';

export default async function SettingsPage() {
  return (
    <div className={settingsPageContainer}>
      <h1 className={settingsPageTitle}>Profile Settings</h1>
      <ProfileSettingsClient />
    </div>
  );
}
