import ProfileSettingsClient from './components/ProfileSettingsClient';

export default async function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Profile Settings</h1>
      <ProfileSettingsClient />
    </div>
  );
}
