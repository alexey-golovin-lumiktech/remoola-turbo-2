import { Injectable } from '@nestjs/common';

import { PrismaService } from '../shared/prisma.service';

@Injectable()
export class AuthIdentityRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveAdminById(identityId: string) {
    return this.prisma.adminModel.findFirst({
      where: { id: identityId, deletedAt: null },
    });
  }

  findConsumerById(identityId: string) {
    return this.prisma.consumerModel.findFirst({
      where: { id: identityId },
    });
  }
}
