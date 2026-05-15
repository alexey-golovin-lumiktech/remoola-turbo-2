import { Injectable } from '@nestjs/common';

import { PrismaService } from '../shared/prisma.service';

@Injectable()
export class AdminIdentityRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveByEmail(email: string) {
    return this.prisma.adminModel.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
    });
  }

  findAnyById(id: string) {
    return this.prisma.adminModel.findFirst({
      where: { id },
    });
  }

  findActiveById(id: string) {
    return this.prisma.adminModel.findFirst({
      where: { id, deletedAt: null },
    });
  }

  findStepUpCredentialsById(id: string) {
    return this.prisma.adminModel.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, password: true, salt: true },
    });
  }
}
