import { Module } from '@nestjs/common';

import { ConsumerSettingsController } from './consumer-settings.controller';
import { ConsumerSettingsRepository } from './consumer-settings.repository';
import { ConsumerSettingsService } from './consumer-settings.service';

@Module({
  controllers: [ConsumerSettingsController],
  providers: [ConsumerSettingsRepository, ConsumerSettingsService],
})
export class ConsumerSettingsModule {}
