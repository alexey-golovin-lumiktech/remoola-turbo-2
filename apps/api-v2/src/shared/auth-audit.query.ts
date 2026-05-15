import { Injectable } from '@nestjs/common';

import { type AuthIdentityType } from './auth-audit.service';
import { PrismaService } from './prisma.service';

@Injectable()
export class AuthAuditQuery {
  constructor(private readonly prisma: PrismaService) {}

  findLockout(identityType: AuthIdentityType, email: string) {
    return this.prisma.authLoginLockoutModel.findUnique({
      where: {
        identityType_email: { identityType, email },
      },
    });
  }

  countRecentAuditRows(identityType: AuthIdentityType, email: string, windowStart: Date) {
    return this.prisma.authAuditLogModel.count({
      where: {
        identityType,
        email,
        createdAt: { gte: windowStart },
      },
    });
  }
}
