import { type ReactElement } from 'react';

import { type AdminIdentity } from '../lib/admin-api.server';

type MobileBottomNavProps = {
  identity: AdminIdentity | null;
  activePath?: string | null;
};

export function MobileBottomNav({ identity, activePath }: MobileBottomNavProps): ReactElement | null {
  void identity;
  void activePath;
  return null;
}
