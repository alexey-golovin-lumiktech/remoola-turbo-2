import { ForbiddenException } from '@nestjs/common';

import { type AdminModel } from '@remoola/database-2';

export type AdminV2Role = `SUPER_ADMIN` | `OPS_ADMIN`;
export type AdminV2Capability =
  | `me.read`
  | `overview.read`
  | `verification.read`
  | `consumers.read`
  | `payments.read`
  | `ledger.read`
  | `consumers.notes`
  | `consumers.flags`
  | `consumers.force_logout`
  | `audit.read`
  | `verification.decide`;

const READ_CAPABILITIES: AdminV2Capability[] = [
  `me.read`,
  `overview.read`,
  `verification.read`,
  `consumers.read`,
  `payments.read`,
  `ledger.read`,
  `consumers.notes`,
  `consumers.flags`,
  `audit.read`,
];

const SUPER_ADMIN_CAPABILITIES: AdminV2Capability[] = [
  ...READ_CAPABILITIES,
  `consumers.force_logout`,
  `verification.decide`,
];

function resolveRole(type: AdminModel[`type`]): AdminV2Role | null {
  if (type === `SUPER`) return `SUPER_ADMIN`;
  if (type === `ADMIN`) return `OPS_ADMIN`;
  return null;
}

export function getAdminV2AccessProfile(admin: Pick<AdminModel, `type`>) {
  const role = resolveRole(admin.type);
  const capabilities =
    role === `SUPER_ADMIN` ? SUPER_ADMIN_CAPABILITIES : role === `OPS_ADMIN` ? READ_CAPABILITIES : [];
  const workspaces = [
    ...(capabilities.includes(`overview.read`) ? [`overview`] : []),
    ...(capabilities.includes(`verification.read`) ? [`verification`] : []),
    ...(capabilities.includes(`consumers.read`) ? [`consumers`] : []),
    ...(capabilities.includes(`payments.read`) ? [`payments`] : []),
    ...(capabilities.includes(`ledger.read`) ? [`ledger`] : []),
    ...(capabilities.includes(`audit.read`) ? [`audit`] : []),
  ];
  return {
    role,
    capabilities,
    workspaces,
  };
}

export function assertAdminV2Capability(admin: Pick<AdminModel, `type`>, capability: AdminV2Capability) {
  const profile = getAdminV2AccessProfile(admin);
  if (!profile.capabilities.includes(capability)) {
    throw new ForbiddenException(`Admin is not allowed to access this Admin v2 surface`);
  }
  return profile;
}
