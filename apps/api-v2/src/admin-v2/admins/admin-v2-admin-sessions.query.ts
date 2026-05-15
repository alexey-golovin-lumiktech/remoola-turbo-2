import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../shared/prisma.service';

@Injectable()
export class AdminV2AdminSessionsQuery {
  constructor(private readonly prisma: PrismaService) {}

  findActiveAdminId(adminId: string) {
    return this.prisma.adminModel.findFirst({
      where: { id: adminId, deletedAt: null },
      select: { id: true },
    });
  }

  findOwnedSessionId(params: { adminId: string; sessionId: string }) {
    const { adminId, sessionId } = params;

    return this.prisma.adminAuthSessionModel.findFirst({
      where: { id: sessionId, adminId },
      select: { id: true },
    });
  }
}
