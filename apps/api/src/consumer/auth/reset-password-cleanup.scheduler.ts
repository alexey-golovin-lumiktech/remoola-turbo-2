import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { PrismaService } from '../../shared/prisma.service';

@Injectable()
export class ResetPasswordCleanupScheduler {
  private readonly logger = new Logger(ResetPasswordCleanupScheduler.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(`0 */6 * * *`)
  async deleteExpiredResetPasswordRows() {
    try {
      const result = await this.prisma.resetPasswordModel.deleteMany({
        where: { expiredAt: { lt: new Date() } },
      });
      if (result.count > 0) {
        this.logger.log(`Reset password cleanup: deleted ${result.count} expired row(s)`);
      }
    } catch (err) {
      this.logger.warn(
        `Reset password cleanup failed (e.g. DB unavailable): ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
