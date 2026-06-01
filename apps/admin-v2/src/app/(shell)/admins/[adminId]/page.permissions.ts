import { type AdminCasePageData } from './page.loader';

export type AdminCasePagePermissions = {
  canManage: boolean;
  canReadSessions: boolean;
  isSelf: boolean;
};

export function deriveAdminCasePagePermissions(
  identity: AdminCasePageData[`identity`],
  admin: AdminCasePageData[`admin`],
): AdminCasePagePermissions {
  const canManage = identity?.capabilities.includes(`admins.manage`) ?? false;
  const canReadSessions = identity?.capabilities.includes(`admins.read`) ?? false;
  const isSelf = identity?.id === admin.core.id;
  return { canManage, canReadSessions, isSelf };
}
