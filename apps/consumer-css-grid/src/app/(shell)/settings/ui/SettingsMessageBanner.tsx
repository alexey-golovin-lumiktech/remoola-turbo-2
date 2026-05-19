'use client';

import { type SettingsMessage } from './settings-types';

export function SettingsMessageBanner({ message }: { message: SettingsMessage | null }) {
  if (!message) return null;

  return (
    <div
      className={
        message.type === `error`
          ? `rounded-2xl border border-transparent bg-(--app-danger-soft) px-4 py-3 text-sm text-(--app-danger-text)`
          : `rounded-2xl border border-transparent bg-(--app-success-soft) px-4 py-3 text-sm text-(--app-success-text)`
      }
    >
      {message.text}
    </div>
  );
}
