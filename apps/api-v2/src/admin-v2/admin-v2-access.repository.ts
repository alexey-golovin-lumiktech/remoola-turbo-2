import { Injectable } from '@nestjs/common';

import { PrismaService } from '../shared/prisma.service';

export type AdminV2SchemaAccessRecord = {
  roleKey: string | null;
  roleCapabilities: string[];
  permissionOverrides: Array<{
    capability: string;
    granted: boolean;
  }>;
};

@Injectable()
export class AdminV2AccessRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAdminAccessRecord(adminId: string): Promise<AdminV2SchemaAccessRecord | null> {
    const admin = await this.prisma.adminModel.findFirst({
      where: { id: adminId },
      select: {
        role: {
          select: {
            key: true,
            rolePermissions: {
              select: {
                permission: {
                  select: {
                    capability: true,
                  },
                },
              },
            },
          },
        },
        permissionOverrides: {
          select: {
            granted: true,
            permission: {
              select: {
                capability: true,
              },
            },
          },
        },
      },
    });

    if (!admin) {
      return null;
    }

    return {
      roleKey: admin.role?.key ?? null,
      roleCapabilities: admin.role?.rolePermissions.map((rolePermission) => rolePermission.permission.capability) ?? [],
      permissionOverrides: admin.permissionOverrides.map((override) => ({
        capability: override.permission.capability,
        granted: override.granted,
      })),
    };
  }
}
