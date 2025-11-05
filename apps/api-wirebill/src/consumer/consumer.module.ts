import { Module } from '@nestjs/common';

import { ConsumerAuthModule } from './consumer-auth/consumer-auth.module';

@Module({ imports: [ConsumerAuthModule] })
export class ConsumerModule {}
