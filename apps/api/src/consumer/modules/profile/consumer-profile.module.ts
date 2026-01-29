import { Module } from '@nestjs/common';

import { ConsumerProfileController } from './consumer-profile.controller';
import { ConsumerProfileService } from './consumer-profile.service';

@Module({
  imports: [],
  controllers: [ConsumerProfileController],
  providers: [ConsumerProfileService],
  exports: [ConsumerProfileService],
})
export class ConsumerProfileModule {}
