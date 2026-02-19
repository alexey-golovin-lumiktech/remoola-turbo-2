import { Injectable } from '@nestjs/common';

import { $Enums, type AdminModel, Prisma } from '@remoola/database-2';

import { PrismaService } from '../../../shared/prisma.service';
import { hashPassword } from '../../../shared-common';

const SEARCH_MAX_LEN = 200;
const ADMIN_TYPES = Object.values($Enums.AdminType) as string[];

@Injectable()
export class AdminAdminsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllAdmins(
    admin: AdminModel,
    options?: { includeDeleted?: boolean; q?: string; type?: string; page?: number; pageSize?: number },
  ) {
    const search =
      typeof options?.q === `string` && options.q.trim().length > 0
        ? options.q.trim().slice(0, SEARCH_MAX_LEN)
        : undefined;
    const typeFilter =
      options?.type && ADMIN_TYPES.includes(options.type) ? (options.type as $Enums.AdminType) : undefined;

    const allowedTypes =
      admin.type === `SUPER` //
        ? ([`ADMIN`, `SUPER`] as const)
        : ([`ADMIN`] as const);
    const typeConstraint =
      typeFilter && (allowedTypes as readonly string[]).includes(typeFilter)
        ? { type: typeFilter }
        : { type: { in: [...allowedTypes] } };

    const pageSize = Math.min(Math.max(options?.pageSize ?? 10, 1), 500);
    const page = Math.max(options?.page ?? 1, 1);
    const skip = (page - 1) * pageSize;

    const where: Prisma.AdminModelWhereInput = {
      ...typeConstraint,
      ...(admin.type === `ADMIN` && { id: { not: admin.id } }),
      ...(options?.includeDeleted !== true && { deletedAt: null }),
      ...(search && { email: { contains: search, mode: `insensitive` } }),
    };

    const [items, total] = await Promise.all([
      this.prisma.adminModel.findMany({
        where,
        orderBy: { createdAt: `desc` },
        skip,
        take: pageSize,
      }),
      this.prisma.adminModel.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async patchAdminPassword(adminId: string, password: string) {
    const { hash, salt } = await hashPassword(password);

    return this.prisma.adminModel.update({
      where: { id: adminId },
      data: { password: hash, salt },
    });
  }

  async updateAdminStatus(adminId: string, action: `delete` | `restore`) {
    const data = action === `delete` ? { deletedAt: new Date() } : { deletedAt: null };

    return this.prisma.adminModel.update({
      where: { id: adminId },
      data,
    });
  }

  async getById(adminId: string) {
    return this.prisma.adminModel.findUnique({
      where: { id: adminId },
      select: { id: true, email: true, type: true },
    });
  }
}
