import { type AdminCasePageData } from './page.loader';
import { ADMIN_CAPABILITIES, hasAdminCapability } from '../../../../lib/admin-capabilities';

export type AdminCasePagePermissions = {
  canManage: boolean;
  canReadSessions: boolean;
  isSelf: boolean;
};

export function deriveAdminCasePagePermissions(
  identity: AdminCasePageData[`identity`],
  admin: AdminCasePageData[`admin`],
): AdminCasePagePermissions {
  const canManage = hasAdminCapability(identity, ADMIN_CAPABILITIES.adminsManage);
  const canReadSessions = hasAdminCapability(identity, ADMIN_CAPABILITIES.adminsRead);
  const isSelf = identity?.id === admin.core.id;
  return { canManage, canReadSessions, isSelf };
}
