import { ForbiddenException } from '@nestjs/common';

import { type AdminModel } from '@remoola/database-2';

export type AdminV2Role = `SUPER_ADMIN` | `OPS_ADMIN`;
export type AdminV2Capability = `me.read` | `consumers.read` | `consumers.notes` | `consumers.flags` | `audit.read`;

const MVP1A_CAPABILITIES: AdminV2Capability[] = [
  `me.read`,
  `consumers.read`,
  `consumers.notes`,
  `consumers.flags`,
  `audit.read`,
];

function resolveRole(type: AdminModel[`type`]): AdminV2Role | null {
  if (type === `SUPER`) return `SUPER_ADMIN`;
  if (type === `ADMIN`) return `OPS_ADMIN`;
  return null;
}

export function getAdminV2AccessProfile(admin: Pick<AdminModel, `type`>) {
  const role = resolveRole(admin.type);
  const capabilities = role ? MVP1A_CAPABILITIES : [];
  const workspaces =
    capabilities.includes(`consumers.read`) || capabilities.includes(`audit.read`) ? [`consumers`, `audit`] : [];
  return {
    role,
    capabilities,
    workspaces,
  };
}

export function assertAdminV2Capability(admin: Pick<AdminModel, `type`>, capability: AdminV2Capability) {
  const profile = getAdminV2AccessProfile(admin);
  if (!profile.capabilities.includes(capability)) {
    throw new ForbiddenException(`Admin is not allowed to access this MVP-1a surface`);
  }
  return profile;
}
