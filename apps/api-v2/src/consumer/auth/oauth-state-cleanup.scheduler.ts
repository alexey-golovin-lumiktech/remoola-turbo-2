import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { PrismaService } from '../../shared/prisma.service';

@Injectable()
export class OauthStateCleanupScheduler {
  private readonly logger = new Logger(OauthStateCleanupScheduler.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(`*/10 * * * *`)
  async deleteExpiredOauthState() {
    try {
      const result = await this.prisma.oauthStateModel.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
      if (result.count > 0) {
        this.logger.log(`OAuth state cleanup: deleted ${result.count} expired row(s)`);
      }
    } catch (err) {
      this.logger.warn(
        `OAuth state cleanup failed (e.g. DB unavailable): ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
