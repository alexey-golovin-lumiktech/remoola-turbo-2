import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { AdminAuthControllerSupportService } from './admin-auth-controller-support.service';
import { AdminAuthService } from './admin-auth.service';
import { envs } from '../envs';
import { AuthAuditModule } from '../shared/auth-audit.module';
import { DatabaseModule } from '../shared/database.module';
import { MailingModule } from '../shared/mailing.module';

@Module({
  imports: [
    DatabaseModule,
    AuthAuditModule,
    MailingModule,
    JwtModule.register({
      secret: envs.JWT_ACCESS_SECRET!,
      signOptions: { expiresIn: envs.JWT_ACCESS_TTL_SECONDS },
    }),
  ],
  providers: [AdminAuthControllerSupportService, AdminAuthService],
  exports: [AdminAuthControllerSupportService, AdminAuthService],
})
export class AdminAuthModule {}
