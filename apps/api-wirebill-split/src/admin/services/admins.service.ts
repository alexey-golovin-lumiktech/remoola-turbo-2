import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../shared/prisma.service';

@Injectable()
export class AdminsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllAdmins() {
    return this.prisma.admin.findMany({
      where: { type: { in: [`ADMIN`, `SUPER`] } },
      orderBy: { createdAt: `desc` },
    });
  }
}
