import { type ComponentProps } from 'react';

import { type HelpInlineGuides } from '../../../../features/help/ui';

export type SettingsMessage = { type: `error` | `success`; text: string };

export type HelpGuides = ComponentProps<typeof HelpInlineGuides>[`guides`];

export type PasswordPanelCopy = {
  panelTitle: string;
  securitySummary: string;
  buttonIdle: string;
  buttonReady: string;
  helperText: string;
};
