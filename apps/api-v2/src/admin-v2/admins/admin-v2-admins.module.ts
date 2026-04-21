import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { AdminAuthModule } from '../../admin/auth/admin-auth.module';
import { envs } from '../../envs';
import { MailingModule } from '../../shared/mailing.module';
import { AdminV2SharedModule } from '../admin-v2-shared.module';
import { AdminV2AdminSessionsService } from './admin-v2-admin-sessions.service';
import { AdminV2AdminsController } from './admin-v2-admins.controller';
import { AdminV2AdminsService } from './admin-v2-admins.service';

@Module({
  imports: [
    AdminAuthModule,
    AdminV2SharedModule,
    JwtModule.register({
      secret: envs.JWT_ACCESS_SECRET!,
      signOptions: { expiresIn: envs.JWT_ACCESS_TTL_SECONDS },
    }),
    MailingModule,
  ],
  controllers: [AdminV2AdminsController],
  providers: [AdminV2AdminsService, AdminV2AdminSessionsService],
  exports: [AdminV2AdminsService],
})
export class AdminV2AdminsModule {}
