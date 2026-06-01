import { getAdminIdentity } from '../../../../lib/admin-api/identity.server';

export type LedgerAnomaliesPagePermissions = {
  canManageSavedViews: boolean;
};

export async function loadLedgerAnomaliesPermissions(): Promise<LedgerAnomaliesPagePermissions> {
  const identity = await getAdminIdentity();
  return {
    canManageSavedViews: identity?.capabilities.includes(`saved_views.manage`) ?? false,
  };
}
