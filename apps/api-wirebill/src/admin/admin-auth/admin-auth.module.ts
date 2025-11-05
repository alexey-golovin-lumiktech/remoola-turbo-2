import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { AdminAuthController } from './admin-auth.controller';
import { adminAuthProviders } from './admin-providers';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../../envs';

@Module({
  imports: [
    JwtModule.register({
      secret: JWT_SECRET,
      signOptions: { expiresIn: JWT_EXPIRES_IN },
    }),
  ],
  controllers: [AdminAuthController],
  providers: adminAuthProviders,
  exports: adminAuthProviders,
})
export class AdminAuthModule {}
