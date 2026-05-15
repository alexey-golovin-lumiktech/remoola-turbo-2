import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { PasswordResetRepository } from './password-reset.repository';

@Injectable()
export class ResetPasswordCleanupScheduler {
  private readonly logger = new Logger(ResetPasswordCleanupScheduler.name);

  constructor(private readonly passwordResetRepository: PasswordResetRepository) {}

  @Cron(`0 */6 * * *`)
  async deleteExpiredResetPasswordRows() {
    try {
      const deletedCount = await this.passwordResetRepository.deleteExpiredTokens();
      if (deletedCount > 0) {
        this.logger.log(`Reset password cleanup: deleted ${deletedCount} expired row(s)`);
      }
    } catch (err) {
      this.logger.warn(
        `Reset password cleanup failed (e.g. DB unavailable): ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
