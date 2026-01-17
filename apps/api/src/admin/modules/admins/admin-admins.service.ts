import { Injectable } from '@nestjs/common';

import { type AdminModel } from '@remoola/database-2';

import { PrismaService } from '../../../shared/prisma.service';
import { hashPassword } from '../../../shared-common';

@Injectable()
export class AdminAdminsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllAdmins(admin: AdminModel) {
    return this.prisma.adminModel.findMany({
      where: {
        type: {
          in:
            admin.type === `SUPER` //
              ? [`ADMIN`, `SUPER`]
              : [`ADMIN`],
        },
        ...(admin.type === `ADMIN` && { id: { not: admin.id } }),
      },
      orderBy: { createdAt: `desc` },
    });
  }

  async patchAdminPassword(adminId: string, password: string) {
    const { hash, salt } = await hashPassword(password);

    return this.prisma.adminModel.update({
      where: { id: adminId },
      data: { password: hash, salt },
    });
  }

  async getById(adminId: string) {
    return this.prisma.adminModel.findUnique({
      where: { id: adminId },
      select: { id: true, email: true, type: true },
    });
  }
}
