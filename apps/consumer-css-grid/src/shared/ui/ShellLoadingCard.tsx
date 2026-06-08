import { type ReactNode } from 'react';

import { SHELL_LOADING_CARD_CLASS } from './shell-layout-tokens';

export function ShellLoadingCard({ children }: { children: ReactNode }) {
  return <div className={SHELL_LOADING_CARD_CLASS}>{children}</div>;
}
