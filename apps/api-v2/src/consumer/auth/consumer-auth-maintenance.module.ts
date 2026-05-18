import { Module } from '@nestjs/common';

import { ConsumerActionLogPartitionMaintenanceScheduler } from './consumer-action-log-partition-maintenance.scheduler';
import { ConsumerActionLogRetentionScheduler } from './consumer-action-log-retention.scheduler';
import { ConsumerIdentityRepository } from './consumer-identity.repository';
import { OauthStateCleanupScheduler } from './oauth-state-cleanup.scheduler';
import { OAuthStateStoreRepository } from './oauth-state-store.repository';
import { PasswordResetRepository } from './password-reset.repository';
import { ResetPasswordCleanupScheduler } from './reset-password-cleanup.scheduler';
import { ConsumerActionLogMaintenanceRepository } from '../../shared/consumer-action-log-maintenance.repository';

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
