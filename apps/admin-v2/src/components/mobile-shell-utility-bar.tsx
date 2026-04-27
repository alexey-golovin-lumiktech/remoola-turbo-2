import { type ReactElement } from 'react';

import { MobileShellUtilityBarClient } from './mobile-shell-utility-bar-client';
import { ShellQuickActions } from './shell-quick-actions';
import { ShellSearchForm } from './shell-search-form';

type MobileShellUtilityBarProps = {
  activePath: string | null;
};

export function MobileShellUtilityBar({ activePath }: MobileShellUtilityBarProps): ReactElement {
  return (
    <MobileShellUtilityBarClient
      activePath={activePath}
      searchForm={<ShellSearchForm compact />}
      quickActions={<ShellQuickActions compact />}
    />
  );
}
