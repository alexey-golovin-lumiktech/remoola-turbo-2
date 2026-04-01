'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { THEME, THEMES, type TTheme } from '@remoola/api-types';

import { useTheme } from './ThemeProvider';
import { updateSettingsMutation } from '../../lib/consumer-mutations.server';
import { handleSessionExpiredError } from '../../lib/session-expired';

const THEME_LABELS: Record<TTheme, string> = {
  [THEME.LIGHT]: `Light`,
  [THEME.DARK]: `Dark`,
  [THEME.SYSTEM]: `Use device`,
};

function normalizeTheme(value: string): TTheme {
  return THEMES.includes(value as TTheme) ? (value as TTheme) : THEME.SYSTEM;
}

export function ThemeQuickSwitch({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();

  return (
    <div className={compact ? `min-w-0` : `min-w-[170px]`}>
      <label
        className={`mb-1 block text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--app-text-faint)] ${
          compact ? `sr-only` : ``
        }`}
        htmlFor={compact ? `theme-switch-mobile` : `theme-switch-desktop`}
      >
        Theme
      </label>
      <select
        id={compact ? `theme-switch-mobile` : `theme-switch-desktop`}
        value={theme}
        disabled={isPending}
        onChange={(event) => {
          const nextTheme = normalizeTheme(event.target.value);
          const previousTheme = theme;
          setMessage(null);
          setTheme(nextTheme);

          startTransition(async () => {
            const result = await updateSettingsMutation({ theme: nextTheme });
            if (!result.ok) {
              if (handleSessionExpiredError(result.error)) return;
              setTheme(previousTheme);
              setMessage(`Theme sync failed`);
              return;
            }

            router.refresh();
          });
        }}
        className={`w-full rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-strong)] px-3 py-2.5 text-sm text-[var(--app-text)] shadow-[var(--app-shadow)] outline-none transition focus:border-[color:var(--app-primary)] focus:ring-4 focus:ring-[var(--app-focus)] disabled:cursor-not-allowed disabled:opacity-60 ${
          compact ? `max-w-[140px] pr-8 text-xs` : `pr-10`
        }`}
      >
        {THEMES.map((option) => (
          <option key={option} value={option}>
            {THEME_LABELS[option]}
          </option>
        ))}
      </select>
      {!compact && message ? <div className="mt-2 text-xs text-[var(--app-text-faint)]">{message}</div> : null}
    </div>
  );
}

export const THEME_OPTION_LABELS = THEME_LABELS;
