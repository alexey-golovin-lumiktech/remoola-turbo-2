import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { AdminAuthModule } from '../../admin/auth/admin-auth.module';
import { MailingModule } from '../../shared/mailing.module';
import { AdminV2SharedModule } from '../admin-v2-shared.module';
import { AdminV2AdminsController } from './admin-v2-admins.controller';
import { AdminV2AdminsService } from './admin-v2-admins.service';

@Module({
  imports: [AdminAuthModule, AdminV2SharedModule, JwtModule, MailingModule],
  controllers: [AdminV2AdminsController],
  providers: [AdminV2AdminsService],
  exports: [AdminV2AdminsService],
})
export class AdminV2AdminsModule {}
