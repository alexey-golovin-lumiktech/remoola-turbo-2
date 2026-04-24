import { ForbiddenException, Injectable, Logger } from '@nestjs/common';

import {
  applyAdminV2PermissionOverrides,
  deriveAdminV2Workspaces,
  getAdminV2AccessProfile,
  hasBridgeCapabilityCoverage,
  hasValidAdminV2CapabilitySet,
  isKnownAdminV2Role,
  normalizeAdminV2Capabilities,
  partitionAdminV2PermissionOverrides,
  type AdminV2AccessProfile,
  type AdminV2Capability,
} from './admin-v2-access';
import { AdminV2AccessRepository } from './admin-v2-access.repository';

type AdminV2Identity = {
  id?: string;
  email?: string;
  type: string;
};

@Injectable()
export class AdminV2AccessService {
  private readonly logger = new Logger(AdminV2AccessService.name);

  constructor(private readonly repository: AdminV2AccessRepository) {}

  async getAccessProfile(admin: AdminV2Identity): Promise<AdminV2AccessProfile> {
    const bridgeProfile = getAdminV2AccessProfile(admin);
    if (!bridgeProfile.role || !admin.id) {
      return bridgeProfile;
    }

    const schemaRecord = await this.repository.findAdminAccessRecord(admin.id);
    if (!schemaRecord?.roleKey) {
      return {
        ...bridgeProfile,
        source: `bridge-fallback`,
      };
    }

    if (!isKnownAdminV2Role(schemaRecord.roleKey)) {
      this.logger.warn(
        `Ignoring unknown schema-backed RBAC role for admin-v2 identity ${JSON.stringify({
          adminId: admin.id,
          schemaRole: schemaRecord.roleKey,
        })}`,
      );
      return {
        ...bridgeProfile,
        source: `bridge-fallback`,
      };
    }

    const { allowed: allowedOverrides, ignored: ignoredOverrides } = partitionAdminV2PermissionOverrides(
      schemaRecord.permissionOverrides,
    );

    if (ignoredOverrides.length > 0) {
      this.logger.warn(
        `Ignoring out-of-scope admin-v2 permission overrides for prerequisite slice ${JSON.stringify({
          adminId: admin.id,
          ignoredCapabilities: ignoredOverrides.map((override) => override.capability),
        })}`,
      );
    }

    if (!hasValidAdminV2CapabilitySet(schemaRecord.roleCapabilities)) {
      const mismatchDetails = JSON.stringify({
        adminId: admin.id ?? `unknown`,
        schemaCapabilities: schemaRecord.roleCapabilities,
      });
      this.logger.warn(
        `Schema-backed RBAC capability set is invalid for admin-v2 role ${schemaRecord.roleKey}; ` +
          `falling back to bridge posture ${mismatchDetails}`,
      );
      return {
        ...bridgeProfile,
        source: `bridge-fallback`,
      };
    }

    if (
      bridgeProfile.role &&
      schemaRecord.roleKey === bridgeProfile.role &&
      !hasBridgeCapabilityCoverage(schemaRecord.roleCapabilities, bridgeProfile.capabilities)
    ) {
      const mismatchDetails = JSON.stringify({
        adminId: admin.id ?? `unknown`,
        schemaCapabilities: schemaRecord.roleCapabilities,
        bridgeCapabilities: bridgeProfile.capabilities,
      });
      this.logger.warn(
        `Schema-backed RBAC bridge coverage mismatch for admin-v2 role ${bridgeProfile.role}; ` +
          `falling back to bridge posture ${mismatchDetails}`,
      );
      return {
        ...bridgeProfile,
        source: `bridge-fallback`,
      };
    }

    const normalizedSchemaCapabilities =
      allowedOverrides.length > 0
        ? applyAdminV2PermissionOverrides(schemaRecord.roleCapabilities, allowedOverrides)
        : normalizeAdminV2Capabilities(schemaRecord.roleCapabilities);
    if (normalizedSchemaCapabilities.length === 0 || !normalizedSchemaCapabilities.includes(`me.read`)) {
      const mismatchDetails = JSON.stringify({
        adminId: admin.id ?? `unknown`,
        schemaRole: schemaRecord.roleKey,
        normalizedSchemaCapabilities,
      });
      this.logger.warn(
        `Schema-backed RBAC capability set cannot bootstrap admin-v2 role ${schemaRecord.roleKey}; ` +
          `falling back to bridge posture ${mismatchDetails}`,
      );
      return {
        ...bridgeProfile,
        source: `bridge-fallback`,
      };
    }
    return {
      role: schemaRecord.roleKey,
      capabilities: normalizedSchemaCapabilities,
      workspaces: deriveAdminV2Workspaces(normalizedSchemaCapabilities),
      source: `schema`,
    };
  }

  async assertCapability(admin: AdminV2Identity, capability: AdminV2Capability) {
    const profile = await this.getAccessProfile(admin);
    if (!profile.capabilities.includes(capability)) {
      throw new ForbiddenException(`Admin is not allowed to access this Admin v2 surface`);
    }
    return profile;
  }
}
