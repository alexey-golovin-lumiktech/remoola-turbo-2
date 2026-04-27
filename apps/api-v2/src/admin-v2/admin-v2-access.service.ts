import { ForbiddenException, Injectable, Logger } from '@nestjs/common';

import {
  applyAdminV2PermissionOverrides,
  type AdminV2BootstrapReason,
  deriveAdminV2Workspaces,
  getAdminV2AccessProfile,
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

  private buildBootstrapProfile(
    admin: AdminV2Identity,
    reason: AdminV2BootstrapReason,
    details?: Record<string, unknown>,
  ): AdminV2AccessProfile {
    const bridgeProfile = getAdminV2AccessProfile(admin);
    this.logger.warn(
      `Admin-v2 bridge bootstrap activated ${JSON.stringify({
        adminId: admin.id ?? `unknown`,
        adminEmail: admin.email ?? `unknown`,
        adminType: admin.type,
        source: `bridge-bootstrap`,
        reason,
        ...(details ?? {}),
      })}`,
    );

    if (bridgeProfile.role === `SUPER_ADMIN`) {
      return {
        ...bridgeProfile,
        source: `bridge-bootstrap`,
        bootstrapReason: reason,
      };
    }

    return {
      role: null,
      capabilities: [`me.read`],
      workspaces: [],
      source: `bridge-bootstrap`,
      bootstrapReason: reason,
    };
  }

  async getAccessProfile(admin: AdminV2Identity): Promise<AdminV2AccessProfile> {
    const bridgeProfile = getAdminV2AccessProfile(admin);
    if (!bridgeProfile.role || !admin.id) {
      return bridgeProfile;
    }

    const schemaRecord = await this.repository.findAdminAccessRecord(admin.id);
    if (!schemaRecord?.roleKey) {
      return this.buildBootstrapProfile(admin, `schema_role_missing`);
    }

    if (!isKnownAdminV2Role(schemaRecord.roleKey)) {
      return this.buildBootstrapProfile(admin, `schema_role_unknown`, {
        schemaRole: schemaRecord.roleKey,
      });
    }

    const { allowed: allowedOverrides, ignored: ignoredOverrides } = partitionAdminV2PermissionOverrides(
      schemaRecord.permissionOverrides,
    );

    if (ignoredOverrides.length > 0) {
      this.logger.warn(
        `Ignoring out-of-scope admin-v2 permission overrides ${JSON.stringify({
          adminId: admin.id,
          ignoredCapabilities: ignoredOverrides.map((override) => override.capability),
        })}`,
      );
    }

    if (!hasValidAdminV2CapabilitySet(schemaRecord.roleCapabilities)) {
      return this.buildBootstrapProfile(admin, `schema_capabilities_invalid`, {
        schemaRole: schemaRecord.roleKey,
      });
    }

    const normalizedSchemaCapabilities =
      allowedOverrides.length > 0
        ? applyAdminV2PermissionOverrides(schemaRecord.roleCapabilities, allowedOverrides)
        : normalizeAdminV2Capabilities(schemaRecord.roleCapabilities);
    if (normalizedSchemaCapabilities.length === 0 || !normalizedSchemaCapabilities.includes(`me.read`)) {
      return this.buildBootstrapProfile(admin, `schema_missing_me_read`, {
        schemaRole: schemaRecord.roleKey,
      });
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
