'use client';

import { type HelpGuides } from './settings-types';
import { HelpInlineGuides } from '../../../../features/help/ui';
import { type ProfileResponse } from '../../../../lib/consumer-api.server';
import { Panel } from '../../../../shared/ui/shell-panel';
import { DashboardVerificationAction } from '../../dashboard/DashboardVerificationAction';
import { humanizeStatus, type SettingsVerificationCardState } from '../settings-helpers';

export function SettingsVerificationPanel({
  profile,
  verificationCardState,
  helpGuides,
}: {
  profile: ProfileResponse | null;
  verificationCardState: SettingsVerificationCardState;
  helpGuides: HelpGuides;
}) {
  return (
    <div data-testid={`settings-verification-card`}>
      <Panel title="Account verification" aside={verificationCardState.badge}>
        <div className="space-y-4">
          <div className={`rounded-2xl border px-4 py-4 ${verificationCardState.toneClassName}`}>
            <div className="text-sm font-semibold text-(--app-text)">{verificationCardState.title}</div>
            <p className="mt-2 text-sm leading-6 text-(--app-text-muted)">{verificationCardState.description}</p>
            <div className="mt-3 text-xs text-(--app-text-faint)">
              Current status: {humanizeStatus(profile?.verification?.status, `Unknown`)}
            </div>
          </div>

          {verificationCardState.showAction ? (
            <DashboardVerificationAction verification={profile?.verification} dashboardUnavailable={false} />
          ) : null}
          <HelpInlineGuides guides={helpGuides} title="Need help interpreting this verification state?" />
        </div>
      </Panel>
    </div>
  );
}
