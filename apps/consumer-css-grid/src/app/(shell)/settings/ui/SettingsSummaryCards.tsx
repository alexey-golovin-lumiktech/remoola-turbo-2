'use client';

import { type TTheme } from '@remoola/api-types';

import { fieldCardClass } from './settings-class-tokens';
import { type PasswordPanelCopy } from './settings-types';
import { type ProfileResponse, type SettingsResponse } from '../../../../lib/consumer-api.server';
import { THEME_OPTION_LABELS } from '../../../../shared/theme/ThemeQuickSwitch';
import { Panel } from '../../../../shared/ui/shell-panel';
import { displayValue } from '../settings-view-model';

export function SettingsSummaryCards({
  profile,
  settings,
  savedTheme,
  fullName,
  passwordPanelCopy,
}: {
  profile: ProfileResponse | null;
  settings: SettingsResponse | null;
  savedTheme: TTheme;
  fullName: string;
  passwordPanelCopy: PasswordPanelCopy;
}) {
  return (
    <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
      <Panel title="Profile">
        <div className="space-y-3">
          <div className={fieldCardClass}>{displayValue(fullName, `Name not completed`)}</div>
          <div className={fieldCardClass}>
            {displayValue(profile?.organizationDetails?.name, `Company details not completed`)}
          </div>
          <div className={fieldCardClass}>
            {displayValue(profile?.addressDetails?.country, `Address details not completed`)}
          </div>
        </div>
      </Panel>

      <Panel title="Security">
        <div className="space-y-3">
          <div className={fieldCardClass}>Password: {passwordPanelCopy.securitySummary}</div>
          <div className={fieldCardClass}>Verification: {displayValue(profile?.verification?.status, `Unknown`)}</div>
          <div className={fieldCardClass}>
            Profile completeness: {profile?.verification?.profileComplete ? `Complete` : `Incomplete`}
          </div>
          <div className="rounded-2xl border border-transparent bg-(--app-warning-soft) px-4 py-3 text-sm text-(--app-warning-text)">
            Changing the password signs out the current session and requires a fresh login.
          </div>
        </div>
      </Panel>

      <Panel title="Preferences">
        <div className="space-y-3">
          <div className={fieldCardClass}>Theme: {THEME_OPTION_LABELS[savedTheme]}</div>
          <div className={fieldCardClass}>Preferred currency: {displayValue(settings?.preferredCurrency, `USD`)}</div>
          <div className={fieldCardClass}>Account type: {displayValue(profile?.accountType, `Unknown`)}</div>
        </div>
      </Panel>
    </section>
  );
}
