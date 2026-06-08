'use client';

import { type Dispatch, type SetStateAction } from 'react';

import { fieldInputClass, fieldLabelClass, primaryButtonClass } from './settings-class-tokens';
import { type HelpGuides, type PasswordPanelCopy } from './settings-types';
import { HelpInlineGuides } from '../../../../features/help/ui';
import { type ProfileResponse } from '../../../../lib/consumer-api.server';
import { shellGridForm2 } from '../../../../shared/ui/shell-grid-tokens';
import { Panel } from '../../../../shared/ui/shell-primitives';
import { type PasswordForm, type PasswordValidity } from '../settings-view-model';

export function SettingsPasswordFormPanel({
  profile,
  passwordForm,
  setPasswordForm,
  passwordValidity,
  passwordPanelCopy,
  isPending,
  helpGuides,
  onChangePassword,
}: {
  profile: ProfileResponse | null;
  passwordForm: PasswordForm;
  setPasswordForm: Dispatch<SetStateAction<PasswordForm>>;
  passwordValidity: PasswordValidity;
  passwordPanelCopy: PasswordPanelCopy;
  isPending: boolean;
  helpGuides: HelpGuides;
  onChangePassword: () => void;
}) {
  return (
    <Panel title={passwordPanelCopy.panelTitle}>
      <div className="space-y-4">
        {profile?.hasPassword ? (
          <div>
            <label className={fieldLabelClass} htmlFor="settings-current-password">
              Current password
            </label>
            <input
              id="settings-current-password"
              type="password"
              value={passwordForm.currentPassword}
              onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))}
              placeholder="Current password"
              className={fieldInputClass}
            />
          </div>
        ) : null}

        <div className={shellGridForm2}>
          <div>
            <label className={fieldLabelClass} htmlFor="settings-new-password">
              {profile?.hasPassword ? `New password` : `Create password`}
            </label>
            <input
              id="settings-new-password"
              type="password"
              value={passwordForm.password}
              onChange={(event) => setPasswordForm((current) => ({ ...current, password: event.target.value }))}
              placeholder={profile?.hasPassword ? `New password` : `Create password`}
              aria-invalid={!passwordValidity.minLengthValid || !passwordValidity.differsFromCurrent}
              className={fieldInputClass}
            />
            {passwordForm.password.length > 0 ? (
              <div
                className={`mt-2 text-xs ${
                  passwordValidity.minLengthValid && passwordValidity.differsFromCurrent
                    ? `text-(--app-text-faint)`
                    : `text-(--app-danger-text)`
                }`}
              >
                {!passwordValidity.minLengthValid
                  ? `Use at least 8 characters.`
                  : !passwordValidity.differsFromCurrent
                    ? `New password must differ from the current password.`
                    : `Password length looks good.`}
              </div>
            ) : null}
          </div>

          <div>
            <label className={fieldLabelClass} htmlFor="settings-confirm-password">
              Confirm password
            </label>
            <input
              id="settings-confirm-password"
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))}
              placeholder="Confirm password"
              aria-invalid={!passwordValidity.matches}
              className={fieldInputClass}
            />
            {passwordForm.confirmPassword.length > 0 ? (
              <div
                className={`mt-2 text-xs ${
                  passwordValidity.matches ? `text-(--app-text-faint)` : `text-(--app-danger-text)`
                }`}
              >
                {passwordValidity.matches ? `Passwords match.` : `Passwords must match exactly.`}
              </div>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          disabled={isPending || !passwordValidity.formValid}
          onClick={onChangePassword}
          className={primaryButtonClass}
        >
          {isPending
            ? `Saving...`
            : !passwordValidity.hasChanges
              ? passwordPanelCopy.buttonIdle
              : passwordValidity.formValid
                ? passwordPanelCopy.buttonReady
                : `Complete password requirements`}
        </button>
        <HelpInlineGuides guides={helpGuides} title="Need help with password rules or what happens after save?" />
      </div>
    </Panel>
  );
}
