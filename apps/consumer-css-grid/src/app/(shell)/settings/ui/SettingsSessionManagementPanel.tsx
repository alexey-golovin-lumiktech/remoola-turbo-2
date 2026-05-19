'use client';

import { dangerButtonClass, fieldCardClass, secondaryButtonClass } from './settings-class-tokens';
import { type PasswordPanelCopy } from './settings-types';
import { Panel } from '../../../../shared/ui/shell-primitives';

export function SettingsSessionManagementPanel({
  passwordPanelCopy,
  isSigningOutAll,
  onOpenSignOutAll,
}: {
  passwordPanelCopy: PasswordPanelCopy;
  isSigningOutAll: boolean;
  onOpenSignOutAll: () => void;
}) {
  return (
    <Panel title="Session management">
      <div className="space-y-3">
        <div className={fieldCardClass}>
          `Sign out this device` keeps the existing current-session logout behavior and only ends this browser session.
        </div>
        <div className={fieldCardClass}>
          `Sign out all devices` revokes every active consumer session, including this one, then returns to login with a
          notice.
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <form method="post" action="/logout">
            <button type="submit" className={secondaryButtonClass}>
              Sign out this device
            </button>
          </form>
          <button type="button" disabled={isSigningOutAll} onClick={onOpenSignOutAll} className={dangerButtonClass}>
            {isSigningOutAll ? `Signing out all devices...` : `Sign out all devices`}
          </button>
        </div>
        <div className="rounded-2xl border border-transparent bg-(--app-warning-soft) px-4 py-3 text-sm text-(--app-warning-text)">
          Password changes already revoke all sessions and redirect through the existing logout notice flow.
        </div>
        <div className={fieldCardClass}>{passwordPanelCopy.helperText}</div>
        <div className={fieldCardClass}>
          After a successful password change the app redirects through logout, clears cookies, and shows a login notice.
        </div>
        <div className={fieldCardClass}>Password updates use `PATCH /consumer/profile/password` in `api-v2`.</div>
      </div>
    </Panel>
  );
}
