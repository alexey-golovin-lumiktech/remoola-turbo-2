import { ForbiddenException } from '@nestjs/common';

import { getAdminV2AccessProfile, type AdminV2Capability } from '@remoola/api-types';

export * from '@remoola/api-types';

export function assertAdminV2Capability(admin: { type: string }, capability: AdminV2Capability) {
  const profile = getAdminV2AccessProfile(admin);
  if (!profile.capabilities.includes(capability)) {
    throw new ForbiddenException(`Admin is not allowed to access this Admin v2 surface`);
  }
  return profile;
}
