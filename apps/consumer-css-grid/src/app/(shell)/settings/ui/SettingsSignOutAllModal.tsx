'use client';

import { dangerButtonClass, fieldCardClass, secondaryButtonClass } from './settings-class-tokens';

export function SettingsSignOutAllModal({
  isSigningOutAll,
  onCancel,
  onSubmit,
}: {
  isSigningOutAll: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/75 p-3 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-sign-out-all-title"
        aria-describedby="settings-sign-out-all-description"
        className="w-full max-w-xl rounded-[28px] border border-(--app-border) bg-(--app-shell) p-5 shadow-2xl"
      >
        <div className="inline-flex rounded-full border border-transparent bg-(--app-danger-soft) px-3 py-1 text-xs font-medium text-(--app-danger-text)">
          Session security
        </div>
        <h2 id="settings-sign-out-all-title" className="mt-4 text-2xl font-semibold tracking-tight text-(--app-text)">
          Sign out all devices?
        </h2>
        <p id="settings-sign-out-all-description" className="mt-3 text-sm leading-7 text-(--app-text-muted)">
          This will revoke every active consumer session across phones, tablets, and browsers, including this device.
          You will need to sign in again everywhere.
        </p>

        <div className="mt-4 space-y-3">
          <div className={fieldCardClass}>
            Use this if you think another device is still signed in or you want to reset all active sessions at once.
          </div>
          <div className="rounded-2xl border border-transparent bg-(--app-warning-soft) px-4 py-3 text-sm text-(--app-warning-text)">
            Your current session will end immediately after confirmation.
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button type="button" disabled={isSigningOutAll} onClick={onCancel} className={secondaryButtonClass}>
            Keep me signed in
          </button>
          <form method="post" action="/logout-all" onSubmit={onSubmit}>
            <button type="submit" disabled={isSigningOutAll} className={dangerButtonClass}>
              {isSigningOutAll ? `Signing out all devices...` : `Yes, sign out all devices`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
