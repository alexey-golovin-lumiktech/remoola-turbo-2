import { getAdminIdentity } from '../../../../lib/admin-api/identity.server';
import { ADMIN_CAPABILITIES, hasAdminCapability } from '../../../../lib/admin-capabilities';

export type LedgerAnomaliesPagePermissions = {
  canManageSavedViews: boolean;
};

export async function loadLedgerAnomaliesPermissions(): Promise<LedgerAnomaliesPagePermissions> {
  const identity = await getAdminIdentity();
  return {
    canManageSavedViews: hasAdminCapability(identity, ADMIN_CAPABILITIES.savedViewsManage),
  };
}
