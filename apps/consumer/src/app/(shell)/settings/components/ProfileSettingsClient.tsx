'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { AddressDetailsForm } from './AddressDetailsForm';
import { OrganizationDetailsForm } from './OrganizationDetailsForm';
import { PasswordChangeForm } from './PasswordChangeForm';
import { PersonalDetailsForm } from './PersonalDetailsForm';

export default function ProfileSettingsClient() {
  const [profile, setProfile] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => void load(), []);

  async function load() {
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
  }

  if (error) {
    return <p className="text-red-600">{error}</p>;
  }

  if (!profile) {
    return <p className="text-gray-600">Loading profile...</p>;
  }

  return (
    <div className="space-y-10">
      <PersonalDetailsForm profile={profile} reload={load} />
      <AddressDetailsForm profile={profile} reload={load} />
      {profile.accountType === `BUSINESS` && <OrganizationDetailsForm profile={profile} reload={load} />}

      <PasswordChangeForm reload={load} />
    </div>
  );
}
