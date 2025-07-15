import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'

import { AccessRefreshTokenRepository } from '@-/repositories'

import { envs } from '../../envs'
import { AdminModule } from '../entities/admin/admin.module'

import { AdminAuthController } from './admin-auth.controller'
import { AdminAuthService } from './admin-auth.service'

@Module({
  imports: [AdminModule, JwtModule.registerAsync({ useFactory: () => ({ secret: envs.JWT_SECRET }) })],
  controllers: [AdminAuthController],
  providers: [AccessRefreshTokenRepository, AdminAuthService],
  exports: [AdminAuthService],
})
export class AdminAuthModule {}
