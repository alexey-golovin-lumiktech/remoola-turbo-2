'use client';

import { type Dispatch, type SetStateAction } from 'react';

import { Panel } from '../../../../shared/ui/shell-primitives';
import { updateProfilePhoneValue, type ProfileForm } from '../settings-view-model';
import { fieldInputClass, fieldLabelClass, primaryButtonClass } from './settings-class-tokens';

export function SettingsProfileForm({
  profileForm,
  setProfileForm,
  isPending,
  profileChangeCount,
  onSaveProfile,
}: {
  profileForm: ProfileForm;
  setProfileForm: Dispatch<SetStateAction<ProfileForm>>;
  isPending: boolean;
  profileChangeCount: number;
  onSaveProfile: () => void;
}) {
  return (
    <Panel title="Edit profile">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className={fieldLabelClass} htmlFor="settings-first-name">
              First name
            </label>
            <input
              id="settings-first-name"
              value={profileForm.firstName}
              onChange={(event) => setProfileForm((current) => ({ ...current, firstName: event.target.value }))}
              placeholder="First name"
              className={fieldInputClass}
            />
          </div>
          <div>
            <label className={fieldLabelClass} htmlFor="settings-last-name">
              Last name
            </label>
            <input
              id="settings-last-name"
              value={profileForm.lastName}
              onChange={(event) => setProfileForm((current) => ({ ...current, lastName: event.target.value }))}
              placeholder="Last name"
              className={fieldInputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className={fieldLabelClass} htmlFor="settings-phone-number">
              Phone number
            </label>
            <input
              id="settings-phone-number"
              value={profileForm.phoneNumber}
              inputMode="tel"
              onChange={(event) =>
                setProfileForm((current) => ({ ...current, phoneNumber: updateProfilePhoneValue(event.target.value) }))
              }
              placeholder="Phone number"
              className={fieldInputClass}
            />
            <div className="mt-2 text-xs text-(--app-text-faint)">Stored as digits with optional leading +.</div>
          </div>
          <div>
            <label className={fieldLabelClass} htmlFor="settings-company-name">
              Company name
            </label>
            <input
              id="settings-company-name"
              value={profileForm.companyName}
              onChange={(event) => setProfileForm((current) => ({ ...current, companyName: event.target.value }))}
              placeholder="Company name"
              className={fieldInputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className={fieldLabelClass} htmlFor="settings-country">
              Country
            </label>
            <input
              id="settings-country"
              value={profileForm.country}
              onChange={(event) => setProfileForm((current) => ({ ...current, country: event.target.value }))}
              placeholder="Country"
              className={fieldInputClass}
            />
          </div>
          <div>
            <label className={fieldLabelClass} htmlFor="settings-city">
              City
            </label>
            <input
              id="settings-city"
              value={profileForm.city}
              onChange={(event) => setProfileForm((current) => ({ ...current, city: event.target.value }))}
              placeholder="City"
              className={fieldInputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_0.4fr]">
          <div>
            <label className={fieldLabelClass} htmlFor="settings-street">
              Street
            </label>
            <input
              id="settings-street"
              value={profileForm.street}
              onChange={(event) => setProfileForm((current) => ({ ...current, street: event.target.value }))}
              placeholder="Street"
              className={fieldInputClass}
            />
          </div>
          <div>
            <label className={fieldLabelClass} htmlFor="settings-postal-code">
              Postal code
            </label>
            <input
              id="settings-postal-code"
              value={profileForm.postalCode}
              onChange={(event) => setProfileForm((current) => ({ ...current, postalCode: event.target.value }))}
              placeholder="Postal code"
              className={fieldInputClass}
            />
          </div>
        </div>

        <button
          type="button"
          disabled={isPending || profileChangeCount === 0}
          onClick={onSaveProfile}
          className={primaryButtonClass}
        >
          {isPending ? `Saving...` : profileChangeCount === 0 ? `No profile changes yet` : `Save profile`}
        </button>
      </div>
    </Panel>
  );
}
