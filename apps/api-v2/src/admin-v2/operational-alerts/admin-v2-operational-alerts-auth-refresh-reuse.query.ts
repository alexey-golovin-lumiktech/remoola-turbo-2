import { Injectable } from '@nestjs/common';

import { AUTH_AUDIT_EVENTS } from '../../shared/auth-audit.service';
import { PrismaService } from '../../shared/prisma.service';

@Injectable()
export class AdminV2OperationalAlertsAuthRefreshReuseQuery {
  constructor(private readonly prisma: PrismaService) {}

  countRefreshReuseSince(since: Date): Promise<number> {
    return this.prisma.authAuditLogModel.count({
      where: {
        identityType: `admin`,
        event: AUTH_AUDIT_EVENTS.refresh_reuse,
        createdAt: { gte: since },
      },
    });
  }
}
