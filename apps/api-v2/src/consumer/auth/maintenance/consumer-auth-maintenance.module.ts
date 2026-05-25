import { Module } from '@nestjs/common';

import { ConsumerActionLogPartitionMaintenanceScheduler } from './consumer-action-log-partition-maintenance.scheduler';
import { ConsumerActionLogRetentionScheduler } from './consumer-action-log-retention.scheduler';
import { ConsumerActionLogMaintenanceRepository } from '../../../shared/consumer-action-log-maintenance.repository';
import { ConsumerIdentityRepository } from '../identity/consumer-identity.repository';
import { OauthStateCleanupScheduler } from '../oauth/oauth-state-cleanup.scheduler';
import { OAuthStateStoreRepository } from '../oauth/oauth-state-store.repository';
import { PasswordResetRepository } from '../recovery/password-reset.repository';
import { ResetPasswordCleanupScheduler } from '../recovery/reset-password-cleanup.scheduler';

@Module({
  providers: [
    ConsumerIdentityRepository,
    PasswordResetRepository,
    OAuthStateStoreRepository,
    ConsumerActionLogMaintenanceRepository,
    OauthStateCleanupScheduler,
    ResetPasswordCleanupScheduler,
    ConsumerActionLogPartitionMaintenanceScheduler,
    ConsumerActionLogRetentionScheduler,
  ],
})
export class ConsumerAuthMaintenanceModule {}
