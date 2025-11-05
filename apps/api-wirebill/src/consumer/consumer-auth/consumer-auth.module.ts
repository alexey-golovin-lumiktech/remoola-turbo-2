import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { ConsumerAuthController } from './consumer-auth.controller';
import { consumerAuthProviders } from './providers';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../../envs';

@Module({
  imports: [
    JwtModule.register({
      secret: JWT_SECRET,
      signOptions: { expiresIn: JWT_EXPIRES_IN },
    }),
  ],
  controllers: [ConsumerAuthController],
  providers: consumerAuthProviders,
  exports: consumerAuthProviders,
})
export class ConsumerAuthModule {}
