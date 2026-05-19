'use client';

import { type ComponentProps } from 'react';

import { HelpContextualGuides } from '../../../../features/help/ui';

export function SettingsHelpPanel({ guides }: { guides: ComponentProps<typeof HelpContextualGuides>[`guides`] }) {
  return (
    <HelpContextualGuides
      guides={guides}
      compact
      title="Need help with profile, preferences, or security?"
      description="These guides explain how settings sections save independently, how verification status affects next steps, and why password changes return you to sign-in."
    />
  );
}
