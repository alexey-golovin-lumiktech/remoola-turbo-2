'use client';

import { type Dispatch, type SetStateAction } from 'react';

import { CURRENCY_CODES, THEMES, type TTheme } from '@remoola/api-types';

import { fieldCardClass, fieldInputClass, fieldLabelClass, primaryButtonClass } from './settings-class-tokens';
import { THEME_OPTION_LABELS } from '../../../../shared/theme/ThemeQuickSwitch';
import { Panel } from '../../../../shared/ui/shell-primitives';
import { themeDescription, type PreferencesForm } from '../settings-view-model';

export function SettingsPreferencesPanel({
  preferencesForm,
  setPreferencesForm,
  isPending,
  isSavingPreferences,
  preferenceChangeCount,
  onSavePreferences,
  onThemeChange,
}: {
  preferencesForm: PreferencesForm;
  setPreferencesForm: Dispatch<SetStateAction<PreferencesForm>>;
  isPending: boolean;
  isSavingPreferences: boolean;
  preferenceChangeCount: number;
  onSavePreferences: () => void;
  onThemeChange: (theme: TTheme) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-5">
      <Panel title="Edit preferences">
        <div className="space-y-4" aria-busy={isSavingPreferences}>
          <div>
            <div className={fieldLabelClass}>Theme</div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {THEMES.map((themeOption) => {
                const active = preferencesForm.theme === themeOption;
                return (
                  <button
                    key={themeOption}
                    type="button"
                    disabled={isSavingPreferences}
                    onClick={() => onThemeChange(themeOption)}
                    className={`rounded-[24px] border px-4 py-4 text-left transition ${
                      active
                        ? `border-(--app-primary) bg-(--app-primary-soft) shadow-(--app-shadow)`
                        : `border-(--app-border) bg-(--app-surface) hover:bg-(--app-surface-strong)`
                    } disabled:cursor-not-allowed disabled:opacity-70`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-(--app-text)">{THEME_OPTION_LABELS[themeOption]}</div>
                      <div
                        className={`h-3 w-3 rounded-full ${
                          active ? `bg-(--app-primary)` : `border border-(--app-border-strong) bg-transparent`
                        }`}
                      />
                    </div>
                    <div className="mt-2 text-sm leading-6 text-(--app-text-muted)">
                      {themeDescription(themeOption)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.15fr_0.85fr]">
            <div className={fieldCardClass}>
              Current shell preview follows{` `}
              <strong className="text-(--app-text)">{THEME_OPTION_LABELS[preferencesForm.theme]}</strong>.
            </div>
            <div className={fieldCardClass}>
              `System` stays in sync with your device appearance and still persists as your account default.
            </div>
          </div>

          <div>
            <label className={fieldLabelClass} htmlFor="settings-preferred-currency">
              Preferred currency
            </label>
            <select
              id="settings-preferred-currency"
              disabled={isSavingPreferences}
              value={preferencesForm.preferredCurrency}
              onChange={(event) =>
                setPreferencesForm((current) => ({ ...current, preferredCurrency: event.target.value }))
              }
              className={fieldInputClass}
            >
              {CURRENCY_CODES.map((currencyCode) => (
                <option key={currencyCode} value={currencyCode}>
                  {currencyCode}
                </option>
              ))}
            </select>
          </div>

          <div className={fieldCardClass}>
            Theme and preferred currency map directly to `consumer/settings` in `api-v2`.
          </div>

          <button
            type="button"
            disabled={isPending || isSavingPreferences || preferenceChangeCount === 0}
            onClick={onSavePreferences}
            className={primaryButtonClass}
          >
            {isSavingPreferences
              ? `Saving preferences...`
              : preferenceChangeCount === 0
                ? `No preference changes yet`
                : `Save preferences`}
          </button>
        </div>
      </Panel>

      <Panel title="Theme guide" aside="Applies instantly">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {THEMES.map((themeOption) => (
            <div key={themeOption} className={fieldCardClass}>
              <div className="font-medium text-(--app-text)">{THEME_OPTION_LABELS[themeOption]}</div>
              <div className="mt-2 text-sm leading-6 text-(--app-text-muted)">{themeDescription(themeOption)}</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
