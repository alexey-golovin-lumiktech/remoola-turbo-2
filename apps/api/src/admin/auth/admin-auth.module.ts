import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { AdminAuthService } from './admin-auth.service';
import { JWT_ACCESS_SECRET, JWT_ACCESS_TTL_SECONDS } from '../../envs';
import { AuthAuditModule } from '../../shared/auth-audit.module';
import { DatabaseModule } from '../../shared/database.module';

@Module({
  imports: [
    DatabaseModule,
    AuthAuditModule,
    JwtModule.register({
      secret: JWT_ACCESS_SECRET!,
      signOptions: { expiresIn: JWT_ACCESS_TTL_SECONDS },
    }),
  ],
  providers: [AdminAuthService],
  exports: [AdminAuthService],
})
export class AdminAuthModule {}
