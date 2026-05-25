import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { OAuthStateStoreRepository } from './oauth-state-store.repository';
import { SCHEDULER_CRON } from '../../../shared/scheduler-policy';

@Injectable()
export class OauthStateCleanupScheduler {
  private readonly logger = new Logger(OauthStateCleanupScheduler.name);

  constructor(private readonly oauthStateStoreRepository: OAuthStateStoreRepository) {}

  @Cron(SCHEDULER_CRON.oauthStateCleanup)
  async deleteExpiredOauthState() {
    try {
      const deletedCount = await this.oauthStateStoreRepository.deleteExpiredStates();
      if (deletedCount > 0) {
        this.logger.log(`OAuth state cleanup: deleted ${deletedCount} expired row(s)`);
      }
    } catch (err) {
      this.logger.warn(
        `OAuth state cleanup failed (e.g. DB unavailable): ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
