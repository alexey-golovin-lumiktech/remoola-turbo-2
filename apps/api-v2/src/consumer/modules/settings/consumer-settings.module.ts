import { Module } from '@nestjs/common';

import { ConsumerSettingsController } from './consumer-settings.controller';
import { ConsumerSettingsService } from './consumer-settings.service';

@Module({
  controllers: [ConsumerSettingsController],
  providers: [ConsumerSettingsService],
})
export class ConsumerSettingsModule {}
